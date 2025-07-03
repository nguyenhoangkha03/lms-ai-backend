export interface LoginAttempt {
  email: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
  failureReason?: string;
}
