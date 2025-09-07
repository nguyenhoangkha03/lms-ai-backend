import {
  Controller,
  Get,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { UserType } from '@/common/enums/user.enums';
import { TeacherService } from '../services/teacher.service';
import { WinstonService } from '@/logger/winston.service';

@ApiTags('Teacher')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.TEACHER)
@Controller('teacher')
export class TeacherController {
  constructor(
    private readonly teacherService: TeacherService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(TeacherController.name);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get teacher profile' })
  @ApiResponse({ status: 200, description: 'Teacher profile retrieved successfully' })
  async getProfile(@CurrentUser('id') teacherId: string) {
    this.logger.log(`Getting profile for teacher: ${teacherId}`);

    const profile = await this.teacherService.getTeacherProfile(teacherId);

    return {
      success: true,
      message: 'Teacher profile retrieved successfully',
      data: profile,
    };
  }

  @Get('submissions')
  @ApiOperation({ summary: 'Get all submissions for teacher across all assignments' })
  @ApiQuery({ name: 'courseId', required: false, type: String })
  @ApiQuery({ name: 'assignmentId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Submissions retrieved successfully' })
  async getAllSubmissions(
    @CurrentUser('id') teacherId: string,
    @Query('courseId') courseId?: string,
    @Query('assignmentId') assignmentId?: string,
    @Query('status') status?: string,
    @Query('limit') limit = 20,
    @Query('offset') offset = 0,
  ): Promise<{
    success: boolean;
    message: string;
    data: any[];
    pagination: { total: number; limit: number; offset: number };
  }> {
    this.logger.log(`Getting all submissions for teacher: ${teacherId}`);

    const result = await this.teacherService.getAllSubmissions(teacherId, {
      courseId,
      assignmentId, 
      status,
      limit: Number(limit),
      offset: Number(offset),
    });

    return {
      success: true,
      message: 'Submissions retrieved successfully',
      data: result.submissions,
      pagination: result.pagination,
    };
  }
}