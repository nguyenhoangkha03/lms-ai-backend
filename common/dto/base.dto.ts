import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString } from 'class-validator';

export class BaseDto {
  @ApiProperty({ description: 'Record ID', example: '1' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  @IsOptional()
  @IsDateString()
  createdAt?: Date;

  @ApiProperty({ description: 'Update timestamp' })
  @IsOptional()
  @IsDateString()
  updatedAt?: Date;
}
