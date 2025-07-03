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
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
  sessionId?: string;
  requires2FA?: boolean;
  tempToken?: string;
  requiresEmailVerification?: boolean;
}
