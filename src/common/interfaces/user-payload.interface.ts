export interface UserPayload {
  sub: string; // User ID
  email: string;
  username?: string;
  role?: string;
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
