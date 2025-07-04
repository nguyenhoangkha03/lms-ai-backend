import { IsOptional, IsString, IsEnum, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { LearningStyle, DifficultyPreference } from '@/common/enums/user.enums';

export class UpdateStudentProfileDto {
  @ApiPropertyOptional({ description: 'Education level', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  educationLevel?: string;

  @ApiPropertyOptional({ description: 'Field of study', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fieldOfStudy?: string;

  @ApiPropertyOptional({ description: 'Learning goals', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  learningGoals?: string;

  @ApiPropertyOptional({ enum: LearningStyle, description: 'Preferred learning style' })
  @IsOptional()
  @IsEnum(LearningStyle)
  preferredLearningStyle?: LearningStyle;

  @ApiPropertyOptional({ description: 'Study time preference', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  studyTimePreference?: string;

  @ApiPropertyOptional({ enum: DifficultyPreference, description: 'Difficulty preference' })
  @IsOptional()
  @IsEnum(DifficultyPreference)
  difficultyPreference?: DifficultyPreference;

  @ApiPropertyOptional({ description: 'Motivation factors', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  motivationFactors?: string;
}
