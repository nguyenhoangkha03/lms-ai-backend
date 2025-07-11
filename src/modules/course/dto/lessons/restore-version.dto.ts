import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
export class RestoreVersionDto {
  @ApiProperty({
    description: 'Version number to restore',
    example: 3,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  versionNumber: number;

  @ApiPropertyOptional({
    description: 'Reason for restoration',
    example: 'Reverting unwanted changes',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
