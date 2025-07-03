import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { UserService } from '@/modules/user/services/user.service';

@Injectable()
export class TwoFactorService {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {}

  async generateTwoFactorSecret(userId: string): Promise<{ secret: string; qrCodeUrl: string }> {
    const user = await this.userService.findById(userId);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const secret = speakeasy.generateSecret({
      name: `LMS AI (${user.email})`,
      issuer: 'LMS AI Platform',
      length: 32,
    });

    // Store the secret in database (temporarily, until verified)
    await this.userService.storeTwoFactorSecret(userId, secret.base32);

    // Generate QR code
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

    return {
      secret: secret.base32,
      qrCodeUrl,
    };
  }

  async enableTwoFactor(userId: string, token: string): Promise<void> {
    const user = await this.userService.findById(userId);

    if (!user || !user.twoFactorSecret) {
      throw new BadRequestException('Two-factor setup not initialized');
    }

    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret!,
      encoding: 'base32',
      token,
      window: 2, // Allow for time skew
    });

    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    // Enable 2FA for user
    await this.userService.enableTwoFactor(userId);
  }

  async disableTwoFactor(userId: string, token: string): Promise<void> {
    const user = await this.userService.findById(userId);

    if (!user || !user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret!,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    // Disable 2FA for user
    await this.userService.disableTwoFactor(userId);
  }

  async verifyTwoFactorToken(userId: string, token: string): Promise<boolean> {
    const user = await this.userService.findById(userId);

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return false;
    }

    return speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2,
    });
  }

  async generateBackupCodes(userId: string): Promise<string[]> {
    const backupCodes = Array.from({ length: 10 }, () =>
      Math.random().toString(36).substring(2, 10).toUpperCase(),
    );

    await this.userService.storeBackupCodes(userId, backupCodes);

    return backupCodes;
  }

  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const user = await this.userService.findById(userId);

    if (!user || !user.backupCodes) {
      return false;
    }

    const codeIndex = user.backupCodes.indexOf(code);

    if (codeIndex === -1) {
      return false;
    }

    // Remove used backup code
    await this.userService.removeBackupCode(userId, code);

    return true;
  }

  // mới code mẫu
  async cleanupExpiredBackupCodes(): Promise<void> {}
  // mới code mẫu
}
