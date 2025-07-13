import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WinstonService } from '@/logger/winston.service';

import { Feedback, FeedbackCategory, FeedbackSeverity } from '../entities/feedback.entity';
import { Grade } from '../entities/grade.entity';
import { CreateFeedbackDto } from '../dto/create-feedback.dto';
import { EssayFeedback } from '../interfaces/grading.interfaces';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,
    @InjectRepository(Grade)
    private readonly gradeRepository: Repository<Grade>,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(FeedbackService.name);
  }

  async createFeedback(createFeedbackDto: CreateFeedbackDto, authorId: string): Promise<Feedback> {
    this.logger.log(`Creating feedback for grade ${createFeedbackDto.gradeId}`);

    const grade = await this.gradeRepository.findOne({
      where: { id: createFeedbackDto.gradeId },
    });

    if (!grade) {
      throw new NotFoundException('Grade not found');
    }

    const feedback = this.feedbackRepository.create({
      ...createFeedbackDto,
      authorId,
      createdBy: authorId,
      updatedBy: authorId,
    });

    const savedFeedback = await this.feedbackRepository.save(feedback);

    this.eventEmitter.emit('feedback.created', {
      feedbackId: savedFeedback.id,
      gradeId: createFeedbackDto.gradeId,
      category: createFeedbackDto.category,
      authorId,
    });

    this.logger.log(`Feedback created successfully, {
      feedbackId: ${savedFeedback.id},
      gradeId: ${createFeedbackDto.gradeId},
      category: ${createFeedbackDto.category},
    }`);

    return savedFeedback;
  }

  async findFeedbackByGrade(gradeId: string): Promise<Feedback[]> {
    return this.feedbackRepository.find({
      where: { gradeId },
      relations: ['author', 'question'],
      order: { createdAt: 'ASC' },
    });
  }

  async bulkCreateFeedback(
    gradeId: string,
    feedbackItems: EssayFeedback[],
    authorId: string,
    isAiGenerated = true,
  ): Promise<Feedback[]> {
    this.logger.log(`Creating ${feedbackItems.length} feedback items for grade ${gradeId}`);

    const feedbacks: Feedback[] = [];

    for (const item of feedbackItems) {
      const feedback = this.feedbackRepository.create({
        gradeId,
        authorId,
        category: this.mapToFeedbackCategory(item.category),
        severity: this.mapToFeedbackSeverity(item.severity),
        content: item.content,
        suggestion: item.suggestion,
        isAiGenerated,
        aiConfidence: 0.8,
        startPosition: item.startPosition,
        endPosition: item.endPosition,
        highlightedText: item.highlightedText,
        createdBy: authorId,
        updatedBy: authorId,
      });

      feedbacks.push(feedback);
    }

    const savedFeedbacks = await this.feedbackRepository.save(feedbacks);

    this.eventEmitter.emit('feedback.bulk_created', {
      gradeId,
      count: savedFeedbacks.length,
      isAiGenerated,
      authorId,
    });

    return savedFeedbacks;
  }

  async updateFeedbackHelpfulness(id: string, rating: number, userId: string): Promise<Feedback> {
    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const feedback = await this.feedbackRepository.findOne({ where: { id } });

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    feedback.helpfulnessRating = rating;
    feedback.isMarkedHelpful = rating >= 4;
    feedback.updatedBy = userId;

    const savedFeedback = await this.feedbackRepository.save(feedback);

    this.eventEmitter.emit('feedback.rated', {
      feedbackId: id,
      rating,
      userId,
    });

    return savedFeedback;
  }

  async generateSummaryFeedback(gradeId: string): Promise<string> {
    const feedbacks = await this.findFeedbackByGrade(gradeId);

    if (feedbacks.length === 0) {
      return 'No specific feedback available.';
    }

    const categoryCounts = feedbacks.reduce(
      (acc, feedback) => {
        acc[feedback.category] = (acc[feedback.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const strengths = feedbacks.filter(f => f.severity === FeedbackSeverity.INFO).length;
    const improvements = feedbacks.filter(
      f => f.severity === FeedbackSeverity.WARNING || f.severity === FeedbackSeverity.ERROR,
    ).length;

    let summary = 'Feedback Summary:\n';

    if (strengths > 0) {
      summary += `• ${strengths} areas of strength identified\n`;
    }

    if (improvements > 0) {
      summary += `• ${improvements} areas for improvement noted\n`;
    }

    summary += '\nMain focus areas:\n';
    Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .forEach(([category, count]) => {
        summary += `• ${category}: ${count} comment(s)\n`;
      });

    return summary;
  }

  private mapToFeedbackCategory(category: string): FeedbackCategory {
    const categoryMap: Record<string, FeedbackCategory> = {
      content: FeedbackCategory.CONTENT,
      structure: FeedbackCategory.STRUCTURE,
      grammar: FeedbackCategory.GRAMMAR,
      logic: FeedbackCategory.LOGIC,
      creativity: FeedbackCategory.CREATIVITY,
      technical: FeedbackCategory.TECHNICAL,
    };

    return categoryMap[category.toLowerCase()] || FeedbackCategory.CONTENT;
  }

  private mapToFeedbackSeverity(severity: string): FeedbackSeverity {
    const severityMap: Record<string, FeedbackSeverity> = {
      info: FeedbackSeverity.INFO,
      suggestion: FeedbackSeverity.SUGGESTION,
      warning: FeedbackSeverity.WARNING,
      error: FeedbackSeverity.ERROR,
    };

    return severityMap[severity.toLowerCase()] || FeedbackSeverity.INFO;
  }
}
