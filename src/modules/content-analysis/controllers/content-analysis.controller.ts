import { Controller, Get, UseGuards, HttpStatus, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ContentTaggingService } from '../services/content-tagging.service';
import { SimilarityDetectionService } from '../services/similarity-detection.service';
import { ContentQualityAssessmentService } from '../services/content-quality-assessment.service';
import { QuizGenerationService } from '../services/quiz-generation.service';
import { PlagiarismDetectionService } from '../services/plagiarism-detection.service';

@ApiTags('Content Analysis - Overview')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('content-analysis')
export class ContentAnalysisController {
  constructor(
    private readonly contentTaggingService: ContentTaggingService,
    private readonly similarityDetectionService: SimilarityDetectionService,
    private readonly qualityAssessmentService: ContentQualityAssessmentService,
    private readonly quizGenerationService: QuizGenerationService,
    private readonly plagiarismDetectionService: PlagiarismDetectionService,
  ) {}

  @Get('dashboard')
  @Roles('teacher', 'admin')
  @ApiOperation({ summary: 'Get content analysis dashboard data' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Dashboard data retrieved successfully' })
  async getDashboard(@Query('contentType') contentType?: 'course' | 'lesson'): Promise<any> {
    const [qualityStats, plagiarismStats] = await Promise.all([
      this.qualityAssessmentService.getQualityStatistics(contentType),
      this.plagiarismDetectionService.getPlagiarismStatistics(),
    ]);

    return {
      qualityAssessment: qualityStats,
      plagiarismDetection: plagiarismStats,
      summary: {
        totalContentAnalyzed: qualityStats.totalAssessments + plagiarismStats.totalChecks,
        averageQualityScore: qualityStats.averageScore,
        averagePlagiarismScore: plagiarismStats.averageSimilarity,
      },
    };
  }

  @Get('content/:contentType/:contentId/analysis')
  @ApiOperation({ summary: 'Get comprehensive analysis for specific content' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Content analysis retrieved successfully' })
  async getContentAnalysis(
    @Query('contentType') contentType: 'course' | 'lesson',
    @Query('contentId') contentId: string,
  ): Promise<any> {
    const [tags, similarContent, qualityTrends] = await Promise.all([
      this.contentTaggingService.getTagsByContent(contentType, contentId),
      this.similarityDetectionService.getSimilarContent(contentType, contentId, 5),
      this.qualityAssessmentService.getContentQualityTrends(contentType, contentId, 5),
    ]);

    return {
      contentId,
      contentType,
      tags,
      similarContent,
      qualityTrends,
      latestQuality: qualityTrends[0] || null,
    };
  }
}
