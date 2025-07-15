import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class ModelHealthCheckDto {
  @ApiProperty({ description: 'Model ID to check' })
  @IsString()
  modelId: string;

  @ApiPropertyOptional({ description: 'Specific version to check' })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({ description: 'Health check configuration' })
  @IsOptional()
  @IsObject()
  config?: {
    includeMetrics?: boolean;
    includeResourceUsage?: boolean;
    includePredictionLatency?: boolean;
    testPrediction?: boolean;
  };
}

export class ModelPerformanceMetricsDto {
  @ApiProperty({ description: 'Model ID' })
  modelId: string;

  @ApiProperty({ description: 'Model version' })
  version: string;

  @ApiProperty({ description: 'Performance metrics' })
  metrics: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1Score?: number;
    auc?: number;
    mse?: number;
    mae?: number;
    latency?: number;
    throughput?: number;
    errorRate?: number;
  };

  @ApiProperty({ description: 'Resource usage metrics' })
  resourceUsage: {
    cpuUsage?: number;
    memoryUsage?: number;
    gpuUsage?: number;
    diskUsage?: number;
  };

  @ApiProperty({ description: 'Timestamp of metrics collection' })
  timestamp: Date;
}
