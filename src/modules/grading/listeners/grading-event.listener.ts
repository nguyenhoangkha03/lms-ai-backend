import { WinstonService } from '@/logger/winston.service';
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Grade } from '../entities/grade.entity';
import { User } from '../../user/entities/user.entity';
import { Assessment } from '../../assessment/entities/assessment.entity';
import { NotificationService } from '../../notification/services/notification.service';
import { NotificationType, NotificationCategory, NotificationPriority } from '@/common/enums/notification.enums';

interface GradeCreatedEvent {
  gradeId: string;
  studentId: string;
  assessmentId: string;
  score: number;
  percentage: number;
}

interface GradePublishedEvent {
  gradeId: string;
  studentId: string;
  assessmentId: string;
  score: number;
  percentage: number;
}

interface FeedbackCreatedEvent {
  feedbackId: string;
  gradeId: string;
  category: string;
  authorId: string;
}

interface AssessmentGradedEvent {
  attemptId: string;
  studentId: string;
  assessmentId: string;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  gradedAt: Date;
}

@Injectable()
export class GradingEventListener {
  constructor(
    @InjectRepository(Grade)
    private readonly gradeRepository: Repository<Grade>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Assessment)
    private readonly assessmentRepository: Repository<Assessment>,
    private readonly notificationService: NotificationService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(GradingEventListener.name);
  }

  @OnEvent('grade.created')
  async handleGradeCreated(payload: GradeCreatedEvent) {
    this.logger.log(`Grade created: ${payload.gradeId} for student ${payload.studentId}`);

    try {
      await this.updateStudentGradeStatistics(payload.studentId);

      await this.updateAssessmentStatistics(payload.assessmentId);

      await this.checkGradeAchievements(payload);
    } catch (error) {
      this.logger.error('Error handling grade created event', error);
    }
  }

  @OnEvent('grade.published')
  async handleGradePublished(payload: GradePublishedEvent) {
    this.logger.log(`Grade published: ${payload.gradeId} for student ${payload.studentId}`);

    try {
      await this.sendGradeNotification(payload);

      await this.updateLearningAnalytics(payload);

      await this.triggerAiRecommendationsUpdate(payload.studentId);
    } catch (error) {
      this.logger.error('Error handling grade published event', error);
    }
  }

  @OnEvent('feedback.created')
  async handleFeedbackCreated(payload: FeedbackCreatedEvent) {
    this.logger.log(`Feedback created: ${payload.feedbackId} for grade ${payload.gradeId}`);

    try {
      await this.updateFeedbackStatistics(payload.gradeId);

      await this.sendFeedbackNotification(payload);
    } catch (error) {
      this.logger.error('Error handling feedback created event', error);
    }
  }

  @OnEvent('grades.bulk_created')
  async handleBulkGradesCreated(payload: {
    count: number;
    graderId: string;
    publishedImmediately: boolean;
  }) {
    this.logger.log(`Bulk grading completed: ${payload.count} grades by ${payload.graderId}`);

    try {
      await this.updateTeacherGradingStatistics(payload.graderId, payload.count);

      if (payload.publishedImmediately) {
        // Notify students about published grades
      }
    } catch (error) {
      this.logger.error('Error handling bulk grades created event', error);
    }
  }

  @OnEvent('gradebook.calculated')
  async handleGradebookCalculated(payload: {
    gradebookId: string;
    courseId: string;
    totalStudents: number;
    classAverage: number;
  }) {
    this.logger.log(`Gradebook calculated: ${payload.gradebookId} for course ${payload.courseId}`);

    try {
      await this.updateCourseGradingStatistics(payload.courseId, payload.classAverage);

      await this.generateCoursePerformanceReport(payload);
    } catch (error) {
      this.logger.error('Error handling gradebook calculated event', error);
    }
  }

  @OnEvent('assessment.graded')
  async handleAssessmentGraded(payload: AssessmentGradedEvent) {
    this.logger.log(`Assessment graded: ${payload.attemptId} for student ${payload.studentId}`);

    try {
      // Create a grade record if it doesn't exist
      const existingGrade = await this.gradeRepository.findOne({
        where: { 
          studentId: payload.studentId, 
          assessmentId: payload.assessmentId 
        }
      });

      let gradeId: string;
      
      if (!existingGrade) {
        const newGrade = this.gradeRepository.create({
          studentId: payload.studentId,
          assessmentId: payload.assessmentId,
          score: payload.score,
          percentage: payload.percentage,
          maxScore: payload.maxScore,
          isPublished: true,
          gradedAt: payload.gradedAt,
          graderId: payload.studentId, // Auto-graded
        });
        
        const savedGrade = await this.gradeRepository.save(newGrade);
        gradeId = savedGrade.id;
      } else {
        // Update existing grade
        await this.gradeRepository.update(existingGrade.id, {
          score: payload.score,
          percentage: payload.percentage,
          maxScore: payload.maxScore,
          isPublished: true,
          gradedAt: payload.gradedAt,
        });
        gradeId = existingGrade.id;
      }

      // Send grade notification
      await this.sendGradeNotification({
        gradeId,
        studentId: payload.studentId,
        assessmentId: payload.assessmentId,
        score: payload.score,
        percentage: payload.percentage,
      });

      // Update statistics
      await this.updateStudentGradeStatistics(payload.studentId);
      await this.updateAssessmentStatistics(payload.assessmentId);

    } catch (error) {
      this.logger.error('Error handling assessment graded event', error);
    }
  }

  private async updateStudentGradeStatistics(studentId: string): Promise<void> {
    const studentGrades = await this.gradeRepository.find({
      where: { studentId, isPublished: true },
    });

    if (studentGrades.length > 0) {
      const totalScore = studentGrades.reduce((sum, grade) => sum + grade.percentage, 0);
      const averageGrade = totalScore / studentGrades.length;
      const highestGrade = Math.max(...studentGrades.map(g => g.percentage));
      const lowestGrade = Math.min(...studentGrades.map(g => g.percentage));

      await this.userRepository.update(studentId, {
        metadata: JSON.stringify({
          gradeStatistics: {
            totalGrades: studentGrades.length,
            averageGrade: Number(averageGrade.toFixed(2)),
            highestGrade: Number(highestGrade.toFixed(2)),
            lowestGrade: Number(lowestGrade.toFixed(2)),
            lastUpdated: new Date(),
          },
        }),
      });
    }
  }

  private async updateAssessmentStatistics(assessmentId: string): Promise<void> {
    const assessmentGrades = await this.gradeRepository.find({
      where: { assessmentId, isPublished: true },
    });

    if (assessmentGrades.length > 0) {
      const scores = assessmentGrades.map(g => g.percentage);
      const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      const highest = Math.max(...scores);
      const lowest = Math.min(...scores);
      const passingRate = (scores.filter(s => s >= 60).length / scores.length) * 100;

      await this.assessmentRepository.update(assessmentId, {
        metadata: JSON.stringify({
          gradeStatistics: {
            totalSubmissions: assessmentGrades.length,
            averageScore: Number(average.toFixed(2)),
            highestScore: Number(highest.toFixed(2)),
            lowestScore: Number(lowest.toFixed(2)),
            passingRate: Number(passingRate.toFixed(2)),
            lastCalculated: new Date(),
          },
        }),
      });
    }
  }

  private async checkGradeAchievements(payload: GradeCreatedEvent): Promise<void> {
    if (payload.percentage >= 95) {
      // Award "Excellence" achievement
      this.logger.log(
        `Student ${payload.studentId} achieved excellence with ${payload.percentage}%`,
      );
    }

    if (payload.percentage >= 80) {
      // Award "High Achiever" achievement
      this.logger.log(
        `Student ${payload.studentId} achieved high score with ${payload.percentage}%`,
      );
    }

    const previousGrades = await this.gradeRepository.find({
      where: { studentId: payload.studentId },
      order: { createdAt: 'DESC' },
      take: 5,
    });

    if (previousGrades.length >= 3) {
      const recentAverage =
        previousGrades.slice(0, 3).reduce((sum, g) => sum + g.percentage, 0) / 3;
      const olderAverage =
        previousGrades.slice(3).reduce((sum, g) => sum + g.percentage, 0) /
        (previousGrades.length - 3);

      if (recentAverage > olderAverage + 10) {
        this.logger.log(`Student ${payload.studentId} achieved significant improvement`);
      }
    }
  }

  private async sendGradeNotification(payload: GradePublishedEvent): Promise<void> {
    this.logger.log(`Sending grade notification to student ${payload.studentId}`);

    try {
      await this.notificationService.create({
        userId: payload.studentId,
        type: NotificationType.GRADE_POSTED,
        category: NotificationCategory.ACADEMIC,
        priority: NotificationPriority.MEDIUM,
        title: 'New Grade Available',
        message: `Your grade has been published: ${payload.score} points (${payload.percentage.toFixed(1)}%)`,
        data: {
          gradeId: payload.gradeId,
          assessmentId: payload.assessmentId,
          score: payload.score,
          percentage: payload.percentage,
        },
      });

      this.logger.log(`Grade notification sent successfully to student ${payload.studentId}`);
    } catch (error) {
      this.logger.error(`Failed to send grade notification to student ${payload.studentId}:`, error);
    }
  }

  private async updateLearningAnalytics(payload: GradePublishedEvent): Promise<void> {
    // Update learning analytics with new grade data
    this.logger.log(`Updating learning analytics for student ${payload.studentId}`);

    // This would integrate with the analytics service to update:
    // - Performance trends
    // - Subject mastery levels
    // - Learning velocity
    // - Difficulty progression
  }

  private async triggerAiRecommendationsUpdate(studentId: string): Promise<void> {
    // Trigger AI recommendations recalculation
    this.logger.log(`Triggering AI recommendations update for student ${studentId}`);

    // This would integrate with the AI service to:
    // - Recalculate learning path recommendations
    // - Update difficulty suggestions
    // - Generate new study recommendations
  }

  private async updateFeedbackStatistics(gradeId: string): Promise<void> {
    // Update feedback statistics for the grade
    this.logger.log(`Updating feedback statistics for grade ${gradeId}`);
  }

  private async sendFeedbackNotification(payload: FeedbackCreatedEvent): Promise<void> {
    // Send notification about new feedback
    this.logger.log(`Sending feedback notification for grade ${payload.gradeId}`);
  }

  private async updateTeacherGradingStatistics(
    graderId: string,
    gradeCount: number,
  ): Promise<void> {
    // Update teacher's grading statistics
    this.logger.log(`Updating grading statistics for teacher ${graderId}: +${gradeCount} grades`);
  }

  private async updateCourseGradingStatistics(
    courseId: string,
    classAverage: number,
  ): Promise<void> {
    // Update course-level grading statistics
    this.logger.log(`Updating course statistics for ${courseId}: average ${classAverage}%`);
  }

  private async generateCoursePerformanceReport(payload: any): Promise<void> {
    // Generate performance report for the course
    this.logger.log(`Generating performance report for course ${payload.courseId}`);
  }
}
