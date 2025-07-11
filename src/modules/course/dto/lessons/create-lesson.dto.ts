import { LessonType } from '@/common/enums/course.enums';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateLessonDto {
  @ApiProperty({
    description: 'Lesson title',
    example: 'Introduction to Variables',
    minLength: 3,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({
    description: 'SEO-friendly slug (auto-generated if not provided)',
    example: 'introduction-to-variables',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  slug?: string;

  @ApiPropertyOptional({
    description: 'Lesson description',
    example: 'Learn about variables, data types, and declaration syntax',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description: 'Course ID this lesson belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  courseId: string;

  @ApiPropertyOptional({
    description: 'Section ID this lesson belongs to',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID()
  sectionId?: string;

  @ApiPropertyOptional({
    description: 'Lesson content (HTML/Markdown)',
    example: '<h1>Introduction</h1><p>Variables are...</p>',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: 'Video URL for video lessons',
    example: 'https://youtube.com/watch?v=abc123',
  })
  @IsOptional()
  @IsUrl()
  videoUrl?: string;

  @ApiPropertyOptional({
    description: 'Video duration in seconds',
    example: 1800,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  videoDuration?: number;

  @ApiPropertyOptional({
    description: 'Audio URL for audio lessons',
    example: 'https://soundcloud.com/track/123',
  })
  @IsOptional()
  @IsUrl()
  audioUrl?: string;

  @ApiProperty({
    description: 'Type of lesson content',
    enum: LessonType,
    example: LessonType.VIDEO,
  })
  @IsEnum(LessonType)
  lessonType: LessonType;

  @ApiPropertyOptional({
    description: 'Whether lesson is active and accessible',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @ApiPropertyOptional({
    description: 'Display order within section/course',
    example: 1,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @ApiPropertyOptional({
    description: 'Whether lesson is free preview',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPreview?: boolean = false;

  @ApiPropertyOptional({
    description: 'Whether lesson completion is mandatory',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean = false;

  @ApiPropertyOptional({
    description: 'Estimated duration in minutes',
    example: 30,
    minimum: 1,
    maximum: 480,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(480)
  estimatedDuration?: number;

  @ApiPropertyOptional({
    description: 'Points awarded for completion',
    example: 10,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  points?: number = 0;

  @ApiPropertyOptional({
    description: 'Lesson availability start date',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  availableFrom?: string;

  @ApiPropertyOptional({
    description: 'Lesson availability end date',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  availableUntil?: string;

  @ApiPropertyOptional({
    description: 'Lesson thumbnail image URL',
    example: 'https://example.com/thumbnail.jpg',
  })
  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @ApiPropertyOptional({
    description: 'Learning objectives for this lesson',
    example: ['Understand variables', 'Learn data types', 'Practice declaration'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  objectives?: string[];

  @ApiPropertyOptional({
    description: 'Prerequisites for this lesson',
    example: ['Basic programming knowledge', 'Completed intro course'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisites?: string[];

  @ApiPropertyOptional({
    description: 'Interactive elements configuration',
    example: {
      quizzes: [{ id: 1, title: 'Quick Check' }],
      polls: [],
      discussions: [],
      exercises: [],
    },
  })
  @IsOptional()
  @IsObject()
  interactiveElements?: {
    quizzes?: any[];
    polls?: any[];
    discussions?: any[];
    exercises?: any[];
  };

  @ApiPropertyOptional({
    description: 'Video transcript for accessibility',
    example: [
      {
        language: 'en',
        content: 'Hello and welcome...',
        timestamps: [{ time: 0, text: 'Hello and welcome' }],
      },
    ],
  })
  @IsOptional()
  @IsArray()
  transcript?: {
    language: string;
    content: string;
    timestamps?: { time: number; text: string }[];
  }[];

  @ApiPropertyOptional({
    description: 'Lesson settings and preferences',
    example: { allowComments: true, showProgress: true },
  })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Additional lesson metadata',
    example: { difficulty: 'beginner', tags: ['variables', 'basics'] },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
