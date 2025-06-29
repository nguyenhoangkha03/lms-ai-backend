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
}

export interface Configuration {
  app: AppConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
  jwt: JwtConfig;
  logging: LoggingConfig;
  security: SecurityConfig;
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
    synchronize: process.env.NODE_ENV === 'development',
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
  },
});
