import { AnonymizationType } from '../entities/data-anonymization-log.entity';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class AnonymizationParametersDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  algorithm?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  kValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  lDiversity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  tCloseness?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  epsilonValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  saltValue?: string;
}

class FieldAnonymizationDto {
  @ApiProperty()
  @IsString()
  fieldName: string;

  @ApiProperty()
  @IsString()
  originalType: string;

  @ApiProperty()
  @IsString()
  anonymizationMethod: string;

  @ApiPropertyOptional()
  @IsOptional()
  parameters?: Record<string, any>;
}

export class CreateAnonymizationRequestDto {
  @ApiProperty()
  @IsString()
  entityType: string;

  @ApiProperty()
  @IsString()
  entityId: string;

  @ApiProperty({ enum: AnonymizationType })
  @IsEnum(AnonymizationType)
  anonymizationType: AnonymizationType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ type: [FieldAnonymizationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldAnonymizationDto)
  fieldsAnonymized: FieldAnonymizationDto[];

  @ApiPropertyOptional({ type: AnonymizationParametersDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AnonymizationParametersDto)
  anonymizationParameters?: AnonymizationParametersDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isReversible?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  legalBasis?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  relatedRequestId?: string;
}
