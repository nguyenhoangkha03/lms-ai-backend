import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

export class GdprComplianceReportDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includeCategories?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  includeMetrics?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  includeRecommendations?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  detailedAnalysis?: boolean;
}
