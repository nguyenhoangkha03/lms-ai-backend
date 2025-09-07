import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentProfile } from '@/modules/user/entities/student-profile.entity';
import { User } from '@/modules/user/entities/user.entity';
import {
  OnboardingProgressDto,
  UpdateOnboardingProgressDto,
  LearningPreferencesDto,
  SkipOnboardingStepDto,
  StudyTimePreference,
  DifficultyPreference,
} from '../dto/onboarding.dto';
import { DifficultyLevel, LearningStyle } from '@/common/enums/user.enums';
import { WinstonService } from '@/logger/winston.service';
import { AuthService } from '@/modules/auth/services/auth.service';
import { UserService } from '@/modules/user/services/user.service';

@Injectable()
export class OnboardingService {
  constructor(
    @InjectRepository(StudentProfile)
    private readonly studentProfileRepository: Repository<StudentProfile>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly logger: WinstonService,
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {
    this.logger.setContext(OnboardingService.name);
  }

  async getOnboardingProgress(userId: string): Promise<OnboardingProgressDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['studentProfile'],
    });

    if (!user || !user.studentProfile) {
      throw new NotFoundException('Student profile not found');
    }

    const studentProfile = user.studentProfile;

    // Define the onboarding steps (Updated to 5 steps)
    const totalSteps = 5;
    const completedSteps: string[] = [];
    let currentStep = 1;

    // Check if onboarding is already completed
    const onboardingCompleted = studentProfile.onboardingCompleted || false;
    
    // If onboarding is completed, return all steps as completed
    if (onboardingCompleted) {
      completedSteps.push('welcome', 'category-selection', 'skill-assessment', 'preferences-setup', 'learning-path-selection');
      currentStep = totalSteps;
    } else {
      // For incomplete onboarding, check each step individually based on explicit completion flags
      const analyticsData = studentProfile.analyticsData || {};

      // Check steps in order - only advance if previous steps are completed
      // Step 1: Welcome - check if explicitly completed
      if (analyticsData.welcomeCompleted) {
        completedSteps.push('welcome');
        currentStep = 2;
        
        // Step 2: Category selection - check if category is selected
        if (analyticsData.selectedCategory) {
          completedSteps.push('category-selection');
          currentStep = 3;
          
          // Step 3: Skill assessment - only check if step 2 is complete
          const skillAssessmentCompleted = analyticsData.skillAssessmentCompleted || false;
          if (skillAssessmentCompleted) {
            completedSteps.push('skill-assessment');
            currentStep = 4;
            
            // Step 4: Learning preferences - only check if step 3 is complete
            if (analyticsData.preferencesSetupCompleted) {
              completedSteps.push('preferences-setup');
              currentStep = 5;
              
              // Step 5: Learning path selection - only check if step 4 is complete
              const learningPathSelected = analyticsData.learningPathSelected || false;
              if (learningPathSelected) {
                completedSteps.push('learning-path-selection');
                currentStep = totalSteps;
              }
            }
          }
        }
      }
    }

    // Check data for frontend display
    const skillAssessmentCompleted = studentProfile.analyticsData?.skillAssessmentCompleted || false;
    const preferencesSetup = !!(
      studentProfile.preferredLearningStyle &&
      studentProfile.studyTimePreference &&
      studentProfile.difficultyPreference
    );
    const learningPathSelected = studentProfile.analyticsData?.learningPathSelected || false;

    return {
      studentId: userId,
      currentStep,
      totalSteps,
      completedSteps,
      skillAssessmentCompleted,
      preferencesSetup,
      learningPathSelected,
      onboardingCompleted,
      completedAt: onboardingCompleted ? studentProfile.updatedAt?.toISOString() : undefined,
    };
  }

  async updateProgress(
    userId: string,
    updateDto: UpdateOnboardingProgressDto,
  ): Promise<OnboardingProgressDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['studentProfile'],
    });

    if (!user || !user.studentProfile) {
      throw new NotFoundException('Student profile not found');
    }

    const studentProfile = user.studentProfile;

    // Update analytics data based on step
    const analyticsData = studentProfile.analyticsData || {};

    switch (updateDto.step) {
      case 1:
        // Welcome step completed
        analyticsData.welcomeCompleted = true;
        break;
      case 2:
        // Category selection completed
        if (updateDto.data?.selectedCategory) {
          analyticsData.selectedCategory = updateDto.data.selectedCategory;
        }
        break;
      case 3:
        // Skill assessment completed
        analyticsData.skillAssessmentCompleted = true;
        if (updateDto.data?.assessmentResults) {
          analyticsData.skillAssessmentResults = updateDto.data.assessmentResults;
        }
        break;
      case 4:
        // Preferences setup completed
        analyticsData.preferencesSetupCompleted = true;
        if (updateDto.data?.preferences) {
          // Save preferences data directly to student profile
          const learningPreferences = studentProfile.learningPreferences || {};
          learningPreferences.sessionDuration = updateDto.data.preferences.sessionDuration;
          
          await this.studentProfileRepository.update(studentProfile.id, {
            preferredLearningStyle: updateDto.data.preferences.preferredLearningStyle,
            studyTimePreference: updateDto.data.preferences.studyTimePreference,
            difficultyPreference: updateDto.data.preferences.difficultyPreference,
            learningPreferences: learningPreferences,
          });
        }
        break;
      case 5:
        // Learning path selection completed
        analyticsData.learningPathSelected = true;
        if (updateDto.data?.selectedPath) {
          analyticsData.selectedLearningPath = updateDto.data.selectedPath;
        }
        break;
    }

    // Update student profile
    await this.studentProfileRepository.update(studentProfile.id, {
      analyticsData: analyticsData as any,
      lastActivityAt: new Date(),
    });

    this.logger.log(`Onboarding progress updated for user ${userId}, step ${updateDto.step}`);

    return this.getOnboardingProgress(userId);
  }

  async saveLearningPreferences(
    userId: string,
    preferencesDto: LearningPreferencesDto,
  ): Promise<LearningPreferencesDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['studentProfile'],
    });

    if (!user || !user.studentProfile) {
      throw new NotFoundException('Student profile not found');
    }

    const studentProfile = user.studentProfile;

    // Map DTO enums to entity enums
    let difficultyLevel: DifficultyLevel;
    switch (preferencesDto.difficultyPreference) {
      case 'beginner':
        difficultyLevel = DifficultyLevel.BEGINNER;
        break;
      case 'intermediate':
        difficultyLevel = DifficultyLevel.INTERMEDIATE;
        break;
      case 'advanced':
        difficultyLevel = DifficultyLevel.ADVANCED;
        break;
      case 'mixed':
        difficultyLevel = DifficultyLevel.INTERMEDIATE; // Default for mixed
        break;
      default:
        difficultyLevel = DifficultyLevel.BEGINNER;
    }

    // Map learning style from DTO to entity enum
    let learningStyleEnum: LearningStyle;
    switch (preferencesDto.preferredLearningStyle) {
      case 'visual':
        learningStyleEnum = LearningStyle.VISUAL;
        break;
      case 'auditory':
        learningStyleEnum = LearningStyle.AUDITORY;
        break;
      case 'kinesthetic':
        learningStyleEnum = LearningStyle.KINESTHETIC;
        break;
      case 'reading':
        learningStyleEnum = LearningStyle.READING;
        break;
      default:
        learningStyleEnum = LearningStyle.VISUAL;
    }

    // Update learning preferences - convert to plain object for JSON storage
    const learningPreferences = {
      learningStyle: preferencesDto.preferredLearningStyle as string,
      studyTimePreference: preferencesDto.studyTimePreference as string, 
      sessionDuration: preferencesDto.sessionDuration,
      difficultyPreference: preferencesDto.difficultyPreference as string,
      notificationPreferences: {
        email: preferencesDto.notificationPreferences.email,
        push: preferencesDto.notificationPreferences.push,
        reminders: preferencesDto.notificationPreferences.reminders,
        achievements: preferencesDto.notificationPreferences.achievements,
      },
      goals: [...preferencesDto.goals],
      interests: [...preferencesDto.interests],
      availableHoursPerWeek: preferencesDto.availableHoursPerWeek,
    };

    // Use object spread to ensure proper typing
    const updateData: Partial<StudentProfile> = {
      preferredLearningStyle: learningStyleEnum,
      studyTimePreference: preferencesDto.studyTimePreference,
      difficultyPreference: difficultyLevel,
      learningGoals: preferencesDto.goals.join(', '),
      motivationFactors: preferencesDto.interests.join(', '),
      lastActivityAt: new Date(),
    };
    
    // Update the entity
    await this.studentProfileRepository.update(studentProfile.id, updateData);
    
    // Separately update JSON field to avoid type conflicts
    await this.studentProfileRepository.update(studentProfile.id, {
      learningPreferences: learningPreferences as any,
    });

    this.logger.log(`Learning preferences saved for user ${userId}`);

    return preferencesDto;
  }

  async getLearningPreferences(userId: string): Promise<LearningPreferencesDto | null> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['studentProfile'],
    });

    if (!user || !user.studentProfile) {
      throw new NotFoundException('Student profile not found');
    }

    const studentProfile = user.studentProfile;

    if (!studentProfile.learningPreferences) {
      return null;
    }

    return studentProfile.learningPreferences as any;
  }

  async completeOnboarding(userId: string): Promise<{ success: boolean; redirectUrl: string; accessToken?: string; refreshToken?: string; expiresIn?: number; user?: any }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['studentProfile'],
    });

    if (!user || !user.studentProfile) {
      throw new NotFoundException('Student profile not found');
    }

    const studentProfile = user.studentProfile;

    // Check if all required steps are completed
    const progress = await this.getOnboardingProgress(userId);

    if (
      !progress.skillAssessmentCompleted ||
      !progress.preferencesSetup ||
      !progress.learningPathSelected
    ) {
      throw new BadRequestException(
        'Cannot complete onboarding. Some required steps are not finished.',
      );
    }

    // Mark onboarding as completed
    await this.studentProfileRepository.update(studentProfile.id, {
      onboardingCompleted: true,
      lastActivityAt: new Date(),
    });

    // Generate tokens like login does
    const tokens = await this.authService.generateTokens(user);
    await this.userService.storeRefreshToken(user.id, tokens.refreshToken);

    this.logger.log(`Onboarding completed for user ${userId}`);

    return {
      success: true,
      redirectUrl: '/student',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: user,
    };
  }

  async skipStep(userId: string, skipDto: SkipOnboardingStepDto): Promise<OnboardingProgressDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['studentProfile'],
    });

    if (!user || !user.studentProfile) {
      throw new NotFoundException('Student profile not found');
    }

    const studentProfile = user.studentProfile;
    const analyticsData = studentProfile.analyticsData || {};

    // Track skipped steps
    const skippedSteps = analyticsData.skippedSteps || [];
    if (!skippedSteps.includes(skipDto.step)) {
      skippedSteps.push(skipDto.step);
    }

    analyticsData.skippedSteps = skippedSteps;

    if (skipDto.reason) {
      analyticsData.skipReasons = analyticsData.skipReasons || {};
      analyticsData.skipReasons[skipDto.step] = skipDto.reason;
    }

    // Mark certain steps as completed when skipped
    switch (skipDto.step) {
      case 1:
        analyticsData.profileSetupCompleted = true;
        break;
      case 2:
        analyticsData.skillAssessmentCompleted = true;
        break;
      case 3:
        analyticsData.preferencesSetupCompleted = true;
        break;
      case 4:
        analyticsData.learningPathSelected = true;
        break;
    }

    await this.studentProfileRepository.update(studentProfile.id, {
      analyticsData: analyticsData as any,
      lastActivityAt: new Date(),
    });

    this.logger.log(
      `Onboarding step ${skipDto.step} skipped for user ${userId}. Reason: ${skipDto.reason || 'Not provided'}`,
    );

    return this.getOnboardingProgress(userId);
  }

  async resetOnboarding(userId: string): Promise<OnboardingProgressDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['studentProfile'],
    });

    if (!user || !user.studentProfile) {
      throw new NotFoundException('Student profile not found');
    }

    const studentProfile = user.studentProfile;

    // Reset onboarding data
    await this.studentProfileRepository.update(studentProfile.id, {
      onboardingCompleted: false,
      analyticsData: {
        ...studentProfile.analyticsData,
        profileSetupCompleted: false,
        skillAssessmentCompleted: false,
        preferencesSetupCompleted: false,
        learningPathSelected: false,
        skillAssessmentResults: undefined,
        selectedLearningPath: undefined,
        skippedSteps: [],
        skipReasons: {},
      } as any,
      lastActivityAt: new Date(),
    });

    this.logger.log(`Onboarding reset for user ${userId}`);

    return this.getOnboardingProgress(userId);
  }
}
