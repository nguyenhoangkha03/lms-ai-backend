export interface JwtPayload {
  sub: string; // User ID
  email: string;
  username: string;
  userType: 'student' | 'teacher' | 'admin';
  roles?: string[];
  iat?: number; // Issued at
  exp?: number; // Expires at
  jti?: string; // JWT ID for token tracking
  sessionId?: string; // Session ID for correlation
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface LoginResponse extends AuthTokens {
  user: {
    id: string;
    email: string;
    username: string;
    userType: string;
    displayName?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    coverUrl?: string;
    teacherProfile?: any;
    studentProfile?: any;
    userProfile?: any;
    socials?: any;
  };
  twoFactorEnabled?: boolean;
  sessionId?: string;
  requires2FA?: boolean;
  tempToken?: string;
  requiresEmailVerification?: boolean;
}
