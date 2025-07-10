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
  ArrayMaxSize,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { CourseLevel, CourseLanguage, CoursePricing } from '@/common/enums/course.enums';
import { Transform, Type } from 'class-transformer';

export class SEOMetaDto {
  @ApiPropertyOptional({ description: 'SEO title ' })
  @IsOptional() // Là lúc dữ liệu chạy
  @IsString()
  @MaxLength(60)
  title?: string; // ?: Cho typescript biết

  @ApiPropertyOptional({ description: 'SEO description' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  description?: string;

  @ApiPropertyOptional({ description: 'SEO keywords', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true }) // tất cả phần tử trong mảng phải là string
  keyword?: string[];

  @ApiPropertyOptional({ description: 'Open Graph image URL' })
  @IsOptional()
  @IsUrl()
  osImage?: string;
}

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
  @Transform(
    ({ value }) =>
      value
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-') // [^] phủ định
        .replace(/-+/g, '-'), // gộp nhiều - liền kề thành 1 -
  )
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
  level?: CourseLevel = CourseLevel.BEGINNER;

  @ApiPropertyOptional({
    description: 'Course language',
    enum: CourseLanguage,
    default: CourseLanguage.ENGLISH,
  })
  @IsOptional()
  @IsEnum(CourseLanguage, { message: 'Invalid course language' })
  language?: CourseLanguage = CourseLanguage.ENGLISH;

  @ApiPropertyOptional({
    description: 'Course duration in hours',
    example: 40,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Duration hours must be a number' })
  @Min(0, { message: 'Duration hours cannot be negative' })
  durationHours?: number;

  @ApiPropertyOptional({
    description: 'Course duration in minutes',
    example: 30,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Duration minutes must be a number' })
  @Min(0, { message: 'Duration minutes cannot be negative' })
  durationMinutes?: number;

  @ApiPropertyOptional({
    description: 'Course price',
    example: 99.99,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Price must be a number' })
  @Min(0, { message: 'Price cannot be negative' })
  price?: number = 0;

  @ApiPropertyOptional({
    description: 'Price currency',
    example: 'USD',
    default: 'USD',
  })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string = 'USD';

  @ApiPropertyOptional({
    description: 'Original price before discount',
    example: 149.99,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  originalPrice?: number = 0;

  @ApiPropertyOptional({
    description: 'Is course free',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isFree?: boolean = false;

  @ApiPropertyOptional({
    description: 'Course tags',
    example: ['javascript', 'web-development', 'programming'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20, { message: 'Maximum 20 tags allowed' })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Course requirements',
    example: ['Basic computer knowledge', 'Internet connection'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requirements?: string[];

  @ApiPropertyOptional({
    description: 'What students will learn',
    example: ['Build real-world projects', 'Master JavaScript fundamentals'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  whatYouWillLearn?: string[];

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
    description: 'Maximum enrollment limit',
    example: 100,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Enrollment limit must be a number' })
  @Min(1, { message: 'Enrollment limit must be at least 1' })
  enrollmentLimit?: number;

  @ApiPropertyOptional({
    description: 'Course availability start date',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  availableFrom?: string;

  @ApiPropertyOptional({
    description: 'Course availability end date',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  availableUntil?: string;

  @ApiPropertyOptional({
    description: 'Is featured course',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  featured?: boolean = false; // khóa học nổi bật

  @ApiPropertyOptional({
    description: 'SEO metadata',
    type: SEOMetaDto,
  })
  @IsOptional()
  @ValidateNested() // cần validate theo DTO con SEOMetaDto
  @Type(() => SEOMetaDto)
  seoMeta?: SEOMetaDto;

  @ApiPropertyOptional({
    description: 'Course settings',
    example: { allowComments: true, enableCertificate: true },
  })
  @IsOptional()
  settings?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Course pricing model',
    enum: CoursePricing,
    default: CoursePricing.FREE,
  })
  @IsOptional()
  @IsEnum(CoursePricing, { message: 'Invalid pricing model' })
  pricingModel?: CoursePricing;

  @ApiPropertyOptional({
    description: 'Target audience',
    example: ['Beginner programmers', 'Web development enthusiasts'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetAudience?: string[];

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
