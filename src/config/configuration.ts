export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize: boolean;
  logging: boolean;
  ssl: boolean;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
  rememberMeRefreshExpiration: string;
}

export interface AppConfig {
  port: number;
  apiPrefix: string;
  corsOrigins: string[];
  uploadPath: string;
  maxFileSize: number;
}

export interface LoggingConfig {
  level: string; // mức độ log cần ghi ('info', 'debug', 'warn', 'error')
  format: string; // định dạng của file log ('json' hoặc 'simple' text)
  filename: string;
  maxFiles: number; // số lượng file log tối đa sẽ lưu trữ trước khi xóa file cũ nhất
  maxSize: string; // kích thước tối đa của một file log, ví dụ: '20m' (20MB)
}

export interface SecurityConfig {
  //cấu hình giới hạn số lượng request từ một IP
  rateLimit: {
    ttl: number; // thời gian tồn tại của cửa sổ giới hạn (tính bằng giây)
    limit: number; // số lượng request tối đa trong khoảng thời gian ttl
  };
  helmet: boolean; // bật/tắt thư viện Helmet để bảo vệ các HTTP header
  compression: boolean; // bật/tắt tính năng nén Gzip để giảm kích thước response
  maxLoginAttempts: number;
  accountLockoutTime: number;
  passwordResetExpires: number;
  emailVerificationExpires: number;
  emailVerificationExpiresHours: number;
  passwordResetExpiresMinutes: number;
}

export interface SessionConfig {
  maxAge: number; // thời gian tồn tại của session (tính bằng giây)
  maxSessionsPerUser: number; // số lượng session tối đa cho mỗi người dùng
  cleanupInterval: number; // thời gian tồn tại của cửa sổ giới hạn (tính bằng giây)
}

export interface PasswordConfig {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSymbols: boolean;
  maxAge: number; // 90 days in seconds
  preventReuse: number;
}

export interface TwoFactorConfig {
  appName: string;
  issuer: string;
  qrCodeSize: number;
  backupCodesCount: number;
  codeLength: number;
}

export interface OAuthConfig {
  google: {
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
  };
  facebook: {
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
  };
}

export interface CookieConfig {
  secret: string;
  secure: boolean;
  sameSite: string;
  domain: string;
  httpOnly: boolean;
}

export interface RateLimitConfig {
  ttl: number;
  max: number;
  authTtl: number;
  authMax: number;
}

export interface EmailConfig {
  verificationTemplate: string;
  passwordResetTemplate: string;
  welcomeTemplate: string;
  accountLockedTemplate: string;
  passwordChangedTemplate: string;
  twoFactorEnabledTemplate: string;
}

export interface FrontendConfig {
  url: string;
  verifyEmailPath: string;
  resetPasswordPath: string;
  loginPath: string;
  oauthSuccessPath: string;
  oauthErrorPath: string;
}

export interface AuditConfig {
  logLoginAttempts: boolean;
  logPasswordChanges: boolean;
  logSessionActivity: boolean;
  logSecurityEvents: boolean;
  retentionDays: number;
}

export interface CacheConfig {
  ttl: number;
}

export interface Configuration {
  app: AppConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
  jwt: JwtConfig;
  logging: LoggingConfig;
  security: SecurityConfig;
  session: SessionConfig;
  password: PasswordConfig;
  twoFactor: TwoFactorConfig;
  oauth: OAuthConfig;
  cookie: CookieConfig;
  rateLimit: RateLimitConfig;
  email: EmailConfig;
  frontend: FrontendConfig;
  audit: AuditConfig;
  cache: CacheConfig;
}

export default (): Configuration => ({
  app: {
    port: parseInt(process.env.PORT!, 10) || 3000,
    apiPrefix: process.env.API_PREFIX || 'api/v1',
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3001'],
    uploadPath: process.env.UPLOAD_PATH || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE!, 10) || 10485760, // 10MB
  },
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT!, 10) || 3306,
    username: process.env.DATABASE_USERNAME || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'lms_ai_database',
    // synchronize: process.env.NODE_ENV === 'development',
    synchronize: false,
    logging: process.env.NODE_ENV === 'development',
    ssl: process.env.DATABASE_SSL === 'true',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT!, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB!, 10) || 0,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    rememberMeRefreshExpiration: process.env.JWT_REMEMBER_ME_REFRESH_EXPIRATION || '30d',
  },
  session: {
    maxAge: parseInt(process.env.SESSION_MAX_AGE || '3600'), // 1 hour in seconds
    maxSessionsPerUser: parseInt(process.env.MAX_SESSIONS_PER_USER || '5'),
    cleanupInterval: parseInt(process.env.SESSION_CLEANUP_INTERVAL || '3600000'), // 1 hour in ms
  },
  // Password Policy
  password: {
    minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8'),
    requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE === 'true',
    requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE === 'true',
    requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS === 'true',
    requireSymbols: process.env.PASSWORD_REQUIRE_SYMBOLS === 'true',
    maxAge: parseInt(process.env.PASSWORD_MAX_AGE || '7776000'), // 90 days in seconds
    preventReuse: parseInt(process.env.PASSWORD_PREVENT_REUSE || '5'), // Last 5 passwords
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    filename: process.env.LOG_FILENAME || 'app.log',
    maxFiles: parseInt(process.env.LOG_MAX_FILES!, 10) || 5,
    maxSize: process.env.LOG_MAX_SIZE || '10m',
  },
  security: {
    rateLimit: {
      ttl: parseInt(process.env.RATE_LIMIT_TTL!, 10) || 60,
      limit: parseInt(process.env.RATE_LIMIT_MAX!, 10) || 100,
    },
    helmet: process.env.SECURITY_HELMET !== 'false',
    compression: process.env.SECURITY_COMPRESSION !== 'false',
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
    accountLockoutTime: parseInt(process.env.ACCOUNT_LOCKOUT_TIME || '900'), // 15 minutes in seconds
    passwordResetExpires: parseInt(process.env.PASSWORD_RESET_EXPIRES || '900000'), // 15 minutes in ms
    emailVerificationExpires: parseInt(process.env.EMAIL_VERIFICATION_EXPIRES || '86400000'), // 24 hours in ms
    emailVerificationExpiresHours: parseInt(process.env.EMAIL_VERIFICATION_EXPIRES_HOURS || '24'),
    passwordResetExpiresMinutes: parseInt(process.env.PASSWORD_RESET_EXPIRES_MINUTES || '15'),
  },
  twoFactor: {
    appName: process.env.TWO_FACTOR_APP_NAME || 'LMS AI Platform',
    issuer: process.env.TWO_FACTOR_ISSUER || 'LMS AI',
    qrCodeSize: parseInt(process.env.TWO_FACTOR_QR_SIZE || '200'),
    backupCodesCount: parseInt(process.env.TWO_FACTOR_BACKUP_CODES_COUNT || '8'),
    codeLength: parseInt(process.env.TWO_FACTOR_CODE_LENGTH || '6'),
  },
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackUrl:
        process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/v1/auth/google/callback',
    },
    facebook: {
      clientId: process.env.FACEBOOK_CLIENT_ID || '',
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
      callbackUrl:
        process.env.FACEBOOK_CALLBACK_URL || 'http://localhost:3000/api/v1/auth/facebook/callback',
    },
  },
  cookie: {
    secret: process.env.COOKIE_SECRET || 'your-cookie-secret-key',
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: process.env.COOKIE_SAME_SITE || 'strict',
    domain: process.env.COOKIE_DOMAIN || 'localhost',
    httpOnly: true,
  },
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL || '60'), // 1 minute
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'), // 100 requests per minute
    authTtl: parseInt(process.env.RATE_LIMIT_AUTH_TTL || '300'), // 5 minutes for auth endpoints
    authMax: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '5'), // 5 attempts per 5 minutes for auth
  },
  email: {
    verificationTemplate: 'email-verification',
    passwordResetTemplate: 'password-reset',
    welcomeTemplate: 'welcome',
    accountLockedTemplate: 'account-locked',
    passwordChangedTemplate: 'password-changed',
    twoFactorEnabledTemplate: 'two-factor-enabled',
  },
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3001',
    verifyEmailPath: '/auth/verify-email',
    resetPasswordPath: '/auth/reset-password',
    loginPath: '/auth/login',
    oauthSuccessPath: '/auth/oauth-success',
    oauthErrorPath: '/auth/error',
  },
  audit: {
    logLoginAttempts: process.env.AUDIT_LOG_LOGIN_ATTEMPTS === 'true',
    logPasswordChanges: process.env.AUDIT_LOG_PASSWORD_CHANGES === 'true',
    logSessionActivity: process.env.AUDIT_LOG_SESSION_ACTIVITY === 'true',
    logSecurityEvents: process.env.AUDIT_LOG_SECURITY_EVENTS === 'true',
    retentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS || '365'),
  },
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '3600'),
  },
});
