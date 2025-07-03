export interface SessionData {
  userId: string;
  userType: 'student' | 'teacher' | 'admin';
  email: string;
  username: string;
  roles: string[];
  permissions: string[];
  deviceInfo: {
    userAgent: string;
    ip: string;
    device: string;
    browser: string;
    os: string;
  };
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt: Date;
  isActive: boolean;
  loginMethod: 'local' | 'google' | 'facebook' | '2fa';
}

export interface ActiveSession {
  sessionId: string;
  deviceInfo: SessionData['deviceInfo'];
  createdAt: Date;
  lastAccessedAt: Date;
  current?: boolean;
}

export interface SessionStatistics {
  totalSessions: number;
  activeSessions: number;
  expiredSessions: number;
  deviceBreakdown: { [key: string]: number };
  loginMethodBreakdown: { [key: string]: number };
}
