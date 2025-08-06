import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserProfile } from '../entities/user-profile.entity';
import { StudentProfile } from '../entities/student-profile.entity';
import { TeacherProfile } from '../entities/teacher-profile.entity';
import { UserStatus, UserType } from '@/common/enums/user.enums';
import { CacheService } from '@/cache/cache.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserQueryDto } from '../dto/user-query.dto';
import { PaginatedResult } from '../interfaces/paginated-result.interface';
import { WinstonService } from '@/logger/winston.service';
import { ConfigService } from '@nestjs/config';
import { Permission } from '../entities/permission.entity';
import { PasswordService } from '@/modules/auth/services/password.service';
import { Role } from '../entities/role.entity';
import {
  BulkAssignRolesDto,
  BulkUpdateStatusDto,
  ImportUsersDto,
} from '../dto/bulk-user-operations.dto';
import { parse } from 'csv-parse/sync';
import { UpdateUserProfileDto } from '../dto/update-user-profile.dto';
import { UpdateStudentProfileDto } from '../dto/update-student-profile.dto';
import { UpdateTeacherProfileDto } from '../dto/update-teacher-profile.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
    @InjectRepository(StudentProfile)
    private readonly studentProfileRepository: Repository<StudentProfile>,
    @InjectRepository(TeacherProfile)
    private readonly teacherProfileRepository: Repository<TeacherProfile>,
    private readonly cacheService: CacheService,
    private readonly logger: WinstonService,
    private readonly configService: ConfigService,
    private readonly passwordService: PasswordService,
    @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission) private readonly permissionRepository: Repository<Permission>,
  ) {
    this.logger.setContext(UserService.name);
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if user already exists
    const existingUser = await this.findByEmailOrUsername(
      createUserDto.email,
      createUserDto.username,
    );

    if (existingUser) {
      throw new ConflictException('User with this email or username already exists');
    }

    // Create user entity
    const user = this.userRepository.create({
      ...createUserDto,
      status: UserStatus.PENDING,
    });

    const savedUser = await this.userRepository.save(user);

    // Create appropriate profile based on user type
    await this.createUserProfile(savedUser);

    // Assign default role
    await this.assignDefaultRole(savedUser);

    this.logger.log(`User created: ${savedUser.email} (${savedUser.userType})`);

    return this.findById(savedUser.id, { includeProfiles: true });
  }

  async findAll(queryDto: UserQueryDto): Promise<PaginatedResult<User>> {
    const cacheKey = `users:${JSON.stringify(queryDto)}`;
    const cached = await this.cacheService.get<PaginatedResult<User>>(cacheKey);
    if (cached) {
      return cached;
    }

    const queryBuilder = this.createUserQueryBuilder(queryDto);

    // Apply pagination
    const skip = (queryDto.page! - 1) * queryDto.limit!;
    queryBuilder.skip(skip).take(queryDto.limit);

    // Apply sorting
    queryBuilder.orderBy(`user.${queryDto.sortBy}`, queryDto.sortOrder);

    // Execute query
    const [users, total] = await queryBuilder.getManyAndCount();

    const result: PaginatedResult<User> = {
      data: users,
      meta: {
        page: queryDto.page!,
        limit: queryDto.limit!,
        total,
        totalPages: Math.ceil(total / queryDto.limit!),
        hasNext: queryDto.page! < Math.ceil(total / queryDto.limit!),
        hasPrev: queryDto.page! > 1,
      },
    };

    await this.cacheService.set(cacheKey, result, this.configService.get<number>('CACHE_TTL'));
    return result;
  }

  async findById(
    id: string,
    options?: { includeProfiles?: boolean; includeRoles?: boolean },
  ): Promise<User> {
    const cacheKey = `user:${id}:${JSON.stringify(options || {})}`;
    const cached = await this.cacheService.get<User>(cacheKey);

    if (cached) {
      return cached;
    }

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .where('user.id = :id', { id });

    if (options?.includeProfiles) {
      queryBuilder
        .leftJoinAndSelect('user.userProfile', 'userProfile')
        .leftJoinAndSelect('user.studentProfile', 'studentProfile')
        .leftJoinAndSelect('user.teacherProfile', 'teacherProfile')
        .leftJoinAndSelect('user.socials', 'socials');
    }

    if (options?.includeRoles) {
      queryBuilder
        .leftJoinAndSelect('user.roles', 'roles')
        .leftJoinAndSelect('roles.permissions', 'rolePermissions')
        .leftJoinAndSelect('user.permissions', 'userPermissions');
    }

    const user = await queryBuilder.getOne();
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.cacheService.set(cacheKey, user, this.configService.get<number>('CACHE_TTL'));
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    const cacheKey = `user:email:${email}`;
    const cached = await this.cacheService.get<User>(cacheKey);

    if (cached) {
      return cached;
    }

    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['userProfile', 'studentProfile', 'teacherProfile', 'roles', 'permissions'],
    });

    if (user) {
      await this.cacheService.set(cacheKey, user, 300);
    }

    return user;
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();

    if (!user) {
      this.logger.warn(`Login attempt for non-existent email: ${email}`);
    }

    return user;
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { username },
      relations: ['userProfile', 'studentProfile', 'teacherProfile'],
    });
  }

  async getUserPermissions(userId: string): Promise<Permission[]> {
    const user = await this.findById(userId, { includeRoles: true });

    const permissions = new Set<Permission>();

    // Add direct permissions
    user.permissions?.forEach(permission => permissions.add(permission));

    // Add role permissions
    user.roles?.forEach(role => {
      role.permissions?.forEach(permission => permissions.add(permission));
    });

    return Array.from(permissions);
  }

  async hasPermission(userId: string, resource: string, action: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);

    return permissions.some(
      permission => permission.resource === resource && permission.action === action,
    );
  }

  async updateProfile(userId: string, updateDto: UpdateUserProfileDto): Promise<UserProfile> {
    const user = await this.findById(userId, { includeProfiles: true });

    let profile = user.userProfile;
    if (!profile) {
      profile = this.userProfileRepository.create({ user });
    }

    Object.assign(profile, updateDto);
    const updatedProfile = await this.userProfileRepository.save(profile);

    await this.clearUserCache(userId);
    return updatedProfile;
  }

  async deleteUser(userId: string): Promise<User> {
    const user = await this.findById(userId);
    await this.userRepository.remove(user);
    await this.clearUserCache(userId);
    return user;
  }

  async getUsersWithFilters(queryDto: UserQueryDto): Promise<PaginatedResult<User>> {
    const cacheKey = `users:${JSON.stringify(queryDto)}`;
    const cached = await this.cacheService.get<PaginatedResult<User>>(cacheKey);
    if (cached) {
      this.logger.log(`Cache hit for key: ${cacheKey}`);
      return cached;
    }
    this.logger.log(`Cache miss for key: ${cacheKey}`);

    const queryBuilder = this.createUserQueryBuilder(queryDto);

    const skip = (queryDto.page! - 1) * queryDto.limit!;
    queryBuilder.skip(skip).take(queryDto.limit!);

    if (queryDto.sortBy && queryDto.sortOrder) {
      queryBuilder.orderBy(`user.${queryDto.sortBy}`, queryDto.sortOrder);
    }

    const [users, total] = await queryBuilder.getManyAndCount();

    const totalPages = Math.ceil(total / queryDto.limit!);
    const result: PaginatedResult<User> = {
      data: users,
      meta: {
        page: queryDto.page!,
        limit: queryDto.limit!,
        total,
        totalPages,
        hasNext: queryDto.page! < totalPages,
        hasPrev: queryDto.page! > 1,
      },
    };

    await this.cacheService.set(cacheKey, result, this.configService.get<number>('CACHE_TTL', 60));
    return result;
  }

  async getUserStats(): Promise<any> {
    const cacheKey = 'user:stats';
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const [
      totalUsers,
      activeUsers,
      pendingUsers,
      students,
      teachers,
      admins,
      verifiedUsers,
      twoFactorUsers,
    ] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { status: UserStatus.ACTIVE } }),
      this.userRepository.count({ where: { status: UserStatus.PENDING } }),
      this.userRepository.count({ where: { userType: UserType.STUDENT } }),
      this.userRepository.count({ where: { userType: UserType.TEACHER } }),
      this.userRepository.count({ where: { userType: UserType.ADMIN } }),
      this.userRepository.count({ where: { emailVerified: true } }),
      this.userRepository.count({ where: { twoFactorEnabled: true } }),
    ]);

    const stats = {
      totalUsers,
      activeUsers,
      pendingUsers,
      usersByType: { students, teachers, admins },
      verifiedUsers,
      twoFactorUsers,
      verificationRate: totalUsers > 0 ? ((verifiedUsers / totalUsers) * 100).toFixed(2) : 0,
      twoFactorRate: totalUsers > 0 ? ((twoFactorUsers / totalUsers) * 100).toFixed(2) : 0,
    };

    await this.cacheService.set(cacheKey, stats, 600); // 10 minutes cache
    return stats;
  }

  async findByEmailOrUsername(email: string, username?: string): Promise<User | null> {
    const queryBuilder = this.userRepository.createQueryBuilder('user');

    if (username) {
      queryBuilder.where('user.email = :email OR user.username = :username', { email, username });
    } else {
      queryBuilder.where('user.email = :email', { email });
    }

    return queryBuilder.getOne();
  }
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    // Check email/username uniqueness if changed
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.findByEmail(updateUserDto.email);
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Email already exists');
      }
    }

    if (updateUserDto.username && updateUserDto.username !== user.username) {
      const existingUser = await this.findByUsername(updateUserDto.username);
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Username already exists');
      }
    }

    const updateData: any = { ...updateUserDto };

    Object.assign(user, updateData);
    const updatedUser = await this.userRepository.save(user);

    // Clear cache
    await this.clearUserCache(id);

    this.logger.log(`User updated: ${updatedUser.email}`);
    return updatedUser;
  }
  async updateLastLogin(id: string, ip?: string): Promise<void> {
    await this.userRepository.update(id, {
      lastLoginAt: new Date(),
      lastLoginIp: ip,
      failedLoginAttempts: 0, // Reset failed attempts on successful login
    });

    await this.invalidateUserCache(id);
  }

  async incrementFailedLoginAttempts(id: string): Promise<void> {
    const user = await this.findById(id);
    user.failedLoginAttempts += 1;

    // Lock account after 5 failed attempts
    if (user.failedLoginAttempts >= 5) {
      user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    }

    await this.userRepository.save(user);
    await this.invalidateUserCache(id);
  }

  async createOAuthUser(oauthUser: any): Promise<User> {
    return {
      ...oauthUser,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    };
  }

  async unlockAccount(id: string): Promise<void> {
    await this.userRepository.update(id, {
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    await this.invalidateUserCache(id);
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.userRepository.update(id, {
      passwordHash,
      passwordChangedAt: new Date(),
    });

    await this.invalidateUserCache(id);
  }

  // Refresh token management
  async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const user = await this.findById(userId);
    const refreshTokens = user.refreshTokens || [];

    refreshTokens.push(refreshToken);

    // Keep only last 5 refresh tokens
    if (refreshTokens.length > 5) {
      refreshTokens.splice(0, refreshTokens.length - 5);
    }

    await this.userRepository.update(userId, { refreshTokens });
    await this.invalidateUserCache(userId);
  }

  async verifyRefreshToken(userId: string, refreshToken: string): Promise<boolean> {
    const user = await this.findById(userId);
    return user.refreshTokens?.includes(refreshToken) || false;
  }

  async revokeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const user = await this.findById(userId);
    const refreshTokens = user.refreshTokens?.filter(token => token !== refreshToken) || [];

    await this.userRepository.update(userId, { refreshTokens });
    await this.invalidateUserCache(userId);
  }

  async revokeAllRefreshTokens(userId: string): Promise<void> {
    await this.userRepository.update(userId, { refreshTokens: [] });
    await this.invalidateUserCache(userId);
  }

  async rotateRefreshToken(userId: string, oldToken: string, newToken: string): Promise<void> {
    await this.revokeRefreshToken(userId, oldToken);
    await this.storeRefreshToken(userId, newToken);
  }

  // Email verification
  async storeEmailVerificationToken(userId: string, token: string, expiry: Date): Promise<void> {
    await this.userRepository.update(userId, {
      emailVerificationToken: token,
      emailVerificationExpiry: expiry,
    });

    await this.invalidateUserCache(userId);
  }

  async findByEmailVerificationToken(token: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: {
        emailVerificationToken: token,
        emailVerificationExpiry: new Date(),
      },
    });
  }

  async verifyEmailWithToken(userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpiry: null,
      status: UserStatus.ACTIVE, // Activate account on email verification
    });

    await this.invalidateUserCache(userId);
  }

  // Password reset
  async storePasswordResetToken(userId: string, token: string, expiry: Date): Promise<void> {
    await this.userRepository.update(userId, {
      passwordResetToken: token,
      passwordResetExpiry: expiry,
    });

    await this.invalidateUserCache(userId);
  }

  async findByPasswordResetToken(token: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: {
        passwordResetToken: token,
        passwordResetExpiry: new Date(),
      },
    });
  }

  async assignRoles(userId: string, roleIds: string[]): Promise<User> {
    const user = await this.findById(userId, { includeRoles: true });
    const roles = await this.roleRepository.findBy({ id: In(roleIds) });

    if (roles.length !== roleIds.length) {
      throw new NotFoundException('Some roles not found');
    }

    user.roles = [...(user.roles || []), ...roles];
    const updatedUser = await this.userRepository.save(user);

    await this.clearUserCache(userId);
    return updatedUser;
  }

  async removeRoles(userId: string, roleIds: string[]): Promise<User> {
    const user = await this.findById(userId, { includeRoles: true });

    user.roles = user.roles?.filter(role => !roleIds.includes(role.id)) || [];
    const updatedUser = await this.userRepository.save(user);

    await this.clearUserCache(userId);
    return updatedUser;
  }

  async assignPermissions(userId: string, permissionIds: string[]): Promise<User> {
    const user = await this.findById(userId, { includeRoles: true });
    const permissions = await this.permissionRepository.findBy({ id: In(permissionIds) });

    if (permissions.length !== permissionIds.length) {
      throw new NotFoundException('Some permissions not found');
    }

    user.permissions = [...(user.permissions || []), ...permissions];
    const updatedUser = await this.userRepository.save(user);

    await this.clearUserCache(userId);
    return updatedUser;
  }

  async bulkUpdateStatus(bulkUpdateDto: BulkUpdateStatusDto): Promise<{ affected: number }> {
    const result = await this.userRepository.update(
      { id: In(bulkUpdateDto.userIds) },
      {
        status: bulkUpdateDto.status,
        metadata: JSON.stringify(
          bulkUpdateDto.reason
            ? ({ statusChangeReason: bulkUpdateDto.reason } as Record<string, any>)
            : undefined,
        ),
      },
    );

    // Clear cache for all affected users
    await Promise.all(bulkUpdateDto.userIds.map(id => this.clearUserCache(id)));

    this.logger.log(
      `Bulk status update: ${result.affected} users updated to ${bulkUpdateDto.status}`,
    );
    return { affected: result.affected || 0 };
  }

  async bulkAssignRoles(bulkAssignDto: BulkAssignRolesDto): Promise<{ affected: number }> {
    const users = await this.userRepository.findBy({ id: In(bulkAssignDto.userIds) });
    const roles = await this.roleRepository.findBy({ id: In(bulkAssignDto.roleIds) });

    if (roles.length !== bulkAssignDto.roleIds.length) {
      throw new NotFoundException('Some roles not found');
    }

    let affected = 0;
    for (const user of users) {
      const existingRoleIds = user.roles?.map(r => r.id) || [];
      const newRoles = roles.filter(role => !existingRoleIds.includes(role.id));

      if (newRoles.length > 0) {
        user.roles = [...(user.roles || []), ...newRoles];
        await this.userRepository.save(user);
        await this.clearUserCache(user.id);
        affected++;
      }
    }

    this.logger.log(`Bulk role assignment: ${affected} users affected`);
    return { affected };
  }

  async bulkDelete(userIds: string[]): Promise<{ affected: number }> {
    const result = await this.userRepository.update(
      { id: In(userIds) },
      { status: UserStatus.DELETED },
    );

    // Clear cache for all affected users
    await Promise.all(userIds.map(id => this.clearUserCache(id)));

    this.logger.log(`Bulk delete: ${result.affected} users deleted`);
    return { affected: result.affected || 0 };
  }

  async resetPasswordWithToken(userId: string, passwordHash: string): Promise<void> {
    await this.userRepository.update(userId, {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiry: null,
      passwordChangedAt: new Date(),
    });

    await this.invalidateUserCache(userId);
  }

  async importUsers(importDto: ImportUsersDto): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

    try {
      const records = parse(importDto.csvData, {
        columns: true,
        skip_empty_lines: true,
      });

      for (const record of records) {
        try {
          const createUserDto: CreateUserDto = {
            email: record.email,
            username: record.username || record.email.split('@')[0],
            passwordHash:
              (await this.passwordService.hashPassword(record.password)) ||
              this.generateRandomPassword(),
            firstName: record.firstName,
            lastName: record.lastName,
            userType: record.userType || UserType.STUDENT,
            phone: record.phone,
          };

          await this.create(createUserDto);
          imported++;
        } catch (error) {
          errors.push(`Row ${imported + errors.length + 1}: ${error.message}`);
        }
      }
    } catch (error) {
      throw new BadRequestException(`CSV parsing error: ${error.message}`);
    }

    this.logger.log(`Import completed: ${imported} users imported, ${errors.length} errors`);
    return { imported, errors };
  }

  async exportUsers(queryDto: UserQueryDto): Promise<string> {
    const { data: users } = await this.findAll({ ...queryDto, limit: 10000 }); // Large limit for export

    const csvHeaders = [
      'id',
      'email',
      'username',
      'firstName',
      'lastName',
      'userType',
      'status',
      'emailVerified',
      'createdAt',
    ];

    const csvRows = users.map(user => [
      user.id,
      user.email,
      user.username,
      user.firstName || '',
      user.lastName || '',
      user.userType,
      user.status,
      user.emailVerified,
      user.createdAt.toISOString(),
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }

  // Two-factor authentication
  async storeTwoFactorSecret(userId: string, secret: string): Promise<void> {
    await this.userRepository.update(userId, { twoFactorSecret: secret });
    await this.invalidateUserCache(userId);
  }

  async enableTwoFactor(userId: string): Promise<void> {
    await this.userRepository.update(userId, { twoFactorEnabled: true });
    await this.invalidateUserCache(userId);
  }

  async disableTwoFactor(userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      backupCodes: null,
    });
    await this.invalidateUserCache(userId);
  }

  async storeBackupCodes(userId: string, codes: string[]): Promise<void> {
    await this.userRepository.update(userId, { backupCodes: codes });
    await this.invalidateUserCache(userId);
  }

  async removeBackupCode(userId: string, code: string): Promise<void> {
    const user = await this.findById(userId);
    const backupCodes = user.backupCodes?.filter(c => c !== code) || [];

    await this.userRepository.update(userId, { backupCodes });
    await this.invalidateUserCache(userId);
  }

  async updateUserProfile(id: string, updateDto: UpdateUserProfileDto): Promise<UserProfile> {
    const user = await this.findById(id, { includeProfiles: true });

    let profile = user.userProfile;
    if (!profile) {
      profile = this.userProfileRepository.create({ user });
    }

    Object.assign(profile, updateDto);
    const updatedProfile = await this.userProfileRepository.save(profile);

    await this.clearUserCache(id);
    return updatedProfile;
  }

  async updateStudentProfile(
    id: string,
    updateDto: UpdateStudentProfileDto,
  ): Promise<StudentProfile> {
    const user = await this.findById(id, { includeProfiles: true });

    if (user.userType !== UserType.STUDENT) {
      throw new BadRequestException('User is not a student');
    }

    let profile = user.studentProfile;
    if (!profile) {
      profile = this.studentProfileRepository.create({ user });
    }

    Object.assign(profile, updateDto);
    const updatedProfile = await this.studentProfileRepository.save(profile);

    await this.clearUserCache(id);
    return updatedProfile;
  }

  async updateTeacherProfile(
    id: string,
    updateDto: UpdateTeacherProfileDto,
  ): Promise<TeacherProfile> {
    const user = await this.findById(id, { includeProfiles: true });

    if (user.userType !== UserType.TEACHER) {
      throw new BadRequestException('User is not a teacher');
    }

    let profile = user.teacherProfile;
    if (!profile) {
      profile = this.teacherProfileRepository.create({ user });
    }

    Object.assign(profile, updateDto);
    const updatedProfile = await this.teacherProfileRepository.save(profile);

    await this.clearUserCache(id);
    return updatedProfile;
  }

  async updateAvatar(id: string, avatarUrl: string): Promise<User> {
    const user = await this.findById(id);
    user.avatarUrl = avatarUrl;
    const updatedUser = await this.userRepository.save(user);

    await this.clearUserCache(id);
    return updatedUser;
  }

  async updateCoverImage(id: string, coverUrl: string): Promise<User> {
    const user = await this.findById(id);
    user.coverUrl = coverUrl;
    const updatedUser = await this.userRepository.save(user);

    await this.clearUserCache(id);
    return updatedUser;
  }

  async delete(id: string): Promise<void> {
    const user = await this.findById(id);

    user.deletedAt = new Date();
    await this.userRepository.save(user);

    await this.invalidateUserCache(id);

    this.logger.log(`User deleted: ${id}`);
  }

  async activateUser(id: string): Promise<User> {
    return this.updateUserStatus(id, UserStatus.ACTIVE);
  }

  async deactivateUser(id: string): Promise<User> {
    return this.updateUserStatus(id, UserStatus.INACTIVE);
  }

  async suspendUser(id: string, reason?: string): Promise<User> {
    const user = await this.updateUserStatus(id, UserStatus.SUSPENDED);

    if (reason) {
      user.metadata = JSON.stringify({ ...JSON.parse(user.metadata!), suspensionReason: reason });
      await this.userRepository.save(user);
    }

    return user;
  }

  // mới code mẫu: -->
  async linkOAuthAccount(_id: any, _iv: any): Promise<void> {}
  // mới code mẫu: <--

  // mới code mẫu: -->
  async unlinkOAuthAccount(_userId: string, _provider: 'google' | 'facebook'): Promise<void> {}
  // mới code mẫu: <--

  private async createUserProfile(user: User): Promise<void> {
    // Create basic user profile
    const userProfile = this.userProfileRepository.create({
      userId: user.id,
      isPublic: true,
      isSearchable: true,
    });
    await this.userProfileRepository.save(userProfile);

    // Create specific profiles based on user type
    if (user.userType === UserType.STUDENT) {
      const studentProfile = this.studentProfileRepository.create({
        userId: user.id,
        studentCode: await this.generateStudentCode(),
        enrollmentDate: new Date(),
      });
      await this.studentProfileRepository.save(studentProfile);
    } else if (user.userType === UserType.TEACHER) {
      const teacherProfile = this.teacherProfileRepository.create({
        userId: user.id,
        teacherCode: await this.generateTeacherCode(),
        applicationDate: new Date(),
        isApproved: false,
        acceptingStudents: false,
      });
      await this.teacherProfileRepository.save(teacherProfile);
    }
  }

  private async generateStudentCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.studentProfileRepository.count();
    return `STD${year}${String(count + 1).padStart(6, '0')}`;
  }

  private async generateTeacherCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.teacherProfileRepository.count();
    return `TCH${year}${String(count + 1).padStart(6, '0')}`;
  }

  private async invalidateUserCache(userId: string): Promise<void> {
    const patterns = [`user:${userId}:*`, `user:email:*`];

    for (const pattern of patterns) {
      await this.cacheService.invalidateByTag(pattern);
    }
  }

  private createUserQueryBuilder(queryDto: UserQueryDto): SelectQueryBuilder<User> {
    const queryBuilder = this.userRepository.createQueryBuilder('user');

    // Include profiles if requested
    if (queryDto.includeProfiles) {
      queryBuilder
        .leftJoinAndSelect('user.userProfile', 'userProfile')
        .leftJoinAndSelect('user.studentProfile', 'studentProfile')
        .leftJoinAndSelect('user.teacherProfile', 'teacherProfile')
        .leftJoinAndSelect('user.socials', 'socials');
    }

    // Include roles if requested
    if (queryDto.includeRoles) {
      queryBuilder
        .leftJoinAndSelect('user.roles', 'roles')
        .leftJoinAndSelect('user.permissions', 'permissions');
    }

    // Apply filters
    if (queryDto.search) {
      queryBuilder.andWhere(
        '(user.firstName LIKE :search OR user.lastName LIKE :search OR user.email LIKE :search OR user.username LIKE :search)',
        { search: `%${queryDto.search}%` },
      );
    }

    if (queryDto.userType) {
      queryBuilder.andWhere('user.userType = :userType', { userType: queryDto.userType });
    }

    if (queryDto.status) {
      queryBuilder.andWhere('user.status = :status', { status: queryDto.status });
    }

    if (queryDto.emailVerified !== undefined) {
      queryBuilder.andWhere('user.emailVerified = :emailVerified', {
        emailVerified: queryDto.emailVerified,
      });
    }

    if (queryDto.twoFactorEnabled !== undefined) {
      queryBuilder.andWhere('user.twoFactorEnabled = :twoFactorEnabled', {
        twoFactorEnabled: queryDto.twoFactorEnabled,
      });
    }

    if (queryDto.createdAfter) {
      queryBuilder.andWhere('user.createdAt >= :createdAfter', {
        createdAfter: queryDto.createdAfter,
      });
    }

    if (queryDto.createdBefore) {
      queryBuilder.andWhere('user.createdAt <= :createdBefore', {
        createdBefore: queryDto.createdBefore,
      });
    }

    if (queryDto.lastLoginAfter) {
      queryBuilder.andWhere('user.lastLoginAt >= :lastLoginAfter', {
        lastLoginAfter: queryDto.lastLoginAfter,
      });
    }

    return queryBuilder;
  }

  private async updateUserStatus(id: string, status: UserStatus): Promise<User> {
    const user = await this.findById(id);
    user.status = status;
    const updatedUser = await this.userRepository.save(user);

    await this.clearUserCache(id);
    this.logger.log(`User ${user.email} status changed to ${status}`);

    return updatedUser;
  }

  private async assignDefaultRole(user: User): Promise<void> {
    const roleName = user.userType.toLowerCase();
    const defaultRole = await this.roleRepository.findOne({ where: { name: roleName } });

    if (defaultRole) {
      user.roles = [defaultRole];
      await this.userRepository.save(user);
    }
  }

  private generateRandomPassword(): string {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  private async clearUserCache(userId: string): Promise<void> {
    const patterns = [`user:${userId}:*`, `users:*`];

    for (const pattern of patterns) {
      await this.cacheService.del(pattern);
    }
  }
}
