import { IsString, IsOptional, IsBoolean, IsHexColor, IsObject, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateForumTagDto {
  @ApiProperty({ description: 'Tag name', minLength: 1, maxLength: 100 })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiPropertyOptional({ description: 'Tag description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Tag color', default: '#6B7280' })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiPropertyOptional({ description: 'Is tag active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Is tag featured', default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: 'Tag metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateForumTagDto {
  @ApiPropertyOptional({ description: 'Tag name', minLength: 1, maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional({ description: 'URL-friendly tag identifier', minLength: 1, maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  slug?: string;

  @ApiPropertyOptional({ description: 'Tag description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Tag color' })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiPropertyOptional({ description: 'Is tag active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Is tag featured' })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: 'Tag metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
