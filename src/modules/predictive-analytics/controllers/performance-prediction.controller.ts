import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { UserPayload } from '@/common/interfaces/user-payload.interface';
import { PerformancePredictionService } from '../services/performance-prediction.service';
import {
  CreatePerformancePredictionDto,
  UpdatePerformancePredictionDto,
  PerformancePredictionQueryDto,
} from '../dto/performance-prediction.dto';
import { PerformancePredictionResponseDto } from '../dto/predictive-analytics-responses.dto';
import { PredictionType } from '../entities/performance-prediction.entity';

@ApiTags('Performance Predictions')
@Controller('predictive-analytics/performance-predictions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PerformancePredictionController {
  constructor(private readonly performancePredictionService: PerformancePredictionService) {}

  @Post()
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Create a new performance prediction' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Performance prediction created successfully',
    type: PerformancePredictionResponseDto,
  })
  async create(@Body() createDto: CreatePerformancePredictionDto) {
    return await this.performancePredictionService.create(createDto);
  }

  @Get()
  @Roles('admin', 'instructor', 'student')
  @ApiOperation({ summary: 'Get all performance predictions' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Performance predictions retrieved successfully',
    type: [PerformancePredictionResponseDto],
  })
  async findAll(@Query() query: PerformancePredictionQueryDto, @CurrentUser() user: UserPayload) {
    // Students can only see their own predictions
    if (user.role === 'student') {
      query.studentId = user.sub;
    }

    return await this.performancePredictionService.findAll(query);
  }

  @Get(':id')
  @Roles('admin', 'instructor', 'student')
  @ApiOperation({ summary: 'Get a performance prediction by ID' })
  @ApiParam({ name: 'id', description: 'Performance prediction ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Performance prediction retrieved successfully',
    type: PerformancePredictionResponseDto,
  })
  async findOne(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    const prediction = await this.performancePredictionService.findOne(id);

    // Students can only see their own predictions
    if (user.role === 'student' && prediction.studentId !== user.sub) {
      throw new Error('Access denied');
    }

    return prediction;
  }

  @Patch(':id')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Update a performance prediction' })
  @ApiParam({ name: 'id', description: 'Performance prediction ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Performance prediction updated successfully',
    type: PerformancePredictionResponseDto,
  })
  async update(@Param('id') id: string, @Body() updateDto: UpdatePerformancePredictionDto) {
    return await this.performancePredictionService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a performance prediction' })
  @ApiParam({ name: 'id', description: 'Performance prediction ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Performance prediction deleted successfully',
  })
  async remove(@Param('id') id: string) {
    await this.performancePredictionService.remove(id);
  }

  @Post('generate')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Generate a new performance prediction using AI' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Performance prediction generated successfully',
    type: PerformancePredictionResponseDto,
  })
  async generatePrediction(
    @Body() body: { studentId: string; courseId?: string; predictionType?: PredictionType },
  ) {
    return await this.performancePredictionService.generatePrediction(
      body.studentId,
      body.courseId,
      body.predictionType,
    );
  }

  @Post('validate')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Validate existing predictions against actual outcomes' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Predictions validated successfully',
  })
  async validatePredictions() {
    await this.performancePredictionService.validatePredictions();
    return { message: 'Prediction validation completed' };
  }

  @Get('trends/:studentId')
  @Roles('admin', 'instructor', 'student')
  @ApiOperation({ summary: 'Get performance trends for a student' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to analyze' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Performance trends retrieved successfully',
  })
  async getPerformanceTrends(
    @Param('studentId') studentId: string,
    @Query('days') days: number = 30,
    @CurrentUser() user: UserPayload,
  ) {
    // Students can only see their own trends
    if (user.role === 'student' && studentId !== user.sub) {
      throw new Error('Access denied');
    }

    return await this.performancePredictionService.getPerformanceTrends(studentId, days);
  }
}
