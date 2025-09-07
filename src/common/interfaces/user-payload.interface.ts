export interface UserPayload {
  sub: string; // User ID (for JWT standard)
  id: string; // User ID (actual field used)
  email: string;
  username?: string;
  userType?: string;
  role?: string;
  roles?: string[];
  permissions?: string[];
  iat?: number; // Issued at
  exp?: number; // Expires at
}

export interface AuthenticatedUser extends UserPayload {
  id: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  isActive: boolean;
  lastLoginAt?: Date;
}
