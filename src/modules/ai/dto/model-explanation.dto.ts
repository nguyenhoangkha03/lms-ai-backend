import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export class ModelExplanationRequestDto {
  @ApiProperty({ description: 'Model ID' })
  @IsString()
  modelId: string;

  @ApiProperty({ description: 'Input data to explain' })
  @IsObject()
  inputData: Record<string, any>;

  @ApiProperty({ description: 'Explanation method' })
  @IsEnum(['lime', 'shap', 'feature_importance', 'attention'])
  method: string;

  @ApiPropertyOptional({ description: 'Explanation configuration' })
  @IsOptional()
  @IsObject()
  config?: {
    numFeatures?: number;
    includeVisualization?: boolean;
    returnFormat?: 'json' | 'html' | 'image';
  };
}

export class ModelExplanationResponseDto {
  @ApiProperty({ description: 'Prediction ID this explanation belongs to' })
  predictionId: string;

  @ApiProperty({ description: 'Explanation method used' })
  method: string;

  @ApiProperty({ description: 'Feature importance scores' })
  featureImportance: Record<string, number>;

  @ApiPropertyOptional({ description: 'Explanation visualization (if requested)' })
  visualization?: string;

  @ApiPropertyOptional({ description: 'Additional explanation metadata' })
  metadata?: Record<string, any>;
}
