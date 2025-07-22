import {
  IsEnum,
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RequestType, Priority } from '../entities/data-protection-request.entity';

class RequestDetailsDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specificData?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  timeRange?: {
    from?: Date;
    to?: Date;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  format?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deliveryMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  additionalInfo?: Record<string, any>;
}

export class CreateDataProtectionRequestDto {
  @ApiProperty({ enum: RequestType })
  @IsEnum(RequestType)
  type: RequestType;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiPropertyOptional({ enum: Priority })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  legalBasis?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ type: RequestDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RequestDetailsDto)
  requestDetails?: RequestDetailsDto;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dataCategories?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isUrgent?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasThirdPartyData?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  thirdParties?: Array<{
    name: string;
    contactInfo: string;
    dataShared: string[];
  }>;
}
