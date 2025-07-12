import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class FileStreamDto {
  @ApiPropertyOptional({
    description: 'HTTP Range header for partial content',
    example: 'bytes=0-1023',
  })
  @IsOptional()
  @IsString()
  range?: string;

  @ApiPropertyOptional({
    description: 'Quality for video streaming',
    example: '720p',
    enum: ['360p', '480p', '720p', '1080p', 'auto'],
  })
  @IsOptional()
  @IsEnum(['360p', '480p', '720p', '1080p', 'auto'])
  quality?: string;

  @ApiPropertyOptional({
    description: 'Start time for video streaming (seconds)',
    example: 30,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  startTime?: number;
}
