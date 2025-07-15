import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class ModelTrainingDto {
  @ApiProperty({ description: 'Model ID to train' })
  @IsString()
  modelId: string;

  @ApiProperty({ description: 'Training dataset configuration' })
  @IsObject()
  datasetConfig: {
    datasetName: string;
    dataSource: string;
    features: string[];
    targetVariable?: string;
    trainSplit?: number;
    validationSplit?: number;
    testSplit?: number;
  };

  @ApiPropertyOptional({ description: 'Training configuration' })
  @IsOptional()
  @IsObject()
  trainingConfig?: {
    epochs?: number;
    batchSize?: number;
    learningRate?: number;
    optimizer?: string;
    lossFunction?: string;
    regularization?: Record<string, any>;
    earlyStoppingConfig?: {
      patience?: number;
      minDelta?: number;
      metric?: string;
    };
  };

  @ApiPropertyOptional({ description: 'Hyperparameters to tune' })
  @IsOptional()
  @IsObject()
  hyperparameters?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Cross-validation settings' })
  @IsOptional()
  @IsObject()
  crossValidation?: {
    enabled?: boolean;
    folds?: number;
    strategy?: string;
  };

  @ApiPropertyOptional({ description: 'Compute resources configuration' })
  @IsOptional()
  @IsObject()
  computeConfig?: {
    resourceType?: 'cpu' | 'gpu' | 'tpu';
    instanceType?: string;
    maxTrainingTime?: number;
  };
}

export class ModelEvaluationDto {
  @ApiProperty({ description: 'Model ID to evaluate' })
  @IsString()
  modelId: string;

  @ApiProperty({ description: 'Model version to evaluate' })
  @IsString()
  version: string;

  @ApiProperty({ description: 'Evaluation dataset configuration' })
  @IsObject()
  evaluationConfig: {
    datasetName: string;
    dataSource: string;
    metrics: string[];
    testSplit?: number;
  };

  @ApiPropertyOptional({ description: 'Evaluation options' })
  @IsOptional()
  @IsObject()
  options?: {
    generateReport?: boolean;
    includeFeatureImportance?: boolean;
    includeConfusionMatrix?: boolean;
    includePredictionSamples?: boolean;
  };
}
