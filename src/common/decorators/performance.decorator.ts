import { SetMetadata } from '@nestjs/common';
import { PERFORMANCE_CONFIG_KEY, PerformanceConfig } from '../guards/performance.guard';

export const Performance = (config: PerformanceConfig) =>
  SetMetadata(PERFORMANCE_CONFIG_KEY, config);

export const OptimizedEndpoint = () =>
  Performance({
    maxQueryComplexity: 10,
    maxExecutionTime: 5000,
    requireOptimization: true,
    cacheDuration: 300,
  });

export const HighPerformanceEndpoint = () =>
  Performance({
    maxQueryComplexity: 5,
    maxExecutionTime: 1000,
    maxMemoryUsage: 100 * 1024 * 1024, // 100MB
    requireOptimization: true,
  });
