import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class BulkFileOperationDto {
  @ApiProperty({
    description: 'File IDs to operate on',
    example: ['123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174001'],
    type: [String],
  })
  @IsArray()
  @IsUUID(undefined, { each: true })
  fileIds: string[];
}
