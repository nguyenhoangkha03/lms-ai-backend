import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateABTestDto {
  @ApiProperty({ description: 'A/B test name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Test description and hypothesis' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Control model ID' })
  @IsString()
  controlModelId: string;

  @ApiProperty({ description: 'Test model ID' })
  @IsString()
  testModelId: string;

  @ApiProperty({ description: 'Traffic split percentage for test model' })
  @IsNumber()
  @Min(0)
  @Max(100)
  trafficSplit: number;

  @ApiProperty({ description: 'Test start date' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Test end date' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ description: 'Success metrics to track' })
  @IsArray()
  @IsString({ each: true })
  successMetrics: string[];

  @ApiPropertyOptional({ description: 'Test configuration and parameters' })
  @IsOptional()
  @IsObject()
  configuration?: {
    minimumSampleSize?: number;
    confidenceLevel?: number;
    significanceThreshold?: number;
    allowEarlyStop?: boolean;
    targetUsers?: string[];
    excludeUsers?: string[];
  };
}

export class ABTestResultDto {
  @ApiProperty({ description: 'A/B test ID' })
  @IsString()
  testId: string;

  @ApiPropertyOptional({ description: 'User ID who triggered this result' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ description: 'Which model variant was used' })
  @IsEnum(['control', 'test'])
  modelVariant: 'control' | 'test';

  @ApiProperty({ description: 'Metric values recorded' })
  @IsObject()
  metricValues: Record<string, number>;

  @ApiPropertyOptional({ description: 'Additional context data' })
  @IsOptional()
  @IsObject()
  contextData?: Record<string, any>;
}
