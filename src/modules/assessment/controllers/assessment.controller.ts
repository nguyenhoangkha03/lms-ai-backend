import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Authorize } from '@/modules/auth/decorators/authorize.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { User } from '@/modules/user/entities/user.entity';
import { AssessmentService } from '../services/assessment.service';
import { QuestionBankService } from '../services/question-bank.service';
import { AssessmentRandomizationService } from '../services/assessment-randomization.service';
import { CreateAssessmentDto } from '../dto/create-assessment.dto';
import { UpdateAssessmentDto } from '../dto/update-assessment.dto';
import { AssessmentQueryDto } from '../dto/assessment-query.dto';
import { ConfigureAssessmentDto } from '../dto/assessment-configuration.dto';
import { CreateQuestionBankDto, QuestionBankQueryDto } from '../dto/question-bank.dto';
import { QuestionType } from '@/common/enums/assessment.enums';
import { DifficultyLevel } from '@/common/enums/assessment.enums';

@ApiTags('Assessment Creation')
@ApiBearerAuth()
@Controller('assessments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssessmentController {
  constructor(
    private readonly assessmentService: AssessmentService,
    private readonly questionBankService: QuestionBankService,
    private readonly randomizationService: AssessmentRandomizationService,
  ) {}

  // ================================
  // ASSESSMENT MANAGEMENT
  // ================================
  @Post()
  @Authorize({ permissions: ['create:assessment'] })
  @ApiOperation({ summary: 'Create new assessment' })
  @ApiResponse({ status: 201, description: 'Assessment created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid assessment data' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async createAssessment(
    @Body() createAssessmentDto: CreateAssessmentDto,
    @CurrentUser() user: User,
  ) {
    const assessment = await this.assessmentService.createAssessment(createAssessmentDto, user);
    return {
      message: 'Assessment created successfully',
      data: assessment,
    };
  }

  @Get()
  @Authorize({ permissions: ['read:assessment'] })
  @ApiOperation({ summary: 'Get assessments with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Assessments retrieved successfully' })
  async getAssessments(@Query() queryDto: AssessmentQueryDto, @CurrentUser() user: User) {
    const result = await this.assessmentService.getAssessments(queryDto, user);
    return {
      message: 'Assessments retrieved successfully',
      data: result.data,
      pagination: {
        page: result.meta.page,
        limit: result.meta.limit,
        total: result.meta.total,
        pages: result.meta.totalPages,
        hasNext: result.meta.hasNext,
        hasPrev: result.meta.hasPrev,
      },
    };
  }

  @Get(':id')
  @Authorize({ permissions: ['read:assessment'] })
  @ApiOperation({ summary: 'Get assessment by ID' })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  @ApiQuery({ name: 'includeQuestions', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Assessment found' })
  @ApiResponse({ status: 404, description: 'Assessment not found' })
  async getAssessment(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('includeQuestions') includeQuestions: boolean = false,
    @CurrentUser() user: User,
  ) {
    const assessment = await this.assessmentService.getAssessmentById(id, user, includeQuestions);
    return {
      message: 'Assessment retrieved successfully',
      data: assessment,
    };
  }

  @Put(':id')
  @Authorize({ permissions: ['update:assessment'] })
  @ApiOperation({ summary: 'Update assessment' })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  @ApiResponse({ status: 200, description: 'Assessment updated successfully' })
  @ApiResponse({ status: 404, description: 'Assessment not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async updateAssessment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAssessmentDto: UpdateAssessmentDto,
    @CurrentUser() user: User,
  ) {
    const assessment = await this.assessmentService.updateAssessment(id, updateAssessmentDto, user);
    return {
      message: 'Assessment updated successfully',
      data: assessment,
    };
  }

  @Delete(':id')
  @Authorize({ permissions: ['delete:assessment'] })
  @ApiOperation({ summary: 'Delete assessment' })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  @ApiResponse({ status: 204, description: 'Assessment deleted successfully' })
  @ApiResponse({ status: 404, description: 'Assessment not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAssessment(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    await this.assessmentService.deleteAssessment(id, user);
  }

  // ================================
  // ASSESSMENT CONFIGURATION
  // ================================
  @Patch(':id/configure')
  @Authorize({ permissions: ['update:assessment'] })
  @ApiOperation({ summary: 'Configure assessment settings' })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  @ApiResponse({ status: 200, description: 'Assessment configured successfully' })
  async configureAssessment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() configDto: ConfigureAssessmentDto,
    @CurrentUser() user: User,
  ) {
    const assessment = await this.assessmentService.configureAssessment(id, configDto, user);
    return {
      message: 'Assessment configured successfully',
      data: assessment,
    };
  }

  @Post(':id/publish')
  @Authorize({ permissions: ['publish:assessment'] })
  @ApiOperation({ summary: 'Publish assessment' })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  @ApiResponse({ status: 200, description: 'Assessment published successfully' })
  async publishAssessment(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    const assessment = await this.assessmentService.publishAssessment(id, user);
    return {
      message: 'Assessment published successfully',
      data: assessment,
    };
  }

  @Post(':id/archive')
  @Authorize({ permissions: ['update:assessment'] })
  @ApiOperation({ summary: 'Archive assessment' })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  @ApiResponse({ status: 200, description: 'Assessment archived successfully' })
  async archiveAssessment(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    const assessment = await this.assessmentService.archiveAssessment(id, user);
    return {
      message: 'Assessment archived successfully',
      data: assessment,
    };
  }

  @Post(':id/duplicate')
  @Authorize({ permissions: ['create:assessment'] })
  @ApiOperation({ summary: 'Duplicate assessment' })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  @ApiResponse({ status: 201, description: 'Assessment duplicated successfully' })
  async duplicateAssessment(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    const assessment = await this.assessmentService.duplicateAssessment(id, user);
    return {
      message: 'Assessment duplicated successfully',
      data: assessment,
    };
  }

  // ================================
  // ASSESSMENT STATISTICS
  // ================================
  @Get(':id/statistics')
  @Authorize({ permissions: ['read:assessment', 'view:statistics'] })
  @ApiOperation({ summary: 'Get assessment statistics' })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getAssessmentStatistics(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    const statistics = await this.assessmentService.getAssessmentStatistics(id, user);
    return {
      message: 'Assessment statistics retrieved successfully',
      data: statistics,
    };
  }

  // ================================
  // QUESTION MANAGEMENT
  // ================================
  @Post(':id/questions')
  @Authorize({ permissions: ['update:assessment'] })
  @ApiOperation({ summary: 'Add questions to assessment' })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  @ApiResponse({ status: 201, description: 'Questions added successfully' })
  async addQuestions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() questions: any[],
    @CurrentUser() user: User,
  ) {
    const addedQuestions = await this.assessmentService.addQuestionsToAssessment(
      id,
      questions,
      user,
    );
    return {
      message: 'Questions added successfully',
      data: addedQuestions,
    };
  }

  @Delete(':id/questions/:questionId')
  @Authorize({ permissions: ['update:assessment'] })
  @ApiOperation({ summary: 'Remove question from assessment' })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  @ApiParam({ name: 'questionId', description: 'Question ID' })
  @ApiResponse({ status: 204, description: 'Question removed successfully' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeQuestion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @CurrentUser() user: User,
  ) {
    await this.assessmentService.removeQuestionFromAssessment(id, questionId, user);
  }

  @Put(':id/questions/reorder')
  @Authorize({ permissions: ['update:assessment'] })
  @ApiOperation({ summary: 'Reorder questions in assessment' })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  @ApiResponse({ status: 200, description: 'Questions reordered successfully' })
  async reorderQuestions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { questionIds: string[] },
    @CurrentUser() _user: User,
  ) {
    await this.assessmentService.reorderQuestions(id, body.questionIds);
    return {
      message: 'Questions reordered successfully',
    };
  }

  // ================================
  // QUESTION BANK MANAGEMENT
  // ================================
  @Post('question-bank')
  @Authorize({ permissions: ['create:question'] })
  @ApiOperation({ summary: 'Create question in question bank' })
  @ApiResponse({ status: 201, description: 'Question created successfully' })
  async createQuestionBankQuestion(
    @Body() createQuestionDto: CreateQuestionBankDto,
    @CurrentUser() user: User,
  ) {
    const question = await this.questionBankService.createQuestion(createQuestionDto, user);
    return {
      message: 'Question created successfully',
      data: question,
    };
  }

  @Get('question-bank')
  @Authorize({ permissions: ['read:question'] })
  @ApiOperation({ summary: 'Get questions from question bank' })
  @ApiResponse({ status: 200, description: 'Questions retrieved successfully' })
  async getQuestionBankQuestions(
    @Query() queryDto: QuestionBankQueryDto,
    @CurrentUser() user: User,
  ) {
    const result = await this.questionBankService.getQuestions(queryDto, user);
    return {
      message: 'Questions retrieved successfully',
      data: result.data,
      pagination: {
        page: result.meta.page,
        limit: result.meta.limit,
        total: result.meta.total,
        pages: result.meta.totalPages,
        hasNext: result.meta.hasNext,
        hasPrev: result.meta.hasPrev,
      },
    };
  }

  @Get('question-bank/:id')
  @Authorize({ permissions: ['read:question'] })
  @ApiOperation({ summary: 'Get question bank question by ID' })
  @ApiParam({ name: 'id', description: 'Question ID' })
  @ApiResponse({ status: 200, description: 'Question found' })
  async getQuestionBankQuestion(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    const question = await this.questionBankService.getQuestionById(id, user);
    return {
      message: 'Question retrieved successfully',
      data: question,
    };
  }

  @Put('question-bank/:id')
  @Authorize({ permissions: ['update:question'] })
  @ApiOperation({ summary: 'Update question bank question' })
  @ApiParam({ name: 'id', description: 'Question ID' })
  @ApiResponse({ status: 200, description: 'Question updated successfully' })
  async updateQuestionBankQuestion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateData: Partial<CreateQuestionBankDto>,
    @CurrentUser() user: User,
  ) {
    const question = await this.questionBankService.updateQuestion(id, updateData, user);
    return {
      message: 'Question updated successfully',
      data: question,
    };
  }

  @Delete('question-bank/:id')
  @Authorize({ permissions: ['delete:question'] })
  @ApiOperation({ summary: 'Delete question from question bank' })
  @ApiParam({ name: 'id', description: 'Question ID' })
  @ApiResponse({ status: 204, description: 'Question deleted successfully' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteQuestionBankQuestion(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.questionBankService.deleteQuestion(id, user);
  }

  @Get('question-bank/statistics')
  @Authorize({ permissions: ['read:question', 'view:statistics'] })
  @ApiOperation({ summary: 'Get question bank statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getQuestionBankStatistics(@CurrentUser() user: User) {
    const statistics = await this.questionBankService.getQuestionBankStatistics(user);
    return {
      message: 'Question bank statistics retrieved successfully',
      data: statistics,
    };
  }

  @Post(':id/import-questions')
  @Authorize({ permissions: ['update:assessment'] })
  @ApiOperation({ summary: 'Import questions from question bank to assessment' })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  @ApiResponse({ status: 201, description: 'Questions imported successfully' })
  async importQuestionsFromBank(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { questionIds: string[] },
    @CurrentUser() user: User,
  ) {
    const questions = await this.questionBankService.importQuestionsToAssessment(
      body.questionIds,
      id,
      user,
    );
    return {
      message: 'Questions imported successfully',
      data: questions,
    };
  }

  @Get('question-bank/random')
  @Authorize({ permissions: ['read:question'] })
  @ApiOperation({ summary: 'Get random questions for assessment creation' })
  @ApiQuery({ name: 'count', required: true, type: Number })
  @ApiQuery({ name: 'questionType', required: false, enum: Object.values(QuestionType) })
  @ApiQuery({ name: 'difficulty', required: false, enum: Object.values(DifficultyLevel) })
  @ApiQuery({ name: 'subject', required: false, type: String })
  @ApiQuery({ name: 'topic', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Random questions retrieved successfully' })
  async getRandomQuestions(
    @CurrentUser() user: User,
    @Query('count') count: number,
    @Query('questionType') questionType?: QuestionType,
    @Query('difficulty') difficulty?: DifficultyLevel,
    @Query('subject') subject?: string,
    @Query('topic') topic?: string,
    @Query('excludeIds') excludeIds?: string,
  ) {
    const criteria = {
      questionType,
      difficulty,
      subject,
      topic,
      excludeIds: excludeIds ? excludeIds.split(',') : undefined,
    };

    const questions = await this.questionBankService.getRandomQuestions(count, criteria, user);
    return {
      message: 'Random questions retrieved successfully',
      data: questions,
    };
  }

  // ================================
  // ASSESSMENT PREVIEW & RANDOMIZATION
  // ================================
  @Get(':id/preview')
  @Authorize({ permissions: ['read:assessment'] })
  @ApiOperation({ summary: 'Preview assessment with randomization applied' })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  @ApiQuery({
    name: 'studentId',
    required: false,
    type: String,
    description: 'Student ID for personalized preview',
  })
  @ApiResponse({ status: 200, description: 'Assessment preview generated successfully' })
  async previewAssessment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Query('studentId') studentId?: string,
  ) {
    const assessment = await this.assessmentService.getAssessmentById(id, user, true);

    const previewStudentId = studentId || user.id;

    const instance = this.randomizationService.generateAssessmentInstance(
      assessment,
      assessment.questions || [],
      previewStudentId,
    );

    return {
      message: 'Assessment preview generated successfully',
      data: {
        assessment: instance.assessment,
        questions: instance.questions,
        metadata: instance.metadata,
      },
    };
  }

  @Get(':id/anti-cheat-preview')
  @Authorize({ permissions: ['read:assessment'] })
  @ApiOperation({ summary: 'Preview assessment with anti-cheating measures applied' })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  @ApiQuery({ name: 'studentId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Anti-cheat preview generated successfully' })
  async previewAssessmentWithAntiCheat(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Query('studentId') studentId?: string,
  ) {
    const assessment = await this.assessmentService.getAssessmentById(id, user, true);
    const previewStudentId = studentId || user.id;

    const result = this.randomizationService.applyAntiCheatMeasures(
      assessment,
      assessment.questions || [],
      previewStudentId,
    );

    return {
      message: 'Anti-cheat preview generated successfully',
      data: {
        assessment,
        questions: result.questions,
        antiCheatData: result.antiCheatData,
      },
    };
  }
}
