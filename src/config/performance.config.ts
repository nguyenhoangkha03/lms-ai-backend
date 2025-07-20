export default () => ({
  performance: {
    // Query optimization settings
    queryOptimization: {
      enabled: process.env.QUERY_OPTIMIZATION_ENABLED === 'true' || true,
      explainThreshold: parseInt(process.env.QUERY_EXPLAIN_THRESHOLD || '1000'), // ms
      slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD || '1000'), // ms
      indexHintsEnabled: process.env.INDEX_HINTS_ENABLED === 'true' || true,
      batchSize: parseInt(process.env.BATCH_SIZE || '1000'),
    },

    // Pagination settings
    pagination: {
      defaultLimit: parseInt(process.env.DEFAULT_PAGINATION_LIMIT || '20'),
      maxLimit: parseInt(process.env.MAX_PAGINATION_LIMIT || '100'),
      enableCursorPagination: process.env.CURSOR_PAGINATION_ENABLED === 'true' || false,
      cursorThreshold: parseInt(process.env.CURSOR_PAGINATION_THRESHOLD || '10000'),
    },

    // Caching settings
    caching: {
      enabled: process.env.CACHING_ENABLED === 'true' || true,
      defaultTtl: parseInt(process.env.CACHE_DEFAULT_TTL || '300'), // 5 minutes
      maxTtl: parseInt(process.env.CACHE_MAX_TTL || '3600'), // 1 hour
      compressionThreshold: parseInt(process.env.CACHE_COMPRESSION_THRESHOLD || '1024'), // 1KB
      tags: {
        users: parseInt(process.env.CACHE_USERS_TTL || '900'), // 15 minutes
        courses: parseInt(process.env.CACHE_COURSES_TTL || '1800'), // 30 minutes
        categories: parseInt(process.env.CACHE_CATEGORIES_TTL || '3600'), // 1 hour
        settings: parseInt(process.env.CACHE_SETTINGS_TTL || '7200'), // 2 hours
      },
    },

    // Compression settings
    compression: {
      enabled: process.env.COMPRESSION_ENABLED === 'true' || true,
      threshold: parseInt(process.env.COMPRESSION_THRESHOLD || '1024'), // 1KB
      level: parseInt(process.env.COMPRESSION_LEVEL || '6'),
      algorithms: (process.env.COMPRESSION_ALGORITHMS || 'br,gzip,deflate').split(','),
      cache: process.env.COMPRESSION_CACHE_ENABLED === 'true' || true,
    },

    // Rate limiting settings
    rateLimiting: {
      enabled: process.env.RATE_LIMITING_ENABLED === 'true' || true,
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
      tiers: {
        free: {
          requests: parseInt(process.env.RATE_LIMIT_FREE_TIER || '100'),
          ai: parseInt(process.env.RATE_LIMIT_FREE_AI || '20'),
          upload: parseInt(process.env.RATE_LIMIT_FREE_UPLOAD || '10'),
        },
        premium: {
          requests: parseInt(process.env.RATE_LIMIT_PREMIUM_TIER || '500'),
          ai: parseInt(process.env.RATE_LIMIT_PREMIUM_AI || '100'),
          upload: parseInt(process.env.RATE_LIMIT_PREMIUM_UPLOAD || '50'),
        },
        enterprise: {
          requests: parseInt(process.env.RATE_LIMIT_ENTERPRISE_TIER || '2000'),
          ai: parseInt(process.env.RATE_LIMIT_ENTERPRISE_AI || '500'),
          upload: parseInt(process.env.RATE_LIMIT_ENTERPRISE_UPLOAD || '200'),
        },
      },
      circuitBreaker: {
        enabled: process.env.CIRCUIT_BREAKER_ENABLED === 'true' || true,
        failureThreshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '10'),
        timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '60000'), // 1 minute
      },
    },

    // Monitoring settings
    monitoring: {
      enabled: process.env.PERFORMANCE_MONITORING_ENABLED === 'true' || true,
      metricsWindow: parseInt(process.env.METRICS_WINDOW || '3600000'), // 1 hour
      cleanupInterval: parseInt(process.env.METRICS_CLEANUP_INTERVAL || '86400000'), // 24 hours
      alertThresholds: {
        responseTime: parseInt(process.env.ALERT_RESPONSE_TIME || '1000'), // ms
        errorRate: parseFloat(process.env.ALERT_ERROR_RATE || '5'), // percentage
        memoryUsage: parseInt(process.env.ALERT_MEMORY_USAGE || '1000000000'), // 1GB
        cacheHitRate: parseFloat(process.env.ALERT_CACHE_HIT_RATE || '80'), // percentage
      },
    },

    // Serialization settings
    serialization: {
      cacheEnabled: process.env.SERIALIZATION_CACHE_ENABLED === 'true' || true,
      compressionEnabled: process.env.SERIALIZATION_COMPRESSION_ENABLED === 'true' || true,
      compressionThreshold: parseInt(process.env.SERIALIZATION_COMPRESSION_THRESHOLD || '1024'),
      lazyLoadingEnabled: process.env.LAZY_LOADING_ENABLED === 'true' || true,
      batchSize: parseInt(process.env.SERIALIZATION_BATCH_SIZE || '100'),
    },
  },
});
