import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

import { GradingService } from '../services/grading.service';
import { FeedbackService } from '../services/feedback.service';
import { AssessmentService } from '../../assessment/services/assessment.service';
import { UserType } from '@/common/enums/user.enums';
import { WinstonService } from '@/logger/winston.service';

@ApiTags('Manual Grading')
@Controller('manual-grading')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ManualGradingController {
  constructor(
    private readonly gradingService: GradingService,
    private readonly feedbackService: FeedbackService,
    private readonly _assessmentService: AssessmentService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(ManualGradingController.name);
  }

  @Get('queue')
  @Roles(UserType.TEACHER, UserType.ADMIN)
  @ApiOperation({ summary: 'Get list of submissions awaiting manual grading' })
  @ApiQuery({ name: 'assessmentId', required: false })
  @ApiQuery({ name: 'courseId', required: false })
  @ApiResponse({ status: 200, description: 'Grading queue retrieved successfully' })
  async getGradingQueue(
    @Query('assessmentId') assessmentId?: string,
    @Query('courseId') courseId?: string,
    @Request() _req?: any,
  ): Promise<any> {
    const query: any = {
      page: 1,
      limit: 50,
      status: 'pending',
    };

    if (assessmentId) query.assessmentId = assessmentId;
    if (courseId) query.courseId = courseId;

    const result = await this.gradingService.findGrades(query);

    const manualGradingItems = result.data.filter(_grade => {
      // This would need logic to determine which items need manual grading
      return true; // Placeholder
    });

    return {
      ...result,
      items: manualGradingItems,
    };
  }

  @Get('submission/:attemptId')
  @Roles(UserType.TEACHER, UserType.ADMIN)
  @ApiOperation({ summary: 'Get submission details for manual grading' })
  @ApiParam({ name: 'attemptId', description: 'Assessment attempt ID' })
  @ApiResponse({ status: 200, description: 'Submission details retrieved successfully' })
  async getSubmissionForGrading(
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
  ): Promise<any> {
    // This would fetch the assessment attempt with all details needed for grading
    // Including questions, student answers, rubrics, etc.

    const submission = {
      attemptId,
      // ... other submission details
      message: 'Manual grading interface data would be returned here',
    };

    return submission;
  }

  @Post('grade/:attemptId')
  @Roles(UserType.TEACHER, UserType.ADMIN)
  @ApiOperation({ summary: 'Submit manual grade for an attempt' })
  @ApiParam({ name: 'attemptId', description: 'Assessment attempt ID' })
  @ApiResponse({ status: 201, description: 'Manual grade submitted successfully' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async submitManualGrade(
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @Body() gradeData: any,
    @Request() req: any,
  ): Promise<any> {
    this.logger.log(`Submitting manual grade for attempt ${attemptId}`);

    const createGradeDto = {
      ...gradeData,
      attemptId,
      isAiGraded: false,
    };

    const grade = await this.gradingService.createGrade(createGradeDto, req.user.id);

    if (gradeData.feedback && gradeData.feedback.length > 0) {
      await this.feedbackService.bulkCreateFeedback(
        grade.id,
        gradeData.feedback,
        req.user.id,
        false,
      );
    }

    return {
      message: 'Grade submitted successfully',
      grade,
    };
  }

  @Get('statistics')
  @Roles(UserType.TEACHER, UserType.ADMIN)
  @ApiOperation({ summary: 'Get manual grading statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getGradingStatistics(@Request() _req: any): Promise<any> {
    return {
      pending: 0,
      completed: 0,
      avgTimePerGrade: 0,
      message: 'Manual grading statistics would be calculated here',
    };
  }
}
