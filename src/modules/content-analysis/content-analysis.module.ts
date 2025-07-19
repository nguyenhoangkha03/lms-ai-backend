import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';

// Entities
import { ContentTag } from './entities/content-tag.entity';
import { ContentSimilarity } from './entities/content-similarity.entity';
import { ContentQualityAssessment } from './entities/content-quality-assessment.entity';
import { GeneratedQuiz } from './entities/generated-quiz.entity';
import { PlagiarismCheck } from './entities/plagiarism-check.entity';

// Controllers
import { ContentAnalysisController } from './controllers/content-analysis.controller';
import { ContentTaggingController } from './controllers/content-tagging.controller';
import { SimilarityDetectionController } from './controllers/similarity-detection.controller';
import { QualityAssessmentController } from './controllers/quality-assessment.controller';
import { QuizGenerationController } from './controllers/quiz-generation.controller';
import { PlagiarismDetectionController } from './controllers/plagiarism-detection.controller';

// Services
import { ContentTaggingService } from './services/content-tagging.service';
import { SimilarityDetectionService } from './services/similarity-detection.service';
import { ContentQualityAssessmentService } from './services/content-quality-assessment.service';
import { QuizGenerationService } from './services/quiz-generation.service';
import { PlagiarismDetectionService } from './services/plagiarism-detection.service';

// Processors
import { ContentAnalysisProcessor } from './processors/content-analysis.processor';
import { TagGenerationProcessor } from './processors/tag-generation.processor';
import { SimilarityAnalysisProcessor } from './processors/similarity-analysis.processor';
import { QualityAssessmentProcessor } from './processors/quality-assessment.processor';
import { QuizGenerationProcessor } from './processors/quiz-generation.processor';
import { PlagiarismCheckProcessor } from './processors/plagiarism-check.processor';

// External modules
import { AiModule } from '../ai/ai.module';
import { CourseModule } from '../course/course.module';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { CustomCacheModule } from '../../cache/cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ContentTag,
      ContentSimilarity,
      ContentQualityAssessment,
      GeneratedQuiz,
      PlagiarismCheck,
    ]),
    BullModule.registerQueue(
      {
        name: 'content-analysis',
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      },
      {
        name: 'tag-generation',
        defaultJobOptions: {
          removeOnComplete: 50,
          removeOnFail: 25,
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 3000,
          },
        },
      },
      {
        name: 'similarity-analysis',
        defaultJobOptions: {
          removeOnComplete: 200,
          removeOnFail: 100,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      },
      {
        name: 'quality-assessment',
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      },
      {
        name: 'quiz-generation',
        defaultJobOptions: {
          removeOnComplete: 50,
          removeOnFail: 25,
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      },
      {
        name: 'plagiarism-check',
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 3000,
          },
        },
      },
    ),
    CustomCacheModule,
    forwardRef(() => AiModule),
    forwardRef(() => CourseModule),
    forwardRef(() => UserModule),
    AuthModule,
  ],
  controllers: [
    ContentAnalysisController,
    ContentTaggingController,
    SimilarityDetectionController,
    QualityAssessmentController,
    QuizGenerationController,
    PlagiarismDetectionController,
  ],
  providers: [
    // Core Services
    ContentTaggingService,
    SimilarityDetectionService,
    ContentQualityAssessmentService,
    QuizGenerationService,
    PlagiarismDetectionService,

    // Processors
    ContentAnalysisProcessor,
    TagGenerationProcessor,
    SimilarityAnalysisProcessor,
    QualityAssessmentProcessor,
    QuizGenerationProcessor,
    PlagiarismCheckProcessor,
  ],
  exports: [
    TypeOrmModule,
    ContentTaggingService,
    SimilarityDetectionService,
    ContentQualityAssessmentService,
    QuizGenerationService,
    PlagiarismDetectionService,
  ],
})
export class ContentAnalysisModule {}
