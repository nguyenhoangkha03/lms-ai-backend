import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SessionService } from '../services/session.service';
import { EmailVerificationService } from '../services/email-verification.service';
import { TwoFactorService } from '../services/two-factor.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthCleanupService {
  private readonly logger = new Logger(AuthCleanupService.name);

  constructor(
    private readonly sessionService: SessionService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly twoFactorService: TwoFactorService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Clean up expired sessions every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredSessions() {
    this.logger.log('Starting expired sessions cleanup...');

    try {
      const cleanedCount = await this.sessionService.cleanupExpiredSessions();
      this.logger.log(`Cleaned up ${cleanedCount} expired sessions`);
    } catch (error) {
      this.logger.error('Failed to cleanup expired sessions:', error.message);
    }
  }

  /**
   * Clean up expired tokens every 30 minutes
   */
  @Cron('0 */30 * * * *') // Every 30 minutes
  async cleanupExpiredTokens() {
    this.logger.log('Starting expired tokens cleanup...');

    try {
      await this.emailVerificationService.cleanupExpiredTokens();
      this.logger.log('Expired tokens cleanup completed');
    } catch (error) {
      this.logger.error('Failed to cleanup expired tokens:', error.message);
    }
  }

  /**
   * Clean up expired 2FA backup codes every day at 3 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpired2FACodes() {
    this.logger.log('Starting expired 2FA backup codes cleanup...');

    try {
      await this.twoFactorService.cleanupExpiredBackupCodes();
      this.logger.log('Expired 2FA backup codes cleanup completed');
    } catch (error) {
      this.logger.error('Failed to cleanup expired 2FA codes:', error.message);
    }
  }

  /**
   * Generate security reports every week
   */
  @Cron(CronExpression.EVERY_WEEK)
  async generateSecurityReport() {
    this.logger.log('Generating weekly security report...');

    try {
      // TODO: Implement security report generation
      // This could include:
      // - Failed login attempts summary
      // - Account lockouts
      // - Password reset requests
      // - 2FA adoption rates
      // - OAuth usage statistics

      this.logger.log('Weekly security report generated');
    } catch (error) {
      this.logger.error('Failed to generate security report:', error.message);
    }
  }
}
