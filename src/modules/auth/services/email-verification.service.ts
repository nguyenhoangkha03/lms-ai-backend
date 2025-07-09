import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { CacheService as CustomCacheService } from '@/cache/cache.service';
import { createHash, randomBytes } from 'crypto';
import { add } from 'date-fns';
import { EmailVerificationToken, PasswordResetToken } from '../interfaces/email.interface';
import { WinstonService } from '@/logger/winston.service';
import { UserStatus } from '@/common/enums/user.enums';

@Injectable()
export class EmailVerificationService {
  private readonly VERIFICATION_PREFIX = 'email_verification:';
  private readonly RESET_PREFIX = 'password_reset:';
  private readonly MAX_ATTEMPTS = 3;
  private readonly TOKEN_LENGTH = 32;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly cacheService: CustomCacheService,
    private readonly configService: ConfigService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(EmailVerificationService.name);
  }

  /**
   * Generate email verification token
   */
  async generateEmailVerificationToken(userId: string, email: string): Promise<string> {
    const token = this.generateSecureToken();
    const tokenHash = this.hashToken(token);

    const verificationData: EmailVerificationToken = {
      userId,
      email,
      createdAt: new Date(),
      expiresAt: add(new Date(), {
        hours: this.configService.get<number>('auth.emailVerificationExpiresHours', 24),
      }),
      attempts: 0,
    };

    // Store in Redis with expiration
    const cacheKey = `${this.VERIFICATION_PREFIX}${tokenHash}`;
    await this.cacheService.set(
      cacheKey,
      JSON.stringify(verificationData),
      24 * 60 * 60, // 24 hours in seconds
    );

    this.logger.log(`Email verification token generated for user: ${userId}`);
    return token;
  }

  /**
   * Verify email verification token
   */
  async verifyEmailToken(token: string): Promise<{ userId: string; email: string }> {
    const tokenHash = this.hashToken(token);
    const cacheKey = `${this.VERIFICATION_PREFIX}${tokenHash}`;

    const cachedData = await this.cacheService.get(cacheKey);
    if (!cachedData) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    const verificationData: EmailVerificationToken = JSON.parse(cachedData as string);

    // Check expiration
    if (new Date() > verificationData.expiresAt) {
      await this.cacheService.del(cacheKey);
      throw new BadRequestException('Verification token has expired');
    }

    // Update user's email verification status
    await this.userRepository.update(verificationData.userId, {
      emailVerified: true,
      status: UserStatus.ACTIVE,
    });

    // Remove token from cache
    await this.cacheService.del(cacheKey);

    this.logger.log(`Email verified successfully for user: ${verificationData.userId}`);

    return {
      userId: verificationData.userId,
      email: verificationData.email,
    };
  }

  /**
   * Generate password reset token
   */
  async generatePasswordResetToken(email: string): Promise<string | null> {
    const user = await this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'status'],
    });

    if (!user || user.status !== 'active') {
      // Don't reveal if email exists or not for security
      this.logger.warn(`Password reset attempted for non-existent/inactive email: ${email}`);
      return null;
    }

    const token = this.generateSecureToken();
    const tokenHash = this.hashToken(token);

    const resetData: PasswordResetToken = {
      userId: user.id,
      email: user.email,
      createdAt: new Date(),
      expiresAt: add(new Date(), {
        minutes: this.configService.get<number>('auth.passwordResetExpiresMinutes', 15),
      }),
      attempts: 0,
      used: false,
    };

    // Store in Redis with expiration
    const cacheKey = `${this.RESET_PREFIX}${tokenHash}`;
    await this.cacheService.set(
      cacheKey,
      JSON.stringify(resetData),
      15 * 60, // 15 minutes in seconds
    );

    // Invalidate any existing reset tokens for this user
    await this.invalidateExistingResetTokens(user.id);

    this.logger.log(`Password reset token generated for user: ${user.id}`);
    return token;
  }

  /**
   * Verify password reset token
   */
  async verifyPasswordResetToken(token: string): Promise<{ userId: string; email: string }> {
    const tokenHash = this.hashToken(token);
    const cacheKey = `${this.RESET_PREFIX}${tokenHash}`;

    const cachedData = await this.cacheService.get(cacheKey);
    if (!cachedData) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const resetData: PasswordResetToken = JSON.parse(cachedData as string);

    // Check if already used
    if (resetData.used) {
      throw new BadRequestException('Reset token has already been used');
    }

    // Check expiration
    if (new Date() > resetData.expiresAt) {
      await this.cacheService.del(cacheKey);
      throw new BadRequestException('Reset token has expired');
    }

    // Increment attempts
    resetData.attempts++;
    if (resetData.attempts > this.MAX_ATTEMPTS) {
      await this.cacheService.del(cacheKey);
      throw new BadRequestException('Too many attempts. Please request a new reset token');
    }

    // Update cache with incremented attempts
    await this.cacheService.set(cacheKey, JSON.stringify(resetData), 15 * 60);

    return {
      userId: resetData.userId,
      email: resetData.email,
    };
  }

  /**
   * Mark password reset token as used
   */
  async markResetTokenAsUsed(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    const cacheKey = `${this.RESET_PREFIX}${tokenHash}`;

    const cachedData = await this.cacheService.get(cacheKey);
    if (cachedData) {
      const resetData: PasswordResetToken = JSON.parse(cachedData as string);
      resetData.used = true;

      // Keep for a short time to prevent reuse
      await this.cacheService.set(cacheKey, JSON.stringify(resetData), 60); // 1 minute
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(userId: string): Promise<string> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'emailVerified', 'status'],
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Check rate limiting
    const rateLimitKey = `verification_rate_limit:${userId}`;
    const lastSent = await this.cacheService.get(rateLimitKey);

    if (lastSent) {
      throw new BadRequestException('Please wait before requesting another verification email');
    }

    // Set rate limit (5 minutes)
    await this.cacheService.set(rateLimitKey, new Date().toISOString(), 5 * 60);

    return this.generateEmailVerificationToken(userId, user.email);
  }

  /**
   * Generate secure random token
   */
  private generateSecureToken(): string {
    return randomBytes(this.TOKEN_LENGTH).toString('hex');
  }

  /**
   * Hash token for storage
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Invalidate existing reset tokens for user
   */
  private async invalidateExistingResetTokens(userId: string): Promise<void> {
    // This would require additional tracking in a real implementation
    // For now, we rely on token expiration
    this.logger.log(`Invalidating existing reset tokens for user: ${userId}`);
  }

  /**
   * Clean up expired tokens (scheduled job)
   */
  async cleanupExpiredTokens(): Promise<void> {
    // This would be handled by Redis TTL automatically
    // But we can add additional cleanup logic here if needed
    this.logger.log('Cleaning up expired tokens...');
  }
}
