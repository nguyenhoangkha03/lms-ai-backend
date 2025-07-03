export interface EmailVerificationToken {
  userId: string;
  email: string;
  createdAt: Date;
  expiresAt: Date;
  attempts: number;
}

export interface PasswordResetToken {
  userId: string;
  email: string;
  createdAt: Date;
  expiresAt: Date;
  attempts: number;
  used: boolean;
}
