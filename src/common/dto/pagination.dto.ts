import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min, IsEnum } from 'class-validator';

export class PaginationDto {
  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    example: 'createdAt',
  })
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'DESC',
    enum: ['ASC', 'DESC', 'asc', 'desc'],
    default: 'DESC',
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC', 'asc', 'desc'], { message: 'Sort order must be either ASC, DESC, asc, or desc' })
  sortOrder?: 'ASC' | 'DESC' | 'asc' | 'desc' = 'DESC';
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export function createPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}
export function getSkipValue(page: number, limit: number): number {
  return (page - 1) * limit;
}
export class SearchablePaginationDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Search term',
    example: 'javascript',
    maxLength: 255,
  })
  @IsOptional()
  search?: string;
}

export class DateRangePaginationDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Start date for filtering (ISO format)',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for filtering (ISO format)',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  endDate?: string;
}
