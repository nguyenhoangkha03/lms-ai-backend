import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TagCategory, TagType } from '../entities/content-tag.entity';
import { SimilarityType, SimilarityStatus } from '../entities/content-similarity.entity';
import { QualityLevel } from '../entities/content-quality-assessment.entity';
import { QuizGenerationStatus } from '../entities/generated-quiz.entity';
import { PlagiarismStatus, PlagiarismLevel } from '../entities/plagiarism-check.entity';

export class ContentTagResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  contentType: 'course' | 'lesson';

  @ApiProperty()
  contentId: string;

  @ApiProperty()
  tag: string;

  @ApiProperty({ enum: TagCategory })
  category: TagCategory;

  @ApiProperty({ enum: TagType })
  type: TagType;

  @ApiProperty()
  confidence: number;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  isVerified: boolean;

  @ApiPropertyOptional()
  verifiedBy?: string;

  @ApiPropertyOptional()
  verifiedAt?: Date;

  @ApiPropertyOptional()
  metadata?: any;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class SimilarityResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  sourceContentType: 'course' | 'lesson';

  @ApiProperty()
  sourceContentId: string;

  @ApiProperty()
  targetContentType: 'course' | 'lesson';

  @ApiProperty()
  targetContentId: string;

  @ApiProperty({ enum: SimilarityType })
  similarityType: SimilarityType;

  @ApiProperty()
  similarityScore: number;

  @ApiProperty({ enum: SimilarityStatus })
  status: SimilarityStatus;

  @ApiPropertyOptional()
  calculatedAt?: Date;

  @ApiPropertyOptional()
  analysis?: any;

  @ApiPropertyOptional()
  metadata?: any;
}

export class QualityAssessmentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  contentType: 'course' | 'lesson';

  @ApiProperty()
  contentId: string;

  @ApiProperty()
  overallScore: number;

  @ApiProperty({ enum: QualityLevel })
  qualityLevel: QualityLevel;

  @ApiProperty()
  assessedAt: Date;

  @ApiProperty()
  isLatest: boolean;

  @ApiProperty()
  dimensionScores: {
    clarity: number;
    coherence: number;
    completeness: number;
    accuracy: number;
    engagement: number;
    accessibility: number;
    structure: number;
    relevance: number;
  };

  @ApiPropertyOptional()
  analysis?: any;

  @ApiPropertyOptional()
  improvements?: any[];

  @ApiPropertyOptional()
  metadata?: any;
}

export class GeneratedQuizResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  lessonId: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ enum: QuizGenerationStatus })
  status: QuizGenerationStatus;

  @ApiProperty()
  questionCount: number;

  @ApiProperty()
  difficultyLevel: 'easy' | 'medium' | 'hard';

  @ApiPropertyOptional()
  timeLimit?: number;

  @ApiPropertyOptional()
  qualityScore?: number;

  @ApiProperty()
  questions: any[];

  @ApiPropertyOptional()
  review?: any;

  @ApiPropertyOptional()
  generationAnalysis?: any;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PlagiarismCheckResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  contentType: 'course' | 'lesson' | 'assignment' | 'forum_post';

  @ApiProperty()
  contentId: string;

  @ApiProperty({ enum: PlagiarismStatus })
  status: PlagiarismStatus;

  @ApiPropertyOptional()
  overallSimilarity?: number;

  @ApiPropertyOptional({ enum: PlagiarismLevel })
  plagiarismLevel?: PlagiarismLevel;

  @ApiProperty()
  sourcesChecked: number;

  @ApiProperty()
  matchesFound: number;

  @ApiPropertyOptional()
  scanStartedAt?: Date;

  @ApiPropertyOptional()
  scanCompletedAt?: Date;

  @ApiPropertyOptional()
  matches?: any[];

  @ApiPropertyOptional()
  analysis?: any;

  @ApiPropertyOptional()
  metadata?: any;

  @ApiProperty()
  createdAt: Date;
}
