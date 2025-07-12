import { FileAccessLevel } from '@/common/enums/file.enums';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { BulkFileOperationDto } from './bulk-file-operation.dto';

export class BulkUpdateAccessLevelDto extends BulkFileOperationDto {
  @ApiProperty({
    description: 'New access level for all files',
    enum: FileAccessLevel,
    example: FileAccessLevel.PUBLIC,
  })
  @IsEnum(FileAccessLevel)
  accessLevel: FileAccessLevel;
}
