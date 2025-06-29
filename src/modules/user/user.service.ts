import { Injectable } from '@nestjs/common';

@Injectable()
export class UserService {
  constructor() {}
  findById(_payload: any) {
    return {
      status: '1',
      passwordChangedAt: new Date(),
      email: '1',
      id: '1',
      username: '1',
      userType: '1',
      roles: '1',
      permissions: '1',
      passwordHash: '1',
      twoFactorSecret: '1',
      twoFactorEnabled: true,
      backupCodes: ['1', '2', '3'],
    };
  }

  verifyRefreshToken(_payload: any, _refreshToken: string) {
    return true;
  }

  findByEmail(_email: string) {
    return {
      status: '1',
      passwordChangedAt: new Date(),
      passwordHash: '1',
      email: '1',
      id: '1',
      username: '1',
      userType: '1',
      roles: '1',
      permissions: '1',
    };
  }

  updateLastLogin(_userId: string) {}

  storeRefreshToken(_userId: string, _refreshToken: string) {}

  create(_payload: any) {
    return {
      status: '1',
      passwordChangedAt: new Date(),
      passwordHash: '1',
      email: '1',
      id: '1',
      username: '1',
      userType: '1',
      roles: '1',
      permissions: '1',
    };
  }

  rotateRefreshToken(_userId: string, _oldRefreshToken: string, _newRefreshToken: string) {}

  revokeRefreshToken(_userId: string, _refreshToken: string) {}

  revokeAllRefreshTokens(_userId: string) {}

  updatePassword(_userId: string, _passwordHash: string) {}

  storePasswordResetToken(_userId: string, _resetToken: string, _resetTokenExpiry: Date) {}

  findByPasswordResetToken(_resetToken: string) {
    return {
      status: '1',
      passwordChangedAt: new Date(),
      passwordHash: '1',
      email: '1',
      id: '1',
      username: '1',
      userType: '1',
      roles: '1',
      permissions: '1',
    };
  }

  resetPasswordWithToken(_userId: string, _passwordHash: string) {}

  findByEmailVerificationToken(_token: string) {
    return {
      status: '1',
      passwordChangedAt: new Date(),
      passwordHash: '1',
      email: '1',
      id: '1',
      username: '1',
      userType: '1',
      roles: '1',
      permissions: '1',
    };
  }

  verifyEmailWithToken(_userId: string) {}

  storeTwoFactorSecret(_userId: string, _secret: string) {}

  enableTwoFactor(_userId: string) {}

  disableTwoFactor(_userId: string) {}

  storeBackupCodes(_userId: string, _backupCodes: string[]) {}

  removeBackupCode(_userId: string, _code: string) {}
}
