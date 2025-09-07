import { IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateVideoPositionDto {
  @ApiProperty({ description: 'Lesson ID' })
  @IsString()
  lessonId: string;

  @ApiProperty({ description: 'Current video position in seconds' })
  @IsNumber()
  @Min(0)
  position: number;

  @ApiProperty({ description: 'Total video duration in seconds' })
  @IsNumber()
  @Min(0)
  duration: number;
}