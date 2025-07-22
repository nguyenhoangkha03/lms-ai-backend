import { ConsentType, ConsentMethod } from '../entities/consent-record.entity';
import {
  IsOptional,
  IsEnum,
  IsDateString,
  IsString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ConsentDetailsDto {
  @ApiPropertyOptional()
  @IsOptional()
  specificConsents?: Record<string, boolean>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  granularity?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scope?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  conditions?: string[];
}

export class CreateConsentRecordDto {
  @ApiProperty({ enum: ConsentType })
  @IsEnum(ConsentType)
  type: ConsentType;

  @ApiProperty({ enum: ConsentMethod })
  @IsEnum(ConsentMethod)
  method: ConsentMethod;

  @ApiProperty()
  @IsString()
  purpose: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  legalBasis?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({ type: ConsentDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ConsentDetailsDto)
  consentDetails?: ConsentDetailsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  consentInterface?: string;

  @ApiPropertyOptional()
  @IsOptional()
  evidence?: {
    formData?: Record<string, any>;
    checkboxes?: Record<string, boolean>;
    timestamps?: Record<string, Date>;
  };

  @ApiPropertyOptional()
  @IsOptional()
  thirdParties?: Array<{
    name: string;
    purpose: string;
    retentionPeriod?: string;
    dataCategories?: string[];
  }>;
}
