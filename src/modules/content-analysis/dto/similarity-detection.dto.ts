import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SimilarityType } from '../entities/content-similarity.entity';

export class AnalyzeSimilarityDto {
  @ApiProperty({ description: 'Source content type', enum: ['course', 'lesson'] })
  @IsEnum(['course', 'lesson'])
  sourceContentType: 'course' | 'lesson';

  @ApiProperty({ description: 'Source content ID' })
  @IsString()
  sourceContentId: string;

  @ApiProperty({ description: 'Target content type', enum: ['course', 'lesson'] })
  @IsEnum(['course', 'lesson'])
  targetContentType: 'course' | 'lesson';

  @ApiProperty({ description: 'Target content ID' })
  @IsString()
  targetContentId: string;

  @ApiProperty({ description: 'Similarity type', enum: SimilarityType })
  @IsEnum(SimilarityType)
  similarityType: SimilarityType;

  @ApiPropertyOptional({ description: 'Force recalculation even if similarity exists' })
  @IsOptional()
  @IsBoolean()
  forceRecalculation?: boolean = false;
}

export class BulkSimilarityAnalysisDto {
  @ApiProperty({ description: 'Source content type', enum: ['course', 'lesson'] })
  @IsEnum(['course', 'lesson'])
  sourceContentType: 'course' | 'lesson';

  @ApiProperty({ description: 'Source content ID' })
  @IsString()
  sourceContentId: string;

  @ApiProperty({ description: 'Target content IDs to compare with', type: [String] })
  @IsArray()
  @IsString({ each: true })
  targetContentIds: string[];

  @ApiProperty({
    description: 'Similarity types to calculate',
    enum: SimilarityType,
    isArray: true,
  })
  @IsArray()
  @IsEnum(SimilarityType, { each: true })
  similarityTypes: SimilarityType[];

  @ApiPropertyOptional({ description: 'Minimum similarity threshold', default: 0.1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minSimilarityThreshold?: number = 0.1;
}

export class SimilarityQueryDto {
  @ApiPropertyOptional({ description: 'Source content type filter', enum: ['course', 'lesson'] })
  @IsOptional()
  @IsEnum(['course', 'lesson'])
  sourceContentType?: 'course' | 'lesson';

  @ApiPropertyOptional({ description: 'Source content ID filter' })
  @IsOptional()
  @IsString()
  sourceContentId?: string;

  @ApiPropertyOptional({ description: 'Target content type filter', enum: ['course', 'lesson'] })
  @IsOptional()
  @IsEnum(['course', 'lesson'])
  targetContentType?: 'course' | 'lesson';

  @ApiPropertyOptional({ description: 'Similarity type filter', enum: SimilarityType })
  @IsOptional()
  @IsEnum(SimilarityType)
  similarityType?: SimilarityType;

  @ApiPropertyOptional({ description: 'Minimum similarity score' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minSimilarityScore?: number;

  @ApiPropertyOptional({ description: 'Maximum similarity score' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  maxSimilarityScore?: number;

  @ApiPropertyOptional({
    description: 'Sort by similarity score',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortBySimilarity?: 'asc' | 'desc' = 'desc';
}
