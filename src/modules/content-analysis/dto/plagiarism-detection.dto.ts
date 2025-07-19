import { IsString, IsOptional, IsEnum, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CheckPlagiarismDto {
  @ApiProperty({
    description: 'Content type to check',
    enum: ['course', 'lesson', 'assignment', 'forum_post'],
  })
  @IsEnum(['course', 'lesson', 'assignment', 'forum_post'])
  contentType: 'course' | 'lesson' | 'assignment' | 'forum_post';

  @ApiProperty({ description: 'Content ID' })
  @IsString()
  contentId: string;

  @ApiPropertyOptional({ description: 'Check against web sources' })
  @IsOptional()
  @IsBoolean()
  checkWebSources?: boolean = true;

  @ApiPropertyOptional({ description: 'Check against academic sources' })
  @IsOptional()
  @IsBoolean()
  checkAcademicSources?: boolean = true;

  @ApiPropertyOptional({ description: 'Check against internal content' })
  @IsOptional()
  @IsBoolean()
  checkInternalContent?: boolean = true;

  @ApiPropertyOptional({ description: 'Check against student submissions' })
  @IsOptional()
  @IsBoolean()
  checkStudentSubmissions?: boolean = false;

  @ApiPropertyOptional({
    description: 'Sensitivity level',
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  sensitivityLevel?: 'low' | 'medium' | 'high' = 'medium';

  @ApiPropertyOptional({ description: 'Sources to exclude from checking', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludedSources?: string[];

  @ApiPropertyOptional({ description: 'Force new scan even if recent check exists' })
  @IsOptional()
  @IsBoolean()
  forceNewScan?: boolean = false;
}

export class BulkPlagiarismCheckDto {
  @ApiProperty({
    description: 'Content type to check',
    enum: ['course', 'lesson', 'assignment', 'forum_post'],
  })
  @IsEnum(['course', 'lesson', 'assignment', 'forum_post'])
  contentType: 'course' | 'lesson' | 'assignment' | 'forum_post';

  @ApiProperty({ description: 'Content IDs to check', type: [String] })
  @IsArray()
  @IsString({ each: true })
  contentIds: string[];

  @ApiPropertyOptional({ description: 'Check against web sources' })
  @IsOptional()
  @IsBoolean()
  checkWebSources?: boolean = true;

  @ApiPropertyOptional({ description: 'Check against academic sources' })
  @IsOptional()
  @IsBoolean()
  checkAcademicSources?: boolean = true;

  @ApiPropertyOptional({ description: 'Check against internal content' })
  @IsOptional()
  @IsBoolean()
  checkInternalContent?: boolean = true;

  @ApiPropertyOptional({
    description: 'Sensitivity level',
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  sensitivityLevel?: 'low' | 'medium' | 'high' = 'medium';
}

export class PlagiarismQueryDto {
  @ApiPropertyOptional({
    description: 'Content type filter',
    enum: ['course', 'lesson', 'assignment', 'forum_post'],
  })
  @IsOptional()
  @IsEnum(['course', 'lesson', 'assignment', 'forum_post'])
  contentType?: 'course' | 'lesson' | 'assignment' | 'forum_post';

  @ApiPropertyOptional({ description: 'Content ID filter' })
  @IsOptional()
  @IsString()
  contentId?: string;

  @ApiPropertyOptional({
    description: 'Status filter',
    enum: ['pending', 'scanning', 'completed', 'failed'],
  })
  @IsOptional()
  @IsEnum(['pending', 'scanning', 'completed', 'failed'])
  status?: 'pending' | 'scanning' | 'completed' | 'failed';

  @ApiPropertyOptional({
    description: 'Plagiarism level filter',
    enum: ['none', 'low', 'moderate', 'high', 'severe'],
  })
  @IsOptional()
  @IsEnum(['none', 'low', 'moderate', 'high', 'severe'])
  plagiarismLevel?: 'none' | 'low' | 'moderate' | 'high' | 'severe';

  @ApiPropertyOptional({ description: 'Initiated by user ID' })
  @IsOptional()
  @IsString()
  initiatedBy?: string;

  @ApiPropertyOptional({
    description: 'Sort by scan completion date',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortByDate?: 'asc' | 'desc' = 'desc';
}
