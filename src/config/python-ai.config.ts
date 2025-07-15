export const pythonAIConfig = {
  serviceUrl: process.env.PYTHON_AI_SERVICE_URL || 'http://localhost:8000',
  timeout: parseInt(process.env.PYTHON_AI_SERVICE_TIMEOUT || '30000'),
  retryAttempts: parseInt(process.env.PYTHON_AI_SERVICE_RETRY || '3'),
  authToken: process.env.PYTHON_AI_SERVICE_TOKEN,
  apiVersion: process.env.PYTHON_AI_SERVICE_API_VERSION || 'v1',

  // Model serving configuration
  serving: {
    defaultReplicas: parseInt(process.env.MODEL_DEFAULT_REPLICAS || '2'),
    maxReplicas: parseInt(process.env.MODEL_MAX_REPLICAS || '10'),
    cpuRequest: process.env.MODEL_CPU_REQUEST || '100m',
    memoryRequest: process.env.MODEL_MEMORY_REQUEST || '256Mi',
    cpuLimit: process.env.MODEL_CPU_LIMIT || '1000m',
    memoryLimit: process.env.MODEL_MEMORY_LIMIT || '2Gi',
  },

  // A/B testing configuration
  abTesting: {
    defaultTrafficSplit: 50,
    minSampleSize: 100,
    confidenceLevel: 0.95,
    significanceThreshold: 0.05,
  },

  // Monitoring configuration
  monitoring: {
    healthCheckInterval: 300000, // 5 minutes
    metricsCollectionInterval: 3600000, // 1 hour
    alertThresholds: {
      errorRate: 0.05, // 5%
      latency: 5000, // 5 seconds
      cpuUsage: 0.8, // 80%
      memoryUsage: 0.85, // 85%
    },
  },

  // Cache configuration
  cache: {
    predictionTTL: {
      course_recommendation: 3600, // 1 hour
      content_similarity: 7200, // 2 hours
      learning_outcome_prediction: 1800, // 30 minutes
      difficulty_adjustment: 900, // 15 minutes
      default: 1800, // 30 minutes
    },
  },
};
