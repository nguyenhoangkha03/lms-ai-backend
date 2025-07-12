import { FileAccessLevel } from '@/common/enums/file.enums';
import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { UploadFileDto } from './upload-file.dto';

export class UpdateFileDto extends PartialType(UploadFileDto) {
  @ApiPropertyOptional({
    description: 'Updated file description',
    example: 'Updated course introduction video',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Updated access level',
    enum: FileAccessLevel,
    example: FileAccessLevel.PUBLIC,
  })
  @IsOptional()
  @IsEnum(FileAccessLevel)
  accessLevel?: FileAccessLevel;

  @ApiPropertyOptional({
    description: 'Whether file is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Additional metadata updates',
    example: { tags: ['updated', 'revised'] },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
