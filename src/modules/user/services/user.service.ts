import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserProfile } from '../entities/user-profile.entity';
import { StudentProfile } from '../entities/student-profile.entity';
import { TeacherProfile } from '../entities/teacher-profile.entity';
import { UserStatus, UserType } from '@/common/enums/user.enums';
import { CacheService } from '@/cache/cache.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

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
  ) {}

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

    // Generate user-specific codes
    await this.generateUserCodes(savedUser);

    this.logger.log(`User created: ${savedUser.email} (${savedUser.userType})`);

    return this.findById(savedUser.id, { includeProfiles: true });
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

    const relations: string[] = [];
    if (options?.includeProfiles) {
      relations.push('userProfile', 'studentProfile', 'teacherProfile', 'socials');
    }
    if (options?.includeRoles) {
      relations.push('roles', 'permissions');
    }

    const user = await this.userRepository.findOne({
      where: { id },
      relations,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.cacheService.set(cacheKey, user, 300); // Cache for 5 minutes

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

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { username },
      relations: ['userProfile', 'studentProfile', 'teacherProfile'],
    });
  }

  async findByEmailOrUsername(email: string, username: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: [{ email }, { username }],
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    // Check for email/username conflicts if being updated
    if (updateUserDto.username) {
      const existing = await this.userRepository.findOne({
        where: [
          //   updateUserDto.email ? { email: updateUserDto.email } : {},
          updateUserDto.username ? { username: updateUserDto.username } : {},
        ].filter(where => Object.keys(where).length > 0),
      });

      if (existing && existing.id !== id) {
        throw new ConflictException('Email or username already in use');
      }
    }

    Object.assign(user, updateUserDto);
    user.updatedAt = new Date();

    const updatedUser = await this.userRepository.save(user);

    // Invalidate cache
    await this.invalidateUserCache(id);

    this.logger.log(`User updated: ${updatedUser.id}`);

    return this.findById(id, { includeProfiles: true });
  }

  async updateStatus(id: string, status: UserStatus): Promise<User> {
    const user = await this.findById(id);
    user.status = status;
    user.updatedAt = new Date();

    await this.userRepository.save(user);
    await this.invalidateUserCache(id);

    this.logger.log(`User status updated: ${id} -> ${status}`);

    return user;
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

  async resetPasswordWithToken(userId: string, passwordHash: string): Promise<void> {
    await this.userRepository.update(userId, {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiry: null,
      passwordChangedAt: new Date(),
    });

    await this.invalidateUserCache(userId);
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

  // Search and filtering
  async findUsers(options: {
    userType?: UserType;
    status?: UserStatus;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ users: User[]; total: number }> {
    const { userType, status, search, page = 1, limit = 20 } = options;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userProfile', 'profile')
      .leftJoinAndSelect('user.studentProfile', 'studentProfile')
      .leftJoinAndSelect('user.teacherProfile', 'teacherProfile');

    if (userType) {
      queryBuilder.andWhere('user.userType = :userType', { userType });
    }

    if (status) {
      queryBuilder.andWhere('user.status = :status', { status });
    }

    if (search) {
      queryBuilder.andWhere(
        '(user.email LIKE :search OR user.username LIKE :search OR user.firstName LIKE :search OR user.lastName LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [users, total] = await queryBuilder
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { users, total };
  }

  async delete(id: string): Promise<void> {
    const user = await this.findById(id);

    // Soft delete
    user.deletedAt = new Date();
    await this.userRepository.save(user);

    await this.invalidateUserCache(id);

    this.logger.log(`User deleted: ${id}`);
  }

  // mới code mẫu: -->
  async linkOAuthAccount(_id: any, _iv: any): Promise<void> {}
  async createOAuthUser(id: any): Promise<User> {
    return this.findById(id);
  }
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

  private async generateUserCodes(_user: User): Promise<void> {
    // This will be implemented based on your code generation strategy
    // For now, we'll use a simple timestamp-based approach
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
}
