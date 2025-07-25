import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  IsObject,
  IsUUID,
  Length,
  Min,
  Max,
} from 'class-validator';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { QuestionType, DifficultyLevel } from '@/common/enums/assessment.enums';

export class CreateQuestionBankDto {
  @ApiProperty({ description: 'Question text content' })
  @IsString()
  @Length(10, 5000)
  questionText: string;

  @ApiProperty({ description: 'Question type', enum: Object.values(QuestionType) })
  @IsEnum(QuestionType)
  questionType: QuestionType;

  @ApiPropertyOptional({ description: 'Question subject/category' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  subject?: string;

  @ApiPropertyOptional({ description: 'Question topic' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  topic?: string;

  @ApiPropertyOptional({ description: 'Question explanation' })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  explanation?: string;

  @ApiPropertyOptional({ description: 'Question difficulty', enum: Object.values(DifficultyLevel) })
  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficulty?: DifficultyLevel;

  @ApiPropertyOptional({ description: 'Default points', default: 1.0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.1)
  @Max(100)
  defaultPoints?: number;

  @ApiPropertyOptional({ description: 'Answer options for multiple choice' })
  @IsOptional()
  @IsArray()
  options?: any[];

  @ApiProperty({ description: 'Correct answer(s)' })
  correctAnswer: any;

  @ApiPropertyOptional({ description: 'Question tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'File attachments' })
  @IsOptional()
  @IsArray()
  attachments?: any[];

  @ApiPropertyOptional({ description: 'Usage frequency' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  usageCount?: number;

  @ApiPropertyOptional({ description: 'Question is active' })
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class QuestionBankQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search in question text' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by question type',
    enum: Object.values(QuestionType),
  })
  @IsOptional()
  @IsEnum(QuestionType)
  questionType?: QuestionType;

  @ApiPropertyOptional({
    description: 'Filter by difficulty',
    enum: Object.values(DifficultyLevel),
  })
  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficulty?: DifficultyLevel;

  @ApiPropertyOptional({ description: 'Filter by subject' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ description: 'Filter by topic' })
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiPropertyOptional({ description: 'Filter by tags (comma-separated)' })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional({ description: 'Filter by creator' })
  @IsOptional()
  @IsUUID()
  createdBy?: string;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  isActive?: boolean;
}
