import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AIRecommendation } from '../entities/ai-recommendation.entity';
import { RecommendationService } from './recommendation.service';
import { ContentSimilarityService } from './content-similarity.service';
import { Course } from '../../course/entities/course.entity';
import { Lesson } from '../../course/entities/lesson.entity';
import { Enrollment } from '../../course/entities/enrollment.entity';
// import { RecommendationType, Priority } from '@/common/enums/ai.enums';

export interface LearningPathNode {
  id: string;
  type: 'course' | 'lesson' | 'assessment';
  title: string;
  prerequisites: string[];
  estimatedDuration: number;
  difficultyLevel: string;
  skills: string[];
  order: number;
  isOptional: boolean;
}

export interface LearningPath {
  userId: string;
  nodes: LearningPathNode[];
  totalDuration: number;
  totalNodes: number;
  estimatedCompletionDate: Date;
  pathMetadata: {
    goals: string[];
    focusAreas: string[];
    adaptationRules: string[];
  };
}

@Injectable()
export class LearningPathService {
  private readonly logger = new Logger(LearningPathService.name);

  constructor(
    @InjectRepository(AIRecommendation)
    private readonly recommendationRepository: Repository<AIRecommendation>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    private readonly _recommendationService: RecommendationService,
    private readonly _contentSimilarityService: ContentSimilarityService,
  ) {}

  async generateOptimalLearningPath(
    userId: string,
    goals: string[],
    timeConstraints?: { dailyHours: number; targetDays: number },
  ): Promise<LearningPath> {
    this.logger.log(`Generating optimal learning path for user: ${userId}`);

    // Get user's current progress and preferences
    const userProfile = await this.getUserLearningProfile(userId);

    // Get available content based on goals
    const availableContent = await this.getContentForGoals(goals);

    // Build dependency graph
    const dependencyGraph = this.buildDependencyGraph(availableContent);

    // Apply pathfinding algorithm (simplified topological sort)
    const optimalSequence = this.findOptimalSequence(dependencyGraph, userProfile, timeConstraints);

    // Convert to learning path nodes
    const nodes = await this.createPathNodes(optimalSequence, userProfile);

    const totalDuration = nodes.reduce((sum, node) => sum + node.estimatedDuration, 0);
    const estimatedCompletionDate = this.calculateCompletionDate(totalDuration, timeConstraints);

    return {
      userId,
      nodes,
      totalDuration,
      totalNodes: nodes.length,
      estimatedCompletionDate,
      pathMetadata: {
        goals,
        focusAreas: this.extractFocusAreas(nodes),
        adaptationRules: this.generateAdaptationRules(userProfile),
      },
    };
  }

  async adaptLearningPath(
    userId: string,
    currentPath: LearningPath,
    performanceData: any,
  ): Promise<LearningPath> {
    this.logger.log(`Adapting learning path for user: ${userId}`);

    // Analyze performance to determine adaptations needed
    const adaptations = this.analyzePerformanceForAdaptation(performanceData);

    // Apply adaptations
    let adaptedNodes = [...currentPath.nodes];

    for (const adaptation of adaptations) {
      switch (adaptation.type) {
        case 'add_review':
          adaptedNodes = this.addReviewNodes(adaptedNodes, adaptation.subject);
          break;
        case 'increase_difficulty':
          adaptedNodes = this.adjustDifficulty(adaptedNodes, adaptation.subject, 'increase');
          break;
        case 'decrease_difficulty':
          adaptedNodes = this.adjustDifficulty(adaptedNodes, adaptation.subject, 'decrease');
          break;
        case 'add_practice':
          adaptedNodes = this.addPracticeNodes(adaptedNodes, adaptation.subject);
          break;
        case 'skip_redundant':
          adaptedNodes = this.removeRedundantNodes(adaptedNodes, adaptation.masteredSkills);
          break;
      }
    }

    // Recalculate path metadata
    const totalDuration = adaptedNodes.reduce((sum, node) => sum + node.estimatedDuration, 0);
    const estimatedCompletionDate = this.calculateCompletionDate(totalDuration);

    return {
      ...currentPath,
      nodes: adaptedNodes,
      totalDuration,
      totalNodes: adaptedNodes.length,
      estimatedCompletionDate,
      pathMetadata: {
        ...currentPath.pathMetadata,
        adaptationRules: [
          ...currentPath.pathMetadata.adaptationRules,
          `Adapted based on performance: ${adaptations.map(a => a.type).join(', ')}`,
        ],
      },
    };
  }

  private async getUserLearningProfile(userId: string) {
    // Get user's learning preferences, current enrollments, and performance
    const enrollments = await this.enrollmentRepository.find({
      where: { studentId: userId },
      relations: ['course', 'course.category'],
    });

    return {
      userId,
      currentCourses: enrollments.map(e => e.course),
      preferredDifficulty: 'intermediate', // Would be calculated from user data
      learningStyle: 'mixed',
      pace: 'normal',
      availableTimePerDay: 60, // minutes
      masteredSkills: [], // Would be extracted from completed assessments
      strugglingAreas: [], // Would be identified from poor performance
    };
  }

  private async getContentForGoals(goals: string[]) {
    // Find courses and lessons relevant to the learning goals
    const courses = await this.courseRepository
      .createQueryBuilder('course')
      .where('course.isActive = :isActive', { isActive: true })
      .andWhere('course.status = :status', { status: 'published' })
      .getMany();

    // Filter courses based on goals (simplified)
    return courses.filter(course =>
      goals.some(
        goal =>
          course.title.toLowerCase().includes(goal.toLowerCase()) ||
          course.description?.toLowerCase().includes(goal.toLowerCase()) ||
          (course.tags && course.tags.some(tag => tag.toLowerCase().includes(goal.toLowerCase()))),
      ),
    );
  }

  private buildDependencyGraph(content: Course[]) {
    // Build a graph showing prerequisites between content
    const graph = new Map<string, { content: Course; prerequisites: string[] }>();

    content.forEach(course => {
      graph.set(course.id, {
        content: course,
        prerequisites: course.requirements || [],
      });
    });

    return graph;
  }

  private findOptimalSequence(
    dependencyGraph: Map<string, any>,
    _userProfile: any,
    _timeConstraints?: any,
  ): string[] {
    // Simplified topological sort with optimization for user preferences
    const visited = new Set<string>();
    const sequence: string[] = [];
    const visiting = new Set<string>();

    const visit = (nodeId: string): boolean => {
      if (visiting.has(nodeId)) {
        // Circular dependency detected
        this.logger.warn(`Circular dependency detected involving: ${nodeId}`);
        return false;
      }

      if (visited.has(nodeId)) {
        return true;
      }

      visiting.add(nodeId);
      const node = dependencyGraph.get(nodeId);

      if (node) {
        // Visit all prerequisites first
        for (const prereq of node.prerequisites) {
          if (dependencyGraph.has(prereq) && !visit(prereq)) {
            return false;
          }
        }
      }

      visiting.delete(nodeId);
      visited.add(nodeId);
      sequence.push(nodeId);
      return true;
    };

    // Visit all nodes
    for (const nodeId of dependencyGraph.keys()) {
      if (!visited.has(nodeId)) {
        visit(nodeId);
      }
    }

    return sequence;
  }

  private async createPathNodes(
    sequence: string[],
    _userProfile: any,
  ): Promise<LearningPathNode[]> {
    const nodes: LearningPathNode[] = [];

    for (let i = 0; i < sequence.length; i++) {
      const courseId = sequence[i];
      const course = await this.courseRepository.findOne({
        where: { id: courseId },
        relations: ['sections', 'sections.lessons'],
      });

      if (course) {
        nodes.push({
          id: course.id,
          type: 'course',
          title: course.title,
          prerequisites: course.requirements || [],
          estimatedDuration: +course.estimatedDuration || 60, // minutes
          difficultyLevel: course.level || 'intermediate',
          skills: course.whatYouWillLearn || [],
          order: i,
          isOptional: false,
        });
      }
    }

    return nodes;
  }

  private calculateCompletionDate(
    totalDuration: number,
    timeConstraints?: { dailyHours: number; targetDays: number },
  ): Date {
    const dailyMinutes = timeConstraints?.dailyHours ? timeConstraints.dailyHours * 60 : 60; // Default 1 hour per day

    const daysNeeded = Math.ceil(totalDuration / dailyMinutes);
    const completionDate = new Date();
    completionDate.setDate(completionDate.getDate() + daysNeeded);

    return completionDate;
  }

  private extractFocusAreas(nodes: LearningPathNode[]): string[] {
    const skills = nodes.flatMap(node => node.skills);
    const uniqueSkills = [...new Set(skills)];
    return uniqueSkills.slice(0, 5); // Top 5 focus areas
  }

  private generateAdaptationRules(userProfile: any): string[] {
    const rules = [
      'Adjust difficulty based on assessment performance',
      'Add review content for scores below 70%',
      'Skip basic content if user demonstrates mastery',
    ];

    if (userProfile.learningStyle === 'visual') {
      rules.push('Prioritize video content and visual materials');
    }

    if (userProfile.pace === 'fast') {
      rules.push('Reduce content repetition and increase challenge level');
    }

    return rules;
  }

  private analyzePerformanceForAdaptation(performanceData: any) {
    // Analyze performance to determine what adaptations are needed
    const adaptations: any = [];

    // Example adaptation logic
    if (performanceData.averageScore < 60) {
      adaptations.push({
        type: 'add_review',
        subject: performanceData.weakestSubject,
      });
    }

    if (performanceData.averageScore > 85 && performanceData.completionTime < 0.7) {
      adaptations.push({
        type: 'increase_difficulty',
        subject: performanceData.strongestSubject,
      });
    }

    return adaptations;
  }

  private addReviewNodes(nodes: LearningPathNode[], subject: string): LearningPathNode[] {
    // Add review content for struggling subjects
    const reviewNode: LearningPathNode = {
      id: `review-${subject}-${Date.now()}`,
      type: 'lesson',
      title: `Review: ${subject} Fundamentals`,
      prerequisites: [],
      estimatedDuration: 30,
      difficultyLevel: 'beginner',
      skills: [`${subject} review`],
      order: nodes.length,
      isOptional: false,
    };

    return [...nodes, reviewNode];
  }

  private adjustDifficulty(
    nodes: LearningPathNode[],
    subject: string,
    direction: 'increase' | 'decrease',
  ): LearningPathNode[] {
    return nodes.map(node => {
      if (node.skills.some(skill => skill.toLowerCase().includes(subject.toLowerCase()))) {
        const difficultyLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
        const currentIndex = difficultyLevels.indexOf(node.difficultyLevel);

        let newIndex = currentIndex;
        if (direction === 'increase' && currentIndex < difficultyLevels.length - 1) {
          newIndex = currentIndex + 1;
        } else if (direction === 'decrease' && currentIndex > 0) {
          newIndex = currentIndex - 1;
        }

        return {
          ...node,
          difficultyLevel: difficultyLevels[newIndex],
        };
      }
      return node;
    });
  }

  private addPracticeNodes(nodes: LearningPathNode[], subject: string): LearningPathNode[] {
    const practiceNode: LearningPathNode = {
      id: `practice-${subject}-${Date.now()}`,
      type: 'assessment',
      title: `${subject} Practice Exercises`,
      prerequisites: [],
      estimatedDuration: 45,
      difficultyLevel: 'intermediate',
      skills: [`${subject} practice`],
      order: nodes.length,
      isOptional: true,
    };

    return [...nodes, practiceNode];
  }

  private removeRedundantNodes(
    nodes: LearningPathNode[],
    masteredSkills: string[],
  ): LearningPathNode[] {
    return nodes.filter(
      node =>
        !node.skills.every(skill =>
          masteredSkills.some(mastered => skill.toLowerCase().includes(mastered.toLowerCase())),
        ),
    );
  }
}
