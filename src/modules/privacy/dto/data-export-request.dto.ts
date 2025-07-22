import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  XML = 'xml',
  PDF = 'pdf',
}

export enum DeliveryMethod {
  DOWNLOAD = 'download',
  EMAIL = 'email',
  SECURE_LINK = 'secure_link',
}

export class DataExportRequestDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dataCategories?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  timeRange?: {
    from?: Date;
    to?: Date;
  };

  @ApiProperty({ enum: ExportFormat })
  @IsEnum(ExportFormat)
  format: ExportFormat;

  @ApiProperty({ enum: DeliveryMethod })
  @IsEnum(DeliveryMethod)
  deliveryMethod: DeliveryMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  includeMetadata?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  anonymizeData?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  structuredFormat?: boolean;
}
