import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class FileAccessDto {
  @ApiPropertyOptional({
    description: 'Access token for temporary file access',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsOptional()
  @IsString()
  token?: string;

  @ApiPropertyOptional({
    description: 'URL expiration time in seconds',
    example: 3600,
    minimum: 60,
    maximum: 86400,
  })
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(86400)
  expiresIn?: number = 3600;

  @ApiPropertyOptional({
    description: 'Download or stream the file',
    example: 'download',
    enum: ['download', 'stream', 'view'],
  })
  @IsOptional()
  @IsEnum(['download', 'stream', 'view'])
  accessType?: 'download' | 'stream' | 'view' = 'view';
}
