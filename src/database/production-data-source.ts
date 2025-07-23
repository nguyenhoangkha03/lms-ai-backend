import { DataSource } from 'typeorm';
import * as path from 'path';

export const ProductionDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT ?? '3306', 10),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,

  entities: [path.join(__dirname, '../**/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, './migrations/*{.ts,.js}')],

  ssl:
    process.env.DATABASE_SSL === 'true'
      ? {
          rejectUnauthorized: false,
          ca: process.env.DATABASE_SSL_CA,
          cert: process.env.DATABASE_SSL_CERT,
          key: process.env.DATABASE_SSL_KEY,
        }
      : false,

  // Production optimizations
  extra: {
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT ?? '50', 10),
    acquireTimeout: 60000,
    timeout: 60000,
    charset: 'utf8mb4',
    timezone: '+00:00',
    // Connection pooling
    pool: {
      min: 5,
      max: 50,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200,
    },
  },

  // Disable sync in production
  synchronize: false,

  // Enable logging only for errors
  logging: ['error', 'warn'],

  // Migration settings
  migrationsRun: false,
  migrationsTableName: 'migrations_history',
});
