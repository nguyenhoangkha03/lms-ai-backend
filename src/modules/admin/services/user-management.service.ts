import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { UserService } from '@/modules/user/services/user.service';
import { RoleService } from '@/modules/user/services/role.service';
import { PasswordService } from '@/modules/auth/services/password.service';
import { EmailService } from '@/modules/auth/services/email.service';
import { WinstonService } from '@/logger/winston.service';
import { AuditLogService } from '@/modules/system/services/audit-log.service';
import { UserType, UserStatus } from '@/common/enums/user.enums';
import { AuditAction } from '@/common/enums/system.enums';
import { CreateUserDto } from '@/modules/user/dto/create-user.dto';
import { UpdateUserDto as BaseUpdateUserDto } from '@/modules/user/dto/update-user.dto';
import { UserQueryDto } from '@/modules/user/dto/user-query.dto';

export interface CreateAdminUserDto {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  roles?: string[];
  permissions?: string[];
  temporaryPassword?: string;
  sendWelcomeEmail?: boolean;
}

export interface UpdateUserDto extends BaseUpdateUserDto {
  status?: UserStatus;
  roles?: string[];
  permissions?: string[];
}

export interface UserListResponse {
  users: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserStatsResponse {
  total: {
    all: number;
    students: number;
    teachers: number;
    admins: number;
  };
  active: {
    all: number;
    students: number;
    teachers: number;
    admins: number;
  };
  newThisMonth: number;
  growth: {
    monthly: number;
    weekly: number;
  };
}

@Injectable()
export class UserManagementService {
  constructor(
    private readonly userService: UserService,
    private readonly roleService: RoleService,
    private readonly passwordService: PasswordService,
    private readonly emailService: EmailService,
    private readonly logger: WinstonService,
    private readonly auditLogService: AuditLogService,
  ) {
    this.logger.setContext(UserManagementService.name);
  }

  async createAdminUser(
    createAdminDto: CreateAdminUserDto,
    createdByAdminId: string,
  ): Promise<any> {
    this.logger.log(`Creating admin user: ${createAdminDto.email}`);

    const existingUser = await this.userService.findByEmail(createAdminDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    try {
      const tempPassword = createAdminDto.temporaryPassword || this.generateTemporaryPassword();
      const hashedPassword = await this.passwordService.hashPassword(tempPassword);

      const userData: CreateUserDto = {
        username: createAdminDto.email,
        firstName: createAdminDto.firstName,
        lastName: createAdminDto.lastName,
        email: createAdminDto.email,
        phone: createAdminDto.phone,
        passwordHash: hashedPassword,
        userType: UserType.ADMIN,
      };

      const newUser = await this.userService.create(userData);

      await this.userService.update(newUser.id, {
        status: UserStatus.ACTIVE,
      });

      // Assign admin roles if provided
      if (createAdminDto.roles && createAdminDto.roles.length > 0) {
        this.logger.log(`Assigning roles ${createAdminDto.roles.join(', ')} to user ${newUser.id}`);
        await this.userService.assignRoles(newUser.id, createAdminDto.roles);
      } else {
        // Default admin role assignment
        try {
          this.logger.log(`Assigning default admin role to user ${newUser.id}`);
          const adminRole = await this.roleService.findByName('admin');
          await this.userService.assignRoles(newUser.id, [adminRole.id]);
        } catch (error) {
          this.logger.warn(`Could not assign default admin role: ${error.message}`);
          // Continue without throwing error - user is created but without roles
        }
      }

      if (createAdminDto.sendWelcomeEmail !== false) {
        await this.sendAdminWelcomeEmail(newUser, tempPassword);
      }

      // Log the action
      await this.auditLogService.createAuditLog({
        userId: createdByAdminId,
        action: AuditAction.USER_CREATED,
        entityType: 'user',
        entityId: newUser.id,
        metadata: {
          newAdminEmail: newUser.email,
          newAdminName: `${newUser.firstName} ${newUser.lastName}`,
          userType: 'admin',
          roles: createAdminDto.roles,
          permissions: createAdminDto.permissions,
        },
      });

      this.logger.log(`Admin user created successfully: ${newUser.email}`);

      // Return user data without sensitive information
      const userResponse = {
        id: newUser.id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        phone: newUser.phone,
        userType: newUser.userType,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        createdAt: newUser.createdAt,
      };

      return {
        user: userResponse,
        temporaryPassword: createAdminDto.sendWelcomeEmail !== false ? undefined : tempPassword,
      };
    } catch (error) {
      this.logger.error(`Failed to create admin user: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getUserList(query: UserQueryDto): Promise<UserListResponse> {
    this.logger.log(`Fetching user list, { query }`);

    const {
      userType,
      status,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    try {
      const result = await this.userService.getUsersWithFilters({
        userType,
        status,
        search,
        page,
        limit,
        sortBy,
        sortOrder,
      });

      this.logger.log(`Retrieved ${result.data.length} users`);

      return {
        users: result.data.map(user => ({
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          userType: user.userType,
          status: user.status,
          avatarUrl: user.avatarUrl,
          coverUrl: user.coverUrl,
          emailVerified: user.emailVerified,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          profile: user.studentProfile || user.teacherProfile || null,
        })),
        total: result.meta.total,
        page,
        limit,
        totalPages: result.meta.totalPages,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch user list: ${error.message}`);
      throw error;
    }
  }

  async getUserById(userId: string): Promise<any> {
    this.logger.log(`Fetching user details: ${userId}`);

    const user = await this.userService.findById(userId, {
      includeProfiles: true,
      includeRoles: true,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      userType: user.userType,
      status: user.status,
      avatarUrl: user.avatarUrl,
      coverUrl: user.coverUrl,
      emailVerified: user.emailVerified,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      profile: user.studentProfile || user.teacherProfile || null,
    };
  }

  async updateUser(
    userId: string,
    updateData: UpdateUserDto,
    updatedByAdminId: string,
  ): Promise<any> {
    this.logger.log(`Updating user: ${userId}`);

    const existingUser = await this.userService.findById(userId);
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Prevent admin from deactivating themselves
    if (userId === updatedByAdminId && updateData.status === UserStatus.INACTIVE) {
      throw new ForbiddenException('You cannot deactivate your own account');
    }

    try {
      const updatedUser = await this.userService.update(userId, updateData);

      // Log the action
      await this.auditLogService.createAuditLog({
        userId: updatedByAdminId,
        action: AuditAction.USER_UPDATED,
        entityType: 'user',
        entityId: userId,
        metadata: {
          targetUserEmail: existingUser.email,
          changes: updateData,
          previousStatus: existingUser.status,
        },
      });

      this.logger.log(`User updated successfully: ${userId}`);

      return {
        id: updatedUser.id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        userType: updatedUser.userType,
        status: updatedUser.status,
        avatarUrl: updatedUser.avatarUrl,
        coverUrl: updatedUser.coverUrl,
        emailVerified: updatedUser.emailVerified,
        updatedAt: updatedUser.updatedAt,
      };
    } catch (error) {
      this.logger.error(`Failed to update user: ${error.message}`, error.stack);
      throw error;
    }
  }

  async deleteUser(userId: string, deletedByAdminId: string): Promise<void> {
    this.logger.log(`Deleting user: ${userId}`);

    const existingUser = await this.userService.findById(userId);
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Prevent admin from deleting themselves
    if (userId === deletedByAdminId) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    try {
      await this.userService.delete(userId);

      // Log the action
      await this.auditLogService.createAuditLog({
        userId: deletedByAdminId,
        action: AuditAction.USER_DELETED,
        entityType: 'user',
        entityId: userId,
        metadata: {
          deletedUserEmail: existingUser.email,
          deletedUserType: existingUser.userType,
        },
      });

      this.logger.log(`User deleted successfully: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to delete user: ${error.message}`, error.stack);
      throw error;
    }
  }

  async resetUserPassword(
    userId: string,
    resetByAdminId: string,
    sendEmail: boolean = true,
  ): Promise<{ temporaryPassword?: string }> {
    this.logger.log(`Resetting password for user: ${userId}`);

    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    try {
      // Generate new temporary password
      const tempPassword = this.generateTemporaryPassword();
      const hashedPassword = await this.passwordService.hashPassword(tempPassword);

      // Update user's password with hashed password
      await this.userService.update(userId, {
        password: hashedPassword,
      });

      // Send email with new password
      if (sendEmail) {
        await this.emailService.sendPasswordResetEmail(user.email, tempPassword);
      }

      // Log the action
      await this.auditLogService.createAuditLog({
        userId: resetByAdminId,
        action: AuditAction.PASSWORD_RESET,
        entityType: 'user',
        entityId: userId,
        metadata: {
          targetUserEmail: user.email,
          emailSent: sendEmail,
          resetByAdmin: true,
        },
      });

      this.logger.log(`Password reset successfully for user: ${userId}`);

      return {
        temporaryPassword: sendEmail ? undefined : tempPassword,
      };
    } catch (error) {
      this.logger.error(`Failed to reset user password: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getUserStats(): Promise<UserStatsResponse> {
    this.logger.log('Calculating user statistics');

    try {
      // Get basic stats from the existing getUserStats method
      const stats = await this.userService.getUserStats();

      // Mock implementation - replace with actual queries
      const mockStats: UserStatsResponse = {
        total: {
          all: stats.totalUsers || 0,
          students: Math.floor((stats.totalUsers || 0) * 0.8),
          teachers: Math.floor((stats.totalUsers || 0) * 0.15),
          admins: Math.floor((stats.totalUsers || 0) * 0.05),
        },
        active: {
          all: stats.activeUsers || 0,
          students: Math.floor((stats.activeUsers || 0) * 0.8),
          teachers: Math.floor((stats.activeUsers || 0) * 0.15),
          admins: Math.floor((stats.activeUsers || 0) * 0.05),
        },
        newThisMonth: stats.newUsers || 0,
        growth: {
          monthly: stats.userGrowth?.monthly || 0,
          weekly: stats.userGrowth?.weekly || 0,
        },
      };

      this.logger.log('User statistics calculated successfully');
      return mockStats;
    } catch (error) {
      this.logger.error(`Failed to calculate user statistics: ${error.message}`);
      throw error;
    }
  }

  async impersonateUser(
    targetUserId: string,
    adminId: string,
  ): Promise<{ accessToken: string; user: any }> {
    this.logger.log(`Admin ${adminId} impersonating user: ${targetUserId}`);

    const targetUser = await this.userService.findById(targetUserId);
    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    // Prevent impersonating other admins
    if (targetUser.userType === UserType.ADMIN) {
      throw new ForbiddenException('Cannot impersonate admin users');
    }

    try {
      // Generate impersonation token (shorter lived)
      const impersonationToken = await this.generateImpersonationToken(targetUser, adminId);

      // Log the action
      await this.auditLogService.createAuditLog({
        userId: adminId,
        action: AuditAction.USER_LOGIN, // Use existing action or create USER_IMPERSONATION
        entityType: 'user',
        entityId: targetUserId,
        metadata: {
          targetUserEmail: targetUser.email,
          targetUserType: targetUser.userType,
          impersonation: true,
        },
      });

      this.logger.log(`User impersonation started: ${targetUserId} by admin: ${adminId}`);

      const userResponse = {
        id: targetUser.id,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
        email: targetUser.email,
        userType: targetUser.userType,
      };

      return {
        accessToken: impersonationToken,
        user: userResponse,
      };
    } catch (error) {
      this.logger.error(`Failed to impersonate user: ${error.message}`, error.stack);
      throw error;
    }
  }

  private generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  private async sendAdminWelcomeEmail(user: any, temporaryPassword: string): Promise<void> {
    try {
      // Mock email sending - replace with actual implementation
      this.logger.log(
        `Sending welcome email to admin: ${user.email} with temp password: ${temporaryPassword}`,
      );

      // You can implement this by extending the EmailService
      // await this.emailService.sendAdminWelcomeEmail(user.email, {
      //   firstName: user.firstName,
      //   lastName: user.lastName,
      //   temporaryPassword,
      //   loginUrl: `${process.env.FRONTEND_URL}/login`,
      // });

      this.logger.log(`Welcome email sent to new admin: ${user.email}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to admin: ${error.message}`);
      // Don't throw error as user creation was successful
    }
  }

  private async generateImpersonationToken(user: any, adminId: string): Promise<string> {
    // This would integrate with your JWT service
    // Implementation depends on your JWT/auth setup
    // Return a shorter-lived token with special claims

    // Placeholder implementation
    return 'impersonation_token_' + Date.now();
  }
}
