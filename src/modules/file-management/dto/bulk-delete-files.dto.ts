import { ApiPropertyOptional } from '@nestjs/swagger';
import { BulkFileOperationDto } from './bulk-file-operation.dto';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class BulkDeleteFilesDto extends BulkFileOperationDto {
  @ApiPropertyOptional({
    description: 'Reason for bulk deletion',
    example: 'Content cleanup',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;

  @ApiPropertyOptional({
    description: 'Permanently delete files (cannot be undone)',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  permanent?: boolean = false;
}
