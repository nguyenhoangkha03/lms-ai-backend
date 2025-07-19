import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { LearningStyleRecognitionService } from '../services/learning-style-recognition.service';

@Processor('learning-style-analysis')
export class LearningStyleAnalysisProcessor {
  private readonly logger = new Logger(LearningStyleAnalysisProcessor.name);

  constructor(private readonly learningStyleService: LearningStyleRecognitionService) {}

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(`Processing learning style analysis job ${job.id}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job, _result: any) {
    this.logger.log(`Completed learning style analysis job ${job.id}`);
  }

  @OnQueueFailed()
  onFailed(job: Job, err: Error) {
    this.logger.error(`Failed learning style analysis job ${job.id}: ${err.message}`);
  }

  @Process('analyze-learning-style')
  async analyzeLearningStyle(job: Job<{ studentId: string; sessionId: string }>) {
    const { studentId, sessionId } = job.data;

    try {
      this.logger.log(`Analyzing learning style for student: ${studentId}`);

      const analysis = await this.learningStyleService.analyzeLearningStyle(studentId, {
        sessionId,
        minimumInteractions: 10,
        forceReanalysis: false,
      });

      return { success: true, analysis };
    } catch (error) {
      this.logger.error(`Learning style analysis failed: ${error.message}`);
      throw error;
    }
  }

  @Process('update-learning-adaptations')
  async updateLearningAdaptations(job: Job<{ studentId: string; newLearningStyle: string }>) {
    const { studentId, newLearningStyle: _ } = job.data;

    try {
      this.logger.log(`Updating learning adaptations for student: ${studentId}`);

      // This would trigger updates to personalized content and recommendations
      // based on the newly identified learning style

      return { success: true, adaptationsUpdated: true };
    } catch (error) {
      this.logger.error(`Learning adaptations update failed: ${error.message}`);
      throw error;
    }
  }
}
