import { DROPOUT_RISK_QUEUE } from '../queues/queue.constants';
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { DropoutRiskAssessmentService } from '../services/dropout-risk-assessment.service';

@Processor(DROPOUT_RISK_QUEUE)
export class DropoutRiskProcessor {
  private readonly logger = new Logger(DropoutRiskProcessor.name);

  constructor(private readonly dropoutRiskService: DropoutRiskAssessmentService) {}

  @Process('assess-batch-dropout-risk')
  async processBatchDropoutRiskAssessment(job: Job<{ studentIds: string[]; courseId?: string }>) {
    const { studentIds, courseId } = job.data;

    try {
      this.logger.debug(
        `Processing batch dropout risk assessment for ${studentIds.length} students`,
      );

      let assessed = 0;
      const total = studentIds.length;
      const results: any = [];

      for (const studentId of studentIds) {
        try {
          const assessment = await this.dropoutRiskService.assessDropoutRisk(studentId, courseId);

          results.push({
            studentId,
            assessmentId: assessment.id,
            riskLevel: assessment.riskLevel,
            interventionRequired: assessment.interventionRequired,
            status: 'success',
          });

          assessed++;
          await job.progress(Math.round((assessed / total) * 100));
        } catch (error) {
          this.logger.warn(
            `Failed to assess dropout risk for student ${studentId}: ${error.message}`,
          );
          results.push({
            studentId,
            status: 'failed',
            error: error.message,
          });
        }
      }

      this.logger.log(`Batch dropout risk assessment completed: ${assessed}/${total} successful`);

      return {
        assessed,
        total,
        results,
        completedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Error processing batch dropout risk assessment: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Process('monitor-high-risk-students')
  async processHighRiskStudentMonitoring(job: Job<{ courseId?: string }>) {
    const { courseId } = job.data;

    try {
      this.logger.debug(`Processing high-risk student monitoring`);

      // Get current high-risk students
      const highRiskStudents = await this.dropoutRiskService.getHighRiskStudents(courseId);

      const alerts: any = [];

      for (const assessment of highRiskStudents) {
        // Check if risk has increased since last assessment
        const riskIncrease = await this.checkRiskIncrease(assessment);

        if (riskIncrease) {
          alerts.push({
            studentId: assessment.studentId,
            courseId: assessment.courseId,
            currentRisk: assessment.riskLevel,
            trend: 'increasing',
          });
        }
      }

      if (alerts.length > 0) {
        await this.sendRiskAlerts(alerts);
      }

      this.logger.log(`High-risk student monitoring completed: ${alerts.length} alerts generated`);

      return {
        monitored: highRiskStudents.length,
        alerts: alerts.length,
        completedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Error processing high-risk student monitoring: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async checkRiskIncrease(_assessment: any): Promise<boolean> {
    // Check if risk has increased compared to previous assessments
    // This would compare with historical data
    return Math.random() > 0.8; // Placeholder
  }

  private async sendRiskAlerts(alerts: any[]): Promise<void> {
    // Send risk alerts to appropriate stakeholders
    this.logger.warn(`Sending risk alerts for ${alerts.length} students`);
    // Implementation would send actual notifications
  }
}
