import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { CourseService } from '../services/course.service';
import { Authorize } from '../../auth/decorators/authorize.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '@/modules/user/entities/user.entity';
import { PermissionAction, PermissionResource, UserType } from '@/common/enums/user.enums';
import { CreateEnrollmentDto } from '../dto/enrollments/create-enrollment.dto';
import { Enrollment } from '../entities/enrollment.entity';

@ApiTags('Enrollments')
@Controller('enrollments')
export class EnrollmentController {
  constructor(private readonly courseService: CourseService) {}

  @Post()
  @Authorize({
    roles: [UserType.STUDENT, UserType.ADMIN],
  })
  @ApiOperation({
    summary: 'Enroll in a course',
    description: 'Đăng ký học khóa học',
  })
  @ApiResponse({
    status: 201,
    description: 'Successfully enrolled in course',
    type: Enrollment,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @HttpCode(HttpStatus.CREATED)
  async enrollInCourse(
    @Body() enrollmentDto: CreateEnrollmentDto,
    @CurrentUser() user: User,
  ): Promise<Enrollment> {
    return this.courseService.enrollUserInCourse(user.id, enrollmentDto.courseId);
  }

  @Get('check/:courseId')
  @Authorize({
    roles: [UserType.STUDENT, UserType.ADMIN],
  })
  @ApiOperation({
    summary: 'Check if user is enrolled in a course',
    description: 'Kiểm tra xem user có enrolled trong khóa học hay không',
  })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({
    status: 200,
    description: 'Enrollment status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        isEnrolled: { type: 'boolean', example: true },
        enrollment: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            enrolledAt: { type: 'string', format: 'date-time' },
            status: { type: 'string', enum: ['active', 'paused', 'completed'] },
            progress: { type: 'number', minimum: 0, maximum: 100 },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async checkEnrollmentStatus(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @CurrentUser() user: User,
  ) {
    const enrollment = await this.courseService.getUserEnrollmentForCourse(user.id, courseId);

    return {
      isEnrolled: !!enrollment,
      enrollment: enrollment || null,
    };
  }

  @Get('my')
  @Authorize({
    roles: [UserType.STUDENT, UserType.ADMIN],
  })
  @ApiOperation({
    summary: 'Get user enrollments',
    description: 'Lấy danh sách khóa học mà user đã đăng ký',
  })
  @ApiResponse({
    status: 200,
    description: 'User enrollments retrieved successfully',
    type: [Enrollment],
  })
  async getUserEnrollments(
    @CurrentUser() user: User,
    @Query('status') status?: 'active' | 'completed' | 'paused',
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.courseService.getUserEnrollments(user.id, {
      status,
      page,
      limit,
    });
  }
}
