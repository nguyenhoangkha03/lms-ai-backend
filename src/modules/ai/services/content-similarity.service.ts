import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '../../course/entities/course.entity';
import { Lesson } from '../../course/entities/lesson.entity';
import { Assessment } from '../../assessment/entities/assessment.entity';
import { LearningActivity } from '../../analytics/entities/learning-activity.entity';

export interface ContentVector {
  contentId: string;
  contentType: 'course' | 'lesson' | 'assessment';
  features: {
    tags: string[];
    category: string;
    difficulty: number;
    duration: number;
    subject: string;
    topics: string[];
  };
  vector: number[];
}

export interface SimilarityResult {
  contentId: string;
  similarity: number;
  reasons: string[];
}

@Injectable()
export class ContentSimilarityService {
  private readonly logger = new Logger(ContentSimilarityService.name);

  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Assessment)
    private readonly assessmentRepository: Repository<Assessment>,
    @InjectRepository(LearningActivity)
    private readonly activityRepository: Repository<LearningActivity>,
  ) {}

  async findSimilarContent(
    targetContentId: string,
    targetContentType: string,
    userId: string,
    limit: number = 10,
  ): Promise<SimilarityResult[]> {
    this.logger.log(`Finding similar content for ${targetContentType}:${targetContentId}`);

    // Get target content features
    const targetVector = await this.getContentVector(targetContentId, targetContentType);
    if (!targetVector) {
      this.logger.warn(`Content not found: ${targetContentType}:${targetContentId}`);
      return [];
    }

    // Get candidate content (exclude already consumed by user)
    const candidates = await this.getCandidateContent(userId, targetContentType);

    // Calculate similarities
    const similarities = await Promise.all(
      candidates.map(async candidate => {
        const candidateVector = await this.getContentVector(candidate.id, targetContentType);
        if (!candidateVector) return null;

        const similarity = this.calculateCosineSimilarity(targetVector, candidateVector);
        const reasons = this.generateSimilarityReasons(targetVector, candidateVector);

        return {
          contentId: candidate.id,
          similarity,
          reasons,
        };
      }),
    );

    // Filter out null results and sort by similarity
    return similarities
      .filter(Boolean)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  private async getContentVector(
    contentId: string,
    contentType: string,
  ): Promise<ContentVector | null> {
    let content;
    let features;

    switch (contentType) {
      case 'course':
        content = await this.courseRepository.findOne({
          where: { id: contentId },
          relations: ['category'],
        });
        if (!content) return null;

        features = {
          tags: content.tags || [],
          category: content.category?.name || '',
          difficulty: this.mapDifficultyToNumber(content.difficultyLevel),
          duration: content.duration || 0,
          subject: content.category?.name || '',
          topics: content.whatYouWillLearn || [],
        };
        break;

      case 'lesson':
        content = await this.lessonRepository.findOne({
          where: { id: contentId },
          relations: ['course', 'course.category'],
        });
        if (!content) return null;

        features = {
          tags: content.tags || [],
          category: content.course?.category?.name || '',
          difficulty: this.mapDifficultyToNumber(content.difficultyLevel),
          duration: content.duration || 0,
          subject: content.course?.category?.name || '',
          topics: content.objectives || [],
        };
        break;

      case 'assessment':
        content = await this.assessmentRepository.findOne({
          where: { id: contentId },
          relations: ['lesson', 'lesson.course', 'lesson.course.category'],
        });
        if (!content) return null;

        features = {
          tags: content.tags || [],
          category: content.lesson?.course?.category?.name || '',
          difficulty: this.mapDifficultyToNumber(content.difficultyLevel),
          duration: content.timeLimit || 0,
          subject: content.lesson?.course?.category?.name || '',
          topics: content.skills || [],
        };
        break;

      default:
        return null;
    }

    // Create feature vector
    const vector = this.createFeatureVector(features);

    return {
      contentId,
      contentType: contentType as any,
      features,
      vector,
    };
  }

  private createFeatureVector(features: any): number[] {
    const vector: number[] = [];

    // Tag features (one-hot encoding for common tags)
    const commonTags = [
      'beginner',
      'intermediate',
      'advanced',
      'programming',
      'mathematics',
      'science',
    ];
    commonTags.forEach(tag => {
      vector.push(features.tags.includes(tag) ? 1 : 0);
    });

    // Category features
    const commonCategories = ['programming', 'mathematics', 'science', 'literature', 'business'];
    commonCategories.forEach(category => {
      vector.push(features.category.toLowerCase().includes(category) ? 1 : 0);
    });

    // Normalized numerical features
    vector.push(features.difficulty / 5); // Normalize difficulty (0-1)
    vector.push(Math.min(features.duration / 3600, 1)); // Normalize duration (max 1 hour)

    // Topic similarity (simplified)
    const commonTopics = ['variables', 'functions', 'loops', 'algorithms', 'data structures'];
    commonTopics.forEach(topic => {
      const hasTopicMatch = features.topics.some((t: string) => t.toLowerCase().includes(topic));
      vector.push(hasTopicMatch ? 1 : 0);
    });

    return vector;
  }

  private calculateCosineSimilarity(vectorA: ContentVector, vectorB: ContentVector): number {
    const a = vectorA.vector;
    const b = vectorB.vector;

    if (a.length !== b.length) {
      this.logger.warn('Vector length mismatch in similarity calculation');
      return 0;
    }

    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

    if (magnitudeA === 0 || magnitudeB === 0) return 0;

    return dotProduct / (magnitudeA * magnitudeB);
  }

  private generateSimilarityReasons(
    targetVector: ContentVector,
    candidateVector: ContentVector,
  ): string[] {
    const reasons: string[] = [];

    // Check tag overlap
    const commonTags = targetVector.features.tags.filter(tag =>
      candidateVector.features.tags.includes(tag),
    );
    if (commonTags.length > 0) {
      reasons.push(`Similar topics: ${commonTags.join(', ')}`);
    }

    // Check category match
    if (targetVector.features.category === candidateVector.features.category) {
      reasons.push(`Same category: ${targetVector.features.category}`);
    }

    // Check difficulty similarity
    const difficultyDiff = Math.abs(
      targetVector.features.difficulty - candidateVector.features.difficulty,
    );
    if (difficultyDiff <= 1) {
      reasons.push('Similar difficulty level');
    }

    // Check duration similarity
    const durationRatio = Math.min(
      targetVector.features.duration / candidateVector.features.duration,
      candidateVector.features.duration / targetVector.features.duration,
    );
    if (durationRatio > 0.7) {
      reasons.push('Similar duration');
    }

    return reasons.length > 0 ? reasons : ['Content-based similarity'];
  }

  private async getCandidateContent(userId: string, contentType: string) {
    // Get content that user hasn't interacted with
    const interactedContent = await this.activityRepository
      .createQueryBuilder('activity')
      .select('DISTINCT activity.courseId', 'courseId')
      .addSelect('DISTINCT activity.lessonId', 'lessonId')
      .addSelect('DISTINCT activity.assessmentId', 'assessmentId')
      .where('activity.studentId = :userId', { userId })
      .getRawMany();

    const excludeIds = new Set();
    interactedContent.forEach(item => {
      if (item.courseId) excludeIds.add(item.courseId);
      if (item.lessonId) excludeIds.add(item.lessonId);
      if (item.assessmentId) excludeIds.add(item.assessmentId);
    });

    let queryBuilder;
    switch (contentType) {
      case 'course':
        queryBuilder = this.courseRepository
          .createQueryBuilder('course')
          .where('course.isActive = :isActive', { isActive: true })
          .andWhere('course.status = :status', { status: 'published' });
        if (excludeIds.size > 0) {
          queryBuilder.andWhere('course.id NOT IN (:...excludeIds)', {
            excludeIds: Array.from(excludeIds),
          });
        }
        break;

      case 'lesson':
        queryBuilder = this.lessonRepository
          .createQueryBuilder('lesson')
          .where('lesson.isActive = :isActive', { isActive: true });
        if (excludeIds.size > 0) {
          queryBuilder.andWhere('lesson.id NOT IN (:...excludeIds)', {
            excludeIds: Array.from(excludeIds),
          });
        }
        break;

      case 'assessment':
        queryBuilder = this.assessmentRepository
          .createQueryBuilder('assessment')
          .where('assessment.isActive = :isActive', { isActive: true });
        if (excludeIds.size > 0) {
          queryBuilder.andWhere('assessment.id NOT IN (:...excludeIds)', {
            excludeIds: Array.from(excludeIds),
          });
        }
        break;

      default:
        return [];
    }

    return queryBuilder.limit(100).getMany();
  }

  private mapDifficultyToNumber(difficulty: string): number {
    const mapping = {
      beginner: 1,
      intermediate: 3,
      advanced: 5,
      expert: 5,
    };
    return mapping[difficulty?.toLowerCase()] || 3;
  }
}
