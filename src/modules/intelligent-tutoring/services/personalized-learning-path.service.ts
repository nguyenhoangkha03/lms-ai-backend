import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TutoringSession } from '../entities/tutoring-session.entity';
import { LearningStyleProfile } from '../entities/learning-style-profile.entity';
import { Course } from '../../course/entities/course.entity';
import { Lesson } from '../../course/entities/lesson.entity';
import { LearningPathService } from '../../ai/services/learning-path.service';
import { RecommendationService } from '../../ai/services/recommendation.service';
import {
  GeneratePersonalizedPathDto,
  PersonalizedLearningPathDto,
  LearningPathNodeDto,
} from '../dto/tutoring.dto';
import { LearningStyleType } from '@/common/enums/tutoring.enums';

@Injectable()
export class PersonalizedLearningPathService {
  private readonly logger = new Logger(PersonalizedLearningPathService.name);

  constructor(
    @InjectRepository(TutoringSession)
    private readonly _sessionRepository: Repository<TutoringSession>,
    @InjectRepository(LearningStyleProfile)
    private readonly profileRepository: Repository<LearningStyleProfile>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Lesson)
    private readonly _lessonRepository: Repository<Lesson>,
    private readonly learningPathService: LearningPathService,
    private readonly _recommendationService: RecommendationService,
  ) {}

  async generatePersonalizedPath(
    studentId: string,
    generatePathDto: GeneratePersonalizedPathDto,
  ): Promise<PersonalizedLearningPathDto> {
    try {
      this.logger.log(`Generating personalized learning path for student: ${studentId}`);

      // Get student's learning profile
      const learningProfile = await this.profileRepository.findOne({
        where: { userId: studentId },
      });

      // Get course information
      const course = await this.courseRepository.findOne({
        where: { id: generatePathDto.courseId },
        relations: ['sections', 'sections.lessons'],
      });

      if (!course) {
        throw new Error('Course not found');
      }

      // Generate AI-powered learning path
      const aiLearningPath = await this.learningPathService.generatePersonalizedPath(studentId, {
        courseId: generatePathDto.courseId,
        learningGoals: generatePathDto.learningGoals || [],
        timeConstraints: {
          dailyHours: (generatePathDto.dailyStudyTime || 60) / 60,
          targetDays: generatePathDto.targetCompletionDate
            ? Math.ceil(
                (generatePathDto.targetCompletionDate.getTime() - Date.now()) /
                  (1000 * 60 * 60 * 24),
              )
            : 30,
        },
        difficultyPreference: generatePathDto.preferredDifficulty!,
        learningStyle: learningProfile?.primaryLearningStyle ?? LearningStyleType.AUDITORY,
      });

      // Adapt path based on learning style
      const adaptedPath = await this.adaptPathToLearningStyle(aiLearningPath, learningProfile);

      // Convert to response format
      return this.mapToPersonalizedPath(adaptedPath, course);
    } catch (error) {
      this.logger.error(`Failed to generate personalized learning path: ${error.message}`);
      throw error;
    }
  }

  private async adaptPathToLearningStyle(
    learningPath: any,
    learningProfile: LearningStyleProfile | null,
  ): Promise<any> {
    if (!learningProfile) {
      return learningPath;
    }

    // Adapt content ordering and types based on learning style
    const adaptedNodes = learningPath.nodes.map((node: any) => {
      const adaptedNode = { ...node };

      // Adjust content types based on learning style
      switch (learningProfile.primaryLearningStyle) {
        case 'visual':
          adaptedNode.preferredContentTypes = ['video', 'diagram', 'infographic'];
          adaptedNode.estimatedDuration *= 0.9; // Visual learners often process faster
          break;
        case 'auditory':
          adaptedNode.preferredContentTypes = ['audio', 'discussion', 'lecture'];
          adaptedNode.estimatedDuration *= 1.1; // May need more time for reflection
          break;
        case 'kinesthetic':
          adaptedNode.preferredContentTypes = ['interactive', 'simulation', 'hands-on'];
          adaptedNode.estimatedDuration *= 1.2; // Need time for practice
          break;
        case 'reading_writing':
          adaptedNode.preferredContentTypes = ['text', 'notes', 'reading'];
          adaptedNode.estimatedDuration *= 1.0; // Standard timing
          break;
      }

      return adaptedNode;
    });

    return {
      ...learningPath,
      nodes: adaptedNodes,
      adaptationRules: [
        ...learningPath.adaptationRules,
        `Adapted for ${learningProfile.primaryLearningStyle} learning style`,
      ],
    };
  }

  private mapToPersonalizedPath(aiLearningPath: any, _course: Course): PersonalizedLearningPathDto {
    const nodes: LearningPathNodeDto[] = aiLearningPath.nodes.map((node: any, index: number) => ({
      id: node.id,
      type: node.type,
      title: node.title,
      prerequisites: node.prerequisites,
      estimatedDuration: node.estimatedDuration,
      difficultyLevel: node.difficultyLevel,
      skills: node.skills,
      order: index,
      isOptional: node.isOptional || false,
    }));

    return {
      id: aiLearningPath.id,
      totalDuration: aiLearningPath.totalDuration,
      nodeCount: nodes.length,
      nodes,
      adaptationRules: aiLearningPath.adaptationRules,
      estimatedCompletion: aiLearningPath.estimatedCompletion,
      focusAreas: aiLearningPath.focusAreas,
    };
  }
}
