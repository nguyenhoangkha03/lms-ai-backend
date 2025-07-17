import { IsOptional, IsDateString, IsEnum, IsArray, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ForumStatisticsQueryDto {
  @ApiPropertyOptional({ description: 'Statistics start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Statistics end date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Category IDs to include' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({ description: 'Statistics type' })
  @IsOptional()
  @IsEnum(['overview', 'detailed', 'trends', 'categories', 'users', 'tags'])
  type?: string;
}
