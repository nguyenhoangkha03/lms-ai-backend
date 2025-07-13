import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
  ValidationPipe,
  UsePipes,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

import { GradingService } from '../services/grading.service';
import { AiEssayGradingService } from '../services/ai-essay-grading.service';
import { FeedbackService } from '../services/feedback.service';

import { CreateGradeDto } from '../dto/create-grade.dto';
import { UpdateGradeDto } from '../dto/update-grade.dto';
import { BulkGradeDto } from '../dto/bulk-grade.dto';
import { AutoGradeDto } from '../dto/auto-grade.dto';
import { GradeQueryDto } from '../dto/grade-query.dto';
import { AiEssayGradeDto } from '../dto/ai-essay-grade.dto';
import { CreateFeedbackDto } from '../dto/create-feedback.dto';

import { Grade } from '../entities/grade.entity';
import { Feedback } from '../entities/feedback.entity';
import { PaginatedResult } from '@/common/dto/pagination.dto';
import { UserType } from '@/common/enums/user.enums';
import { WinstonService } from '@/logger/winston.service';

@ApiTags('Grading')
@Controller('grading')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class GradingController {
  constructor(
    private readonly gradingService: GradingService,
    private readonly aiEssayGradingService: AiEssayGradingService,
    private readonly feedbackService: FeedbackService,
    private readonly logger: WinstonService,
  ) {}

  // ===== GRADE MANAGEMENT =====
  @Post()
  @Roles(UserType.TEACHER, UserType.ADMIN)
  @ApiOperation({ summary: 'Create a new grade' })
  @ApiResponse({ status: 201, description: 'Grade created successfully', type: Grade })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Assessment attempt not found' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async createGrade(@Body() createGradeDto: CreateGradeDto, @Request() req: any): Promise<Grade> {
    this.logger.log(`Creating grade for student ${createGradeDto.studentId}`);
    return this.gradingService.createGrade(createGradeDto, req.user.id);
  }

  @Get()
  @Roles(UserType.TEACHER, UserType.ADMIN)
  @ApiOperation({ summary: 'Get grades with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Grades retrieved successfully' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async findGrades(
    @Query() query: GradeQueryDto,
    @Request() req: any,
  ): Promise<PaginatedResult<Grade>> {
    if (req.user.userType === UserType.TEACHER) {
      // This would need additional logic to verify teacher access to courses
    }

    return this.gradingService.findGrades(query);
  }

  @Get(':id')
  @Roles(UserType.TEACHER, UserType.ADMIN, UserType.STUDENT)
  @ApiOperation({ summary: 'Get grade by ID' })
  @ApiParam({ name: 'id', description: 'Grade ID' })
  @ApiResponse({ status: 200, description: 'Grade retrieved successfully', type: Grade })
  @ApiResponse({ status: 404, description: 'Grade not found' })
  async findGradeById(@Param('id', ParseUUIDPipe) id: string, @Request() req: any): Promise<Grade> {
    const grade = await this.gradingService.findGradeById(id);

    if (req.user.userType === UserType.STUDENT && grade.studentId !== req.user.id) {
      throw new BadRequestException('You can only view your own grades');
    }

    return grade;
  }

  @Put(':id')
  @Roles(UserType.TEACHER, UserType.ADMIN)
  @ApiOperation({ summary: 'Update grade' })
  @ApiParam({ name: 'id', description: 'Grade ID' })
  @ApiResponse({ status: 200, description: 'Grade updated successfully', type: Grade })
  @ApiResponse({ status: 404, description: 'Grade not found' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateGrade(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateGradeDto: UpdateGradeDto,
    @Request() req: any,
  ): Promise<Grade> {
    return this.gradingService.updateGrade(id, updateGradeDto, req.user.id);
  }

  @Delete(':id')
  @Roles(UserType.TEACHER, UserType.ADMIN)
  @ApiOperation({ summary: 'Delete grade' })
  @ApiParam({ name: 'id', description: 'Grade ID' })
  @ApiResponse({ status: 204, description: 'Grade deleted successfully' })
  @ApiResponse({ status: 404, description: 'Grade not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteGrade(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.gradingService.deleteGrade(id);
  }

  // ===== AUTOMATIC GRADING =====
  @Post('auto-grade/multiple-choice')
  @Roles(UserType.TEACHER, UserType.ADMIN)
  @ApiOperation({ summary: 'Auto-grade multiple choice questions' })
  @ApiResponse({ status: 201, description: 'Auto-grading completed', type: Grade })
  @UsePipes(new ValidationPipe({ transform: true }))
  async autoGradeMultipleChoice(
    @Body() autoGradeDto: AutoGradeDto,
    @Request() req: any,
  ): Promise<Grade> {
    this.logger.log(`Auto-grading attempt ${autoGradeDto.attemptId}`);
    return this.gradingService.autoGradeMultipleChoice(autoGradeDto.attemptId, req.user.id);
  }

  @Post('ai-grade/essay')
  @Roles(UserType.TEACHER, UserType.ADMIN)
  @ApiOperation({ summary: 'Grade essay using AI' })
  @ApiResponse({ status: 201, description: 'AI essay grading completed' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async gradeEssayWithAi(
    @Body() aiEssayGradeDto: AiEssayGradeDto,
    @Request() req: any,
  ): Promise<any> {
    this.logger.log(`AI grading essay for question ${aiEssayGradeDto.questionId}`);

    const result = await this.aiEssayGradingService.gradeEssay(aiEssayGradeDto);

    const createGradeDto: CreateGradeDto = {
      studentId: req.body.studentId,
      assessmentId: req.body.assessmentId,
      attemptId: req.body.attemptId,
      score: result.score,
      maxScore: result.maxScore,
      isAiGraded: true,
      aiConfidence: result.confidence,
      overallFeedback: result.overallFeedback,
    };

    const grade = await this.gradingService.createGrade(createGradeDto, req.user.id);

    if (result.feedback && result.feedback.length > 0) {
      await this.feedbackService.bulkCreateFeedback(grade.id, result.feedback, req.user.id, true);
    }

    return {
      grade,
      aiResult: result,
    };
  }

  // ===== BULK OPERATIONS =====
  @Post('bulk')
  @Roles(UserType.TEACHER, UserType.ADMIN)
  @ApiOperation({ summary: 'Create multiple grades at once' })
  @ApiResponse({ status: 201, description: 'Bulk grading completed' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async bulkGrade(@Body() bulkGradeDto: BulkGradeDto, @Request() req: any): Promise<Grade[]> {
    this.logger.log(`Bulk grading ${bulkGradeDto.grades.length} submissions`);
    return this.gradingService.bulkGrade(bulkGradeDto, req.user.id);
  }

  // ===== PUBLISHING =====
  @Put(':id/publish')
  @Roles(UserType.TEACHER, UserType.ADMIN)
  @ApiOperation({ summary: 'Publish grade to student' })
  @ApiParam({ name: 'id', description: 'Grade ID' })
  @ApiResponse({ status: 200, description: 'Grade published successfully', type: Grade })
  async publishGrade(@Param('id', ParseUUIDPipe) id: string, @Request() req: any): Promise<Grade> {
    return this.gradingService.publishGrade(id, req.user.id);
  }

  @Put(':id/unpublish')
  @Roles(UserType.TEACHER, UserType.ADMIN)
  @ApiOperation({ summary: 'Unpublish grade from student' })
  @ApiParam({ name: 'id', description: 'Grade ID' })
  @ApiResponse({ status: 200, description: 'Grade unpublished successfully', type: Grade })
  async unpublishGrade(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<Grade> {
    return this.gradingService.unpublishGrade(id, req.user.id);
  }

  // ===== ANALYTICS =====
  @Get('analytics/assessment/:assessmentId')
  @Roles(UserType.TEACHER, UserType.ADMIN)
  @ApiOperation({ summary: 'Get grading statistics for an assessment' })
  @ApiParam({ name: 'assessmentId', description: 'Assessment ID' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getGradeStatistics(
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
  ): Promise<any> {
    return this.gradingService.getGradeStatistics(assessmentId);
  }

  // ===== FEEDBACK ENDPOINTS =====
  @Post('feedback')
  @Roles(UserType.TEACHER, UserType.ADMIN)
  @ApiOperation({ summary: 'Add feedback to a grade' })
  @ApiResponse({ status: 201, description: 'Feedback created successfully', type: Feedback })
  @UsePipes(new ValidationPipe({ transform: true }))
  async createFeedback(
    @Body() createFeedbackDto: CreateFeedbackDto,
    @Request() req: any,
  ): Promise<Feedback> {
    return this.feedbackService.createFeedback(createFeedbackDto, req.user.id);
  }

  @Get(':gradeId/feedback')
  @Roles(UserType.TEACHER, UserType.ADMIN, UserType.STUDENT)
  @ApiOperation({ summary: 'Get feedback for a grade' })
  @ApiParam({ name: 'gradeId', description: 'Grade ID' })
  @ApiResponse({ status: 200, description: 'Feedback retrieved successfully' })
  async getFeedbackByGrade(
    @Param('gradeId', ParseUUIDPipe) gradeId: string,
    @Request() req: any,
  ): Promise<Feedback[]> {
    const grade = await this.gradingService.findGradeById(gradeId);

    if (req.user.userType === UserType.STUDENT && grade.studentId !== req.user.id) {
      throw new BadRequestException('You can only view feedback for your own grades');
    }

    return this.feedbackService.findFeedbackByGrade(gradeId);
  }

  @Put('feedback/:feedbackId/rate')
  @Roles(UserType.STUDENT)
  @ApiOperation({ summary: 'Rate feedback helpfulness' })
  @ApiParam({ name: 'feedbackId', description: 'Feedback ID' })
  @ApiResponse({ status: 200, description: 'Feedback rated successfully' })
  async rateFeedback(
    @Param('feedbackId', ParseUUIDPipe) feedbackId: string,
    @Body('rating') rating: number,
    @Request() req: any,
  ): Promise<Feedback> {
    return this.feedbackService.updateFeedbackHelpfulness(feedbackId, rating, req.user.id);
  }
}
