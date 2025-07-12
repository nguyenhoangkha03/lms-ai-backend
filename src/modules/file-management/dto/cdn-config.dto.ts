import { FileType } from '@/common/enums/course.enums';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsUrl, Min } from 'class-validator';

export class CDNConfigDto {
  @ApiProperty({
    description: 'CDN base URL',
    example: 'https://cdn.example.com',
  })
  @IsUrl()
  baseUrl: string;

  @ApiPropertyOptional({
    description: 'Enable CDN for all files',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;

  @ApiPropertyOptional({
    description: 'Cache duration in seconds',
    example: 86400,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  cacheDuration?: number = 86400;

  @ApiPropertyOptional({
    description: 'File types to serve via CDN',
    example: ['image', 'video', 'audio'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(FileType, { each: true })
  fileTypes?: FileType[];
}
