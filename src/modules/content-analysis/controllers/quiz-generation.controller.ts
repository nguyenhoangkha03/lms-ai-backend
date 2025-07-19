import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { QuizGenerationService } from '../services/quiz-generation.service';
import {
  GenerateQuizDto,
  ReviewGeneratedQuizDto,
  UpdateGeneratedQuizDto,
  QuizGenerationQueryDto,
} from '../dto/quiz-generation.dto';
import { GeneratedQuizResponseDto } from '../dto/content-analysis-responses.dto';

@ApiTags('Content Analysis - Quiz Generation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('content-analysis/quiz-generation')
export class QuizGenerationController {
  constructor(private readonly quizGenerationService: QuizGenerationService) {}

  @Post('generate')
  @Roles('teacher', 'admin')
  @ApiOperation({ summary: 'Generate quiz from lesson content using AI' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Quiz generated successfully',
    type: GeneratedQuizResponseDto,
  })
  async generateQuiz(
    @Body() generateQuizDto: GenerateQuizDto,
    @Request() req,
  ): Promise<GeneratedQuizResponseDto> {
    return this.quizGenerationService.generateQuiz(generateQuizDto, req.user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Get generated quizzes with filtering' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Quizzes retrieved successfully',
    type: [GeneratedQuizResponseDto],
  })
  async getQuizzes(@Query() queryDto: QuizGenerationQueryDto): Promise<GeneratedQuizResponseDto[]> {
    return this.quizGenerationService.getQuizzes(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get generated quiz by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Quiz retrieved successfully',
    type: GeneratedQuizResponseDto,
  })
  async getQuizById(@Param('id') id: string): Promise<GeneratedQuizResponseDto> {
    return this.quizGenerationService.getQuizById(id);
  }

  @Get('lesson/:lessonId')
  @ApiOperation({ summary: 'Get generated quizzes for a lesson' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lesson quizzes retrieved successfully',
    type: [GeneratedQuizResponseDto],
  })
  async getQuizzesByLesson(
    @Param('lessonId') lessonId: string,
  ): Promise<GeneratedQuizResponseDto[]> {
    return this.quizGenerationService.getQuizzesByLesson(lessonId);
  }

  @Put(':id')
  @Roles('teacher', 'admin')
  @ApiOperation({ summary: 'Update a generated quiz' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Quiz updated successfully',
    type: GeneratedQuizResponseDto,
  })
  async updateQuiz(
    @Param('id') id: string,
    @Body() updateQuizDto: UpdateGeneratedQuizDto,
    @Request() req,
  ): Promise<GeneratedQuizResponseDto> {
    return this.quizGenerationService.updateQuiz(id, updateQuizDto, req.user.sub);
  }

  @Put(':id/review')
  @Roles('teacher', 'admin')
  @ApiOperation({ summary: 'Review a generated quiz' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Quiz reviewed successfully',
    type: GeneratedQuizResponseDto,
  })
  async reviewQuiz(
    @Param('id') id: string,
    @Body() reviewDto: ReviewGeneratedQuizDto,
    @Request() req,
  ): Promise<GeneratedQuizResponseDto> {
    return this.quizGenerationService.reviewQuiz(id, reviewDto, req.user.sub);
  }

  @Put(':id/approve')
  @Roles('teacher', 'admin')
  @ApiOperation({ summary: 'Approve a generated quiz' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Quiz approved successfully',
    type: GeneratedQuizResponseDto,
  })
  async approveQuiz(@Param('id') id: string, @Request() req): Promise<GeneratedQuizResponseDto> {
    return this.quizGenerationService.approveQuiz(id, req.user.sub);
  }

  @Put(':id/reject')
  @Roles('teacher', 'admin')
  @ApiOperation({ summary: 'Reject a generated quiz' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Quiz rejected successfully',
    type: GeneratedQuizResponseDto,
  })
  async rejectQuiz(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Request() req,
  ): Promise<GeneratedQuizResponseDto> {
    return this.quizGenerationService.rejectQuiz(id, body.reason, req.user.sub);
  }

  @Delete(':id')
  @Roles('teacher', 'admin')
  @ApiOperation({ summary: 'Delete a generated quiz' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Quiz deleted successfully' })
  async deleteQuiz(@Param('id') id: string): Promise<void> {
    return this.quizGenerationService.deleteQuiz(id);
  }
}
