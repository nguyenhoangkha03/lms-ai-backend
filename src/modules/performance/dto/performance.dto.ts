import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsEnum, IsBoolean, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class PerformanceQueryDto {
  @ApiPropertyOptional({
    description: 'Timeframe in milliseconds',
    example: 3600000, // 1 hour
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(60000) // Minimum 1 minute
  @Max(86400000) // Maximum 24 hours
  timeframe?: number;

  @ApiPropertyOptional({
    description: 'Metric type to filter',
    enum: ['response_time', 'throughput', 'error_rate', 'cache_hit_rate'],
  })
  @IsOptional()
  @IsEnum(['response_time', 'throughput', 'error_rate', 'cache_hit_rate'])
  metricType?: string;

  @ApiPropertyOptional({
    description: 'Granularity of data points',
    enum: ['minute', 'hour', 'day'],
  })
  @IsOptional()
  @IsEnum(['minute', 'hour', 'day'])
  granularity?: 'minute' | 'hour' | 'day';
}

export class OptimizationConfigDto {
  @ApiProperty({
    description: 'Enable automatic query optimization',
    default: true,
  })
  @IsBoolean()
  enableQueryOptimization: boolean = true;

  @ApiProperty({
    description: 'Enable response compression',
    default: true,
  })
  @IsBoolean()
  enableCompression: boolean = true;

  @ApiProperty({
    description: 'Enable caching',
    default: true,
  })
  @IsBoolean()
  enableCaching: boolean = true;

  @ApiPropertyOptional({
    description: 'Default cache TTL in seconds',
    default: 300,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(60)
  @Max(86400)
  cacheTtl?: number = 300;

  @ApiPropertyOptional({
    description: 'Maximum query complexity score',
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  maxQueryComplexity?: number = 10;

  @ApiPropertyOptional({
    description: 'Pagination limit maximum',
    default: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(10)
  @Max(1000)
  maxPaginationLimit?: number = 100;
}
