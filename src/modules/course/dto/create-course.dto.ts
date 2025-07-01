import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  MinLength,
  MaxLength,
  Min,
  IsUrl,
  IsUUID,
} from 'class-validator';
import { CourseLevel, CourseLanguage, CoursePricing } from '@/common/enums/course.enums';

export class CreateCourseDto {
  @ApiProperty({
    description: 'Course title',
    example: 'Complete JavaScript Masterclass',
    minLength: 5,
    maxLength: 255,
  })
  @IsString()
  @MinLength(5, { message: 'Course title must be at least 5 characters long' })
  @MaxLength(255, { message: 'Course title must not exceed 255 characters' })
  title: string;

  @ApiProperty({
    description: 'URL-friendly slug',
    example: 'complete-javascript-masterclass',
  })
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  slug: string;

  @ApiProperty({
    description: 'Course description',
    example: 'Learn JavaScript from beginner to advanced level with hands-on projects',
  })
  @IsString()
  @MinLength(20, { message: 'Course description must be at least 20 characters long' })
  description: string;

  @ApiPropertyOptional({
    description: 'Short description for previews',
    example: 'Master JavaScript with practical examples and projects',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  shortDescription?: string;

  @ApiProperty({
    description: 'Course category ID',
    example: 'uuid-category-id',
  })
  @IsUUID(4, { message: 'Category ID must be a valid UUID' })
  categoryId: string;

  @ApiPropertyOptional({
    description: 'Course difficulty level',
    enum: CourseLevel,
    default: CourseLevel.BEGINNER,
  })
  @IsOptional()
  @IsEnum(CourseLevel, { message: 'Invalid course level' })
  level?: CourseLevel;

  @ApiPropertyOptional({
    description: 'Course language',
    enum: CourseLanguage,
    default: CourseLanguage.ENGLISH,
  })
  @IsOptional()
  @IsEnum(CourseLanguage, { message: 'Invalid course language' })
  language?: CourseLanguage;

  @ApiPropertyOptional({
    description: 'Course duration in hours',
    example: 40,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Duration hours must be a number' })
  @Min(0, { message: 'Duration hours cannot be negative' })
  durationHours?: number;

  @ApiPropertyOptional({
    description: 'Course duration in minutes',
    example: 30,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Duration minutes must be a number' })
  @Min(0, { message: 'Duration minutes cannot be negative' })
  durationMinutes?: number;

  @ApiPropertyOptional({
    description: 'Course price',
    example: 99.99,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Price must be a number' })
  @Min(0, { message: 'Price cannot be negative' })
  price?: number;

  @ApiPropertyOptional({
    description: 'Price currency',
    example: 'USD',
    default: 'USD',
  })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({
    description: 'Is course free',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isFree?: boolean;

  @ApiPropertyOptional({
    description: 'Course pricing model',
    enum: CoursePricing,
    default: CoursePricing.FREE,
  })
  @IsOptional()
  @IsEnum(CoursePricing, { message: 'Invalid pricing model' })
  pricingModel?: CoursePricing;

  @ApiPropertyOptional({
    description: 'Course thumbnail URL',
    example: 'https://example.com/thumbnail.jpg',
  })
  @IsOptional()
  @IsUrl({}, { message: 'Thumbnail URL must be a valid URL' })
  thumbnailUrl?: string;

  @ApiPropertyOptional({
    description: 'Course trailer video URL',
    example: 'https://example.com/trailer.mp4',
  })
  @IsOptional()
  @IsUrl({}, { message: 'Trailer video URL must be a valid URL' })
  trailerVideoUrl?: string;

  @ApiPropertyOptional({
    description: 'Course tags',
    example: ['javascript', 'programming', 'web-development'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Course requirements',
    example: ['Basic computer skills', 'Text editor installed'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requirements?: string[];

  @ApiPropertyOptional({
    description: 'What students will learn',
    example: ['JavaScript fundamentals', 'DOM manipulation', 'ES6+ features'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  whatYouWillLearn?: string[];

  @ApiPropertyOptional({
    description: 'Target audience',
    example: ['Beginner programmers', 'Web development enthusiasts'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetAudience?: string[];

  @ApiPropertyOptional({
    description: 'Maximum enrollment limit',
    example: 100,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Enrollment limit must be a number' })
  @Min(1, { message: 'Enrollment limit must be at least 1' })
  enrollmentLimit?: number;

  @ApiPropertyOptional({
    description: 'Allow course reviews',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  allowReviews?: boolean;

  @ApiPropertyOptional({
    description: 'Allow course discussions',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  allowDiscussions?: boolean;

  @ApiPropertyOptional({
    description: 'Course has completion certificate',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  hasCertificate?: boolean;

  @ApiPropertyOptional({
    description: 'Lifetime access to course',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  lifetimeAccess?: boolean;

  @ApiPropertyOptional({
    description: 'Access duration in days (if not lifetime)',
    example: 365,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Access duration must be a number' })
  @Min(1, { message: 'Access duration must be at least 1 day' })
  accessDuration?: number;
}
