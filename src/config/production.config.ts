import { registerAs } from '@nestjs/config';

export default registerAs('production', () => ({
  environment: 'production',

  app: {
    port: parseInt(process.env.PORT!, 10) || 3000,
    globalPrefix: process.env.API_PREFIX || 'api/v1',
    corsOrigin: process.env.CORS_ORIGIN?.split(',') || ['https://lms-ai.com'],
    trustProxy: process.env.TRUST_PROXY === 'true',
    shutdownTimeout: parseInt(process.env.SHUTDOWN_TIMEOUT!, 10) || 10000,
  },

  performance: {
    compressionEnabled: true,
    cacheHeaders: true,
    etag: true,
    keepAliveTimeout: 65000,
    headersTimeout: 66000,
    bodySizeLimit: '50mb',
    parameterLimit: 1000,
  },

  cluster: {
    enabled: process.env.CLUSTER_ENABLED === 'true',
    workers: parseInt(process.env.CLUSTER_WORKERS!, 10) || 0,
  },

  monitoring: {
    enabled: true,
    metricsPath: '/metrics',
    healthPath: '/health',
    readinessPath: '/ready',
    livenessPath: '/live',
  },

  gracefulShutdown: {
    enabled: true,
    timeout: 15000,
    forceExitDelay: 30000,
  },
}));
