import { DropoutRiskAssessmentService } from '../services/dropout-risk-assessment.service';
import {
  CreateDropoutRiskAssessmentDto,
  UpdateDropoutRiskAssessmentDto,
  DropoutRiskQueryDto,
} from '../dto/dropout-risk-assessment.dto';
import { DropoutRiskAssessmentResponseDto } from '../dto/predictive-analytics-responses.dto';
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

@ApiTags('Dropout Risk Assessments')
@Controller('predictive-analytics/dropout-risk')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DropoutRiskAssessmentController {
  constructor(private readonly dropoutRiskService: DropoutRiskAssessmentService) {}

  @Post()
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Create a new dropout risk assessment' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Dropout risk assessment created successfully',
    type: DropoutRiskAssessmentResponseDto,
  })
  async create(@Body() createDto: CreateDropoutRiskAssessmentDto) {
    return await this.dropoutRiskService.create(createDto);
  }

  @Get()
  @Roles('admin', 'instructor', 'student')
  @ApiOperation({ summary: 'Get all dropout risk assessments' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dropout risk assessments retrieved successfully',
    type: [DropoutRiskAssessmentResponseDto],
  })
  async findAll(@Query() query: DropoutRiskQueryDto, @CurrentUser() user: UserPayload) {
    // Students can only see their own assessments
    if (user.role === 'student') {
      query.studentId = user.sub;
    }

    return await this.dropoutRiskService.findAll(query);
  }

  @Get(':id')
  @Roles('admin', 'instructor', 'student')
  @ApiOperation({ summary: 'Get a dropout risk assessment by ID' })
  @ApiParam({ name: 'id', description: 'Dropout risk assessment ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dropout risk assessment retrieved successfully',
    type: DropoutRiskAssessmentResponseDto,
  })
  async findOne(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    const assessment = await this.dropoutRiskService.findOne(id);

    // Students can only see their own assessments
    if (user.role === 'student' && assessment.studentId !== user.sub) {
      throw new Error('Access denied');
    }

    return assessment;
  }

  @Patch(':id')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Update a dropout risk assessment' })
  @ApiParam({ name: 'id', description: 'Dropout risk assessment ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dropout risk assessment updated successfully',
    type: DropoutRiskAssessmentResponseDto,
  })
  async update(@Param('id') id: string, @Body() updateDto: UpdateDropoutRiskAssessmentDto) {
    return await this.dropoutRiskService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a dropout risk assessment' })
  @ApiParam({ name: 'id', description: 'Dropout risk assessment ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Dropout risk assessment deleted successfully',
  })
  async remove(@Param('id') id: string) {
    await this.dropoutRiskService.remove(id);
  }

  @Post('assess')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Assess dropout risk for a student' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Dropout risk assessment completed successfully',
    type: DropoutRiskAssessmentResponseDto,
  })
  async assessDropoutRisk(@Body() body: { studentId: string; courseId?: string }) {
    return await this.dropoutRiskService.assessDropoutRisk(body.studentId, body.courseId);
  }

  @Get('high-risk/students')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Get students with high dropout risk' })
  @ApiQuery({ name: 'courseId', required: false, description: 'Course ID filter' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'High risk students retrieved successfully',
    type: [DropoutRiskAssessmentResponseDto],
  })
  async getHighRiskStudents(@Query('courseId') courseId?: string) {
    return await this.dropoutRiskService.getHighRiskStudents(courseId);
  }

  @Post('schedule-assessments')
  @Roles('admin')
  @ApiOperation({ summary: 'Schedule regular dropout risk assessments' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Regular assessments scheduled successfully',
  })
  async scheduleRegularAssessments() {
    await this.dropoutRiskService.scheduleRegularAssessments();
    return { message: 'Regular assessments scheduled successfully' };
  }
}
