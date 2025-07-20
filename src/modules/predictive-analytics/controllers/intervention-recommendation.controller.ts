import { InterventionRecommendationService } from '../services/intervention-recommendation.service';
import {
  CreateInterventionRecommendationDto,
  UpdateInterventionRecommendationDto,
  InterventionRecommendationQueryDto,
} from '../dto/intervention-recommendation.dto';
import { InterventionRecommendationResponseDto } from '../dto/predictive-analytics-responses.dto';
import { InterventionOutcome } from '../entities/intervention-recommendation.entity';
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

@ApiTags('Intervention Recommendations')
@Controller('predictive-analytics/interventions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InterventionRecommendationController {
  constructor(private readonly interventionService: InterventionRecommendationService) {}

  @Post()
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Create a new intervention recommendation' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Intervention recommendation created successfully',
    type: InterventionRecommendationResponseDto,
  })
  async create(@Body() createDto: CreateInterventionRecommendationDto) {
    return await this.interventionService.create(createDto);
  }

  @Get()
  @Roles('admin', 'instructor', 'student')
  @ApiOperation({ summary: 'Get all intervention recommendations' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Intervention recommendations retrieved successfully',
    type: [InterventionRecommendationResponseDto],
  })
  async findAll(
    @Query() query: InterventionRecommendationQueryDto,
    @CurrentUser() user: UserPayload,
  ) {
    // Students can only see their own interventions
    if (user.role === 'student') {
      query.studentId = user.sub;
    }

    // Instructors can see interventions assigned to them
    if (user.role === 'instructor' && !query.assignedToId) {
      query.assignedToId = user.sub;
    }

    return await this.interventionService.findAll(query);
  }

  @Get(':id')
  @Roles('admin', 'instructor', 'student')
  @ApiOperation({ summary: 'Get an intervention recommendation by ID' })
  @ApiParam({ name: 'id', description: 'Intervention recommendation ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Intervention recommendation retrieved successfully',
    type: InterventionRecommendationResponseDto,
  })
  async findOne(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    const intervention = await this.interventionService.findOne(id);

    // Check access permissions
    if (user.role === 'student' && intervention.studentId !== user.sub) {
      throw new Error('Access denied');
    }

    if (user.role === 'instructor' && intervention.assignedToId !== user.sub) {
      throw new Error('Access denied');
    }

    return intervention;
  }

  @Patch(':id')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Update an intervention recommendation' })
  @ApiParam({ name: 'id', description: 'Intervention recommendation ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Intervention recommendation updated successfully',
    type: InterventionRecommendationResponseDto,
  })
  async update(@Param('id') id: string, @Body() updateDto: UpdateInterventionRecommendationDto) {
    return await this.interventionService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete an intervention recommendation' })
  @ApiParam({ name: 'id', description: 'Intervention recommendation ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Intervention recommendation deleted successfully',
  })
  async remove(@Param('id') id: string) {
    await this.interventionService.remove(id);
  }

  @Post('generate/:predictionId')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Generate intervention recommendations from a prediction' })
  @ApiParam({ name: 'predictionId', description: 'Performance prediction ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Intervention recommendations generated successfully',
    type: [InterventionRecommendationResponseDto],
  })
  async generateRecommendations(@Param('predictionId') predictionId: string) {
    return await this.interventionService.generateRecommendations(predictionId);
  }

  @Get('pending/list')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Get pending intervention recommendations' })
  @ApiQuery({ name: 'assignedToId', required: false, description: 'Assigned to user ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pending interventions retrieved successfully',
    type: [InterventionRecommendationResponseDto],
  })
  async getPendingInterventions(
    @CurrentUser() user: UserPayload,
    @Query('assignedToId') assignedToId?: string,
  ) {
    // If instructor, show only their assigned interventions
    if (user.role === 'instructor') {
      assignedToId = user.sub;
    }

    return await this.interventionService.getPendingInterventions(assignedToId);
  }

  @Post(':id/schedule')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Schedule an intervention' })
  @ApiParam({ name: 'id', description: 'Intervention recommendation ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Intervention scheduled successfully',
    type: InterventionRecommendationResponseDto,
  })
  async scheduleIntervention(
    @Param('id') id: string,
    @Body() body: { scheduledDate: string; assignedToId?: string },
  ) {
    return await this.interventionService.scheduleIntervention(
      id,
      new Date(body.scheduledDate),
      body.assignedToId,
    );
  }

  @Post(':id/complete')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Complete an intervention' })
  @ApiParam({ name: 'id', description: 'Intervention recommendation ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Intervention completed successfully',
    type: InterventionRecommendationResponseDto,
  })
  async completeIntervention(
    @Param('id') id: string,
    @Body()
    body: {
      outcome: InterventionOutcome;
      effectivenessScore: number;
      instructorNotes?: string;
      studentFeedback?: string;
    },
  ) {
    return await this.interventionService.completeIntervention(
      id,
      body.outcome,
      body.effectivenessScore,
      body.instructorNotes,
      body.studentFeedback,
    );
  }
}
