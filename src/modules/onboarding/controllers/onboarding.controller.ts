import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { OnboardingService } from '../services/onboarding.service';
import { SkillAssessmentService } from '../services/skill-assessment.service';
import { LearningPathService } from '../services/learning-path.service';
import {
  OnboardingProgressDto,
  UpdateOnboardingProgressDto,
  SkillAssessmentSubmissionDto,
  LearningPreferencesDto,
  SelectLearningPathDto,
  SkipOnboardingStepDto,
} from '../dto/onboarding.dto';

@ApiTags('Onboarding')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('onboarding')
export class OnboardingController {
  constructor(
    private readonly onboardingService: OnboardingService,
    private readonly skillAssessmentService: SkillAssessmentService,
    private readonly learningPathService: LearningPathService,
  ) {}

  @Get('progress')
  @ApiOperation({ summary: 'Get student onboarding progress' })
  @ApiResponse({ status: 200, description: 'Onboarding progress retrieved successfully' })
  async getOnboardingProgress(@CurrentUser('id') userId: string): Promise<OnboardingProgressDto> {
    return this.onboardingService.getOnboardingProgress(userId);
  }

  @Put('progress')
  @ApiOperation({ summary: 'Update onboarding progress' })
  @ApiResponse({ status: 200, description: 'Progress updated successfully' })
  async updateOnboardingProgress(
    @CurrentUser('id') userId: string,
    @Body() updateDto: UpdateOnboardingProgressDto,
  ): Promise<OnboardingProgressDto> {
    return this.onboardingService.updateProgress(userId, updateDto);
  }

  @Get('skill-assessment')
  @ApiOperation({ summary: 'Get general skill assessment questions' })
  @ApiResponse({ status: 200, description: 'Assessment questions retrieved successfully' })
  async getSkillAssessment(@CurrentUser('id') userId: string) {
    return this.skillAssessmentService.getAssessmentQuestions(userId);
  }

  @Get('skill-assessment/:categoryId')
  @ApiOperation({ summary: 'Get skill assessment questions by category' })
  @ApiResponse({ status: 200, description: 'Category-specific assessment questions retrieved successfully' })
  async getSkillAssessmentByCategory(
    @CurrentUser('id') userId: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.skillAssessmentService.getAssessmentQuestionsByCategory(userId, categoryId);
  }

  @Post('skill-assessment/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit skill assessment answers with category context' })
  @ApiResponse({ status: 200, description: 'Assessment submitted successfully' })
  async submitSkillAssessment(
    @CurrentUser('id') userId: string,
    @Body() submissionDto: SkillAssessmentSubmissionDto & { categoryId?: string },
  ) {
    return this.skillAssessmentService.submitAssessmentWithCategory(userId, submissionDto);
  }

  @Get('skill-assessment/result/:id')
  @ApiOperation({ summary: 'Get assessment result by ID' })
  @ApiResponse({ status: 200, description: 'Assessment result retrieved successfully' })
  async getAssessmentResult(
    @CurrentUser('id') userId: string,
    @Param('id') assessmentId: string,
  ) {
    return this.skillAssessmentService.getAssessmentResult(userId, assessmentId);
  }

  @Post('preferences')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save learning preferences' })
  @ApiResponse({ status: 200, description: 'Preferences saved successfully' })
  async saveLearningPreferences(
    @CurrentUser('id') userId: string,
    @Body() preferencesDto: LearningPreferencesDto,
  ) {
    return this.onboardingService.saveLearningPreferences(userId, preferencesDto);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get learning preferences' })
  @ApiResponse({ status: 200, description: 'Preferences retrieved successfully' })
  async getLearningPreferences(@CurrentUser('id') userId: string) {
    return this.onboardingService.getLearningPreferences(userId);
  }

  @Get('learning-paths/recommended')
  @ApiOperation({ summary: 'Get AI-recommended learning paths' })
  @ApiResponse({ status: 200, description: 'Recommended paths retrieved successfully' })
  async getRecommendedLearningPaths(@CurrentUser('id') userId: string) {
    return this.learningPathService.getRecommendedPaths(userId);
  }

  @Get('learning-paths')
  @ApiOperation({ summary: 'Get all available learning paths' })
  @ApiResponse({ status: 200, description: 'Learning paths retrieved successfully' })
  async getAllLearningPaths() {
    return this.learningPathService.getAllPaths();
  }

  @Post('learning-paths/select')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Select a learning path' })
  @ApiResponse({ status: 200, description: 'Learning path selected successfully' })
  async selectLearningPath(
    @CurrentUser('id') userId: string,
    @Body() selectionDto: SelectLearningPathDto,
  ) {
    return this.learningPathService.selectPath(userId, selectionDto);
  }

  @Post('complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete onboarding process' })
  @ApiResponse({ status: 200, description: 'Onboarding completed successfully' })
  async completeOnboarding(@CurrentUser('id') userId: string) {
    return this.onboardingService.completeOnboarding(userId);
  }

  @Post('skip-step')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Skip an onboarding step' })
  @ApiResponse({ status: 200, description: 'Step skipped successfully' })
  async skipOnboardingStep(
    @CurrentUser('id') userId: string,
    @Body() skipDto: SkipOnboardingStepDto,
  ) {
    return this.onboardingService.skipStep(userId, skipDto);
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset onboarding progress' })
  @ApiResponse({ status: 200, description: 'Onboarding reset successfully' })
  async resetOnboarding(@CurrentUser('id') userId: string) {
    return this.onboardingService.resetOnboarding(userId);
  }
}