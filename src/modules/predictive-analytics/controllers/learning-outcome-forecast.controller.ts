import { LearningOutcomeForecastResponseDto } from '../dto/predictive-analytics-responses.dto';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { UserPayload } from '@/common/interfaces/user-payload.interface';
import { LearningOutcomeForecastService } from '../services/learning-outcome-forecast.service';
import {
  CreateLearningOutcomeForecastDto,
  LearningOutcomeQueryDto,
  UpdateLearningOutcomeForecastDto,
} from '../dto/learning-outcome-forecast.dto';
import { OutcomeType } from '../entities/learning-outcome-forecast.entity';

@ApiTags('Learning Outcome Forecasts')
@Controller('predictive-analytics/learning-outcomes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LearningOutcomeForecastController {
  constructor(private readonly learningOutcomeService: LearningOutcomeForecastService) {}

  @Post()
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Create a new learning outcome forecast' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Learning outcome forecast created successfully',
    type: LearningOutcomeForecastResponseDto,
  })
  async create(@Body() createDto: CreateLearningOutcomeForecastDto) {
    return await this.learningOutcomeService.create(createDto);
  }

  @Get()
  @Roles('admin', 'instructor', 'student')
  @ApiOperation({ summary: 'Get all learning outcome forecasts' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Learning outcome forecasts retrieved successfully',
    type: [LearningOutcomeForecastResponseDto],
  })
  async findAll(@Query() query: LearningOutcomeQueryDto, @CurrentUser() user: UserPayload) {
    // Students can only see their own forecasts
    if (user.role === 'student') {
      query.studentId = user.sub;
    }

    return await this.learningOutcomeService.findAll(query);
  }

  @Get(':id')
  @Roles('admin', 'instructor', 'student')
  @ApiOperation({ summary: 'Get a learning outcome forecast by ID' })
  @ApiParam({ name: 'id', description: 'Learning outcome forecast ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Learning outcome forecast retrieved successfully',
    type: LearningOutcomeForecastResponseDto,
  })
  async findOne(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    const forecast = await this.learningOutcomeService.findOne(id);

    // Students can only see their own forecasts
    if (user.role === 'student' && forecast.studentId !== user.sub) {
      throw new Error('Access denied');
    }

    return forecast;
  }

  @Patch(':id')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Update a learning outcome forecast' })
  @ApiParam({ name: 'id', description: 'Learning outcome forecast ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Learning outcome forecast updated successfully',
    type: LearningOutcomeForecastResponseDto,
  })
  async update(@Param('id') id: string, @Body() updateDto: UpdateLearningOutcomeForecastDto) {
    return await this.learningOutcomeService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a learning outcome forecast' })
  @ApiParam({ name: 'id', description: 'Learning outcome forecast ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Learning outcome forecast deleted successfully',
  })
  async remove(@Param('id') id: string) {
    await this.learningOutcomeService.remove(id);
  }

  @Post('generate')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Generate a new learning outcome forecast' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Learning outcome forecast generated successfully',
    type: LearningOutcomeForecastResponseDto,
  })
  async generateForecast(
    @Body()
    body: {
      studentId: string;
      courseId: string;
      outcomeType: OutcomeType;
      targetDate: string;
    },
  ) {
    return await this.learningOutcomeService.generateForecast(
      body.studentId,
      body.courseId,
      body.outcomeType,
      new Date(body.targetDate),
    );
  }

  @Get('summary/:studentId')
  @Roles('admin', 'instructor', 'student')
  @ApiOperation({ summary: 'Get forecast summary for a student' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiQuery({ name: 'courseId', required: false, description: 'Course ID filter' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Forecast summary retrieved successfully',
  })
  async getForecastSummary(
    @Param('studentId') studentId: string,
    @CurrentUser() user: UserPayload,
    @Query('courseId') courseId?: string,
  ) {
    // Students can only see their own summary
    if (user.role === 'student' && studentId !== user.sub) {
      throw new Error('Access denied');
    }

    return await this.learningOutcomeService.getForecastSummary(studentId, courseId);
  }
}
