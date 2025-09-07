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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { UserType } from '@/common/enums/user.enums';
import { TeacherAnnouncementsService } from '../services/teacher-announcements.service';
import { WinstonService } from '@/logger/winston.service';

@ApiTags('Teacher Announcements')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.TEACHER)
@Controller('teacher/announcements')
export class TeacherAnnouncementsController {
  constructor(
    private readonly teacherAnnouncementsService: TeacherAnnouncementsService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(TeacherAnnouncementsController.name);
  }

  @Get()
  @ApiOperation({ summary: 'Get all announcements' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'courseId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ['draft', 'published', 'archived'] })
  @ApiResponse({ status: 200, description: 'Announcements retrieved successfully' })
  async getAnnouncements(
    @CurrentUser('id') teacherId: string,
    @Query('limit') limit = 20,
    @Query('offset') offset = 0,
    @Query('courseId') courseId?: string,
    @Query('status') status?: 'draft' | 'published' | 'archived',
  ): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    this.logger.log(`Getting announcements for teacher: ${teacherId}`);

    const announcements = await this.teacherAnnouncementsService.getAnnouncements(
      teacherId,
      {
        limit: Number(limit),
        offset: Number(offset),
        courseId,
        status,
      }
    );

    return {
      success: true,
      message: 'Announcements retrieved successfully',
      data: announcements,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get announcement by ID' })
  @ApiResponse({ status: 200, description: 'Announcement retrieved successfully' })
  async getAnnouncementById(
    @CurrentUser('id') teacherId: string,
    @Param('id') announcementId: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    this.logger.log(`Getting announcement ${announcementId} for teacher: ${teacherId}`);

    const announcement = await this.teacherAnnouncementsService.getAnnouncementById(
      teacherId,
      announcementId
    );

    return {
      success: true,
      message: 'Announcement retrieved successfully',
      data: announcement,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create new announcement' })
  @ApiResponse({ status: 201, description: 'Announcement created successfully' })
  async createAnnouncement(
    @CurrentUser('id') teacherId: string,
    @Body() createAnnouncementDto: {
      title: string;
      content: string;
      courseId?: string;
      targetAudience: 'all_students' | 'specific_course' | 'specific_students';
      specificStudentIds?: string[];
      priority: 'low' | 'medium' | 'high' | 'urgent';
      scheduledAt?: string;
      expiresAt?: string;
      attachments?: string[];
      tags?: string[];
      allowComments: boolean;
      sendEmail: boolean;
      sendPush: boolean;
    },
  ): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    this.logger.log(`Creating announcement for teacher: ${teacherId}`);

    const announcement = await this.teacherAnnouncementsService.createAnnouncement(
      teacherId,
      createAnnouncementDto
    );

    return {
      success: true,
      message: 'Announcement created successfully',
      data: announcement,
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update announcement' })
  @ApiResponse({ status: 200, description: 'Announcement updated successfully' })
  async updateAnnouncement(
    @CurrentUser('id') teacherId: string,
    @Param('id') announcementId: string,
    @Body() updateAnnouncementDto: {
      title?: string;
      content?: string;
      courseId?: string;
      targetAudience?: 'all_students' | 'specific_course' | 'specific_students';
      specificStudentIds?: string[];
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      scheduledAt?: string;
      expiresAt?: string;
      attachments?: string[];
      tags?: string[];
      allowComments?: boolean;
      sendEmail?: boolean;
      sendPush?: boolean;
      status?: 'draft' | 'published' | 'archived';
    },
  ): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    this.logger.log(`Updating announcement ${announcementId} for teacher: ${teacherId}`);

    const announcement = await this.teacherAnnouncementsService.updateAnnouncement(
      teacherId,
      announcementId,
      updateAnnouncementDto
    );

    return {
      success: true,
      message: 'Announcement updated successfully',
      data: announcement,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete announcement' })
  @ApiResponse({ status: 200, description: 'Announcement deleted successfully' })
  async deleteAnnouncement(
    @CurrentUser('id') teacherId: string,
    @Param('id') announcementId: string,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    this.logger.log(`Deleting announcement ${announcementId} for teacher: ${teacherId}`);

    await this.teacherAnnouncementsService.deleteAnnouncement(teacherId, announcementId);

    return {
      success: true,
      message: 'Announcement deleted successfully',
    };
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish announcement' })
  @ApiResponse({ status: 200, description: 'Announcement published successfully' })
  async publishAnnouncement(
    @CurrentUser('id') teacherId: string,
    @Param('id') announcementId: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    this.logger.log(`Publishing announcement ${announcementId} for teacher: ${teacherId}`);

    const announcement = await this.teacherAnnouncementsService.publishAnnouncement(
      teacherId,
      announcementId
    );

    return {
      success: true,
      message: 'Announcement published successfully',
      data: announcement,
    };
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive announcement' })
  @ApiResponse({ status: 200, description: 'Announcement archived successfully' })
  async archiveAnnouncement(
    @CurrentUser('id') teacherId: string,
    @Param('id') announcementId: string,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    this.logger.log(`Archiving announcement ${announcementId} for teacher: ${teacherId}`);

    await this.teacherAnnouncementsService.archiveAnnouncement(teacherId, announcementId);

    return {
      success: true,
      message: 'Announcement archived successfully',
    };
  }

  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get announcement analytics' })
  @ApiResponse({ status: 200, description: 'Announcement analytics retrieved successfully' })
  async getAnnouncementAnalytics(
    @CurrentUser('id') teacherId: string,
    @Param('id') announcementId: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    this.logger.log(`Getting analytics for announcement ${announcementId}, teacher: ${teacherId}`);

    const analytics = await this.teacherAnnouncementsService.getAnnouncementAnalytics(
      teacherId,
      announcementId
    );

    return {
      success: true,
      message: 'Announcement analytics retrieved successfully',
      data: analytics,
    };
  }

  @Get('statistics/overview')
  @ApiOperation({ summary: 'Get announcement statistics overview' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getAnnouncementStatistics(
    @CurrentUser('id') teacherId: string,
    @Query('dateRange') dateRange?: '7d' | '30d' | '90d' | '1y',
  ): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    this.logger.log(`Getting announcement statistics for teacher: ${teacherId}`);

    const statistics = await this.teacherAnnouncementsService.getAnnouncementStatistics(
      teacherId,
      dateRange || '30d'
    );

    return {
      success: true,
      message: 'Statistics retrieved successfully',
      data: statistics,
    };
  }

  @Post(':id/duplicate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Duplicate announcement' })
  @ApiResponse({ status: 200, description: 'Announcement duplicated successfully' })
  async duplicateAnnouncement(
    @CurrentUser('id') teacherId: string,
    @Param('id') announcementId: string,
    @Body() duplicateOptions?: {
      title?: string;
      courseId?: string;
    },
  ): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    this.logger.log(`Duplicating announcement ${announcementId} for teacher: ${teacherId}`);

    const announcement = await this.teacherAnnouncementsService.duplicateAnnouncement(
      teacherId,
      announcementId,
      duplicateOptions
    );

    return {
      success: true,
      message: 'Announcement duplicated successfully',
      data: announcement,
    };
  }

  @Post('bulk-actions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Perform bulk actions on announcements' })
  @ApiResponse({ status: 200, description: 'Bulk actions completed successfully' })
  async bulkActions(
    @CurrentUser('id') teacherId: string,
    @Body() bulkActionDto: {
      announcementIds: string[];
      action: 'publish' | 'archive' | 'delete';
    },
  ): Promise<{
    success: boolean;
    message: string;
    data: { processedCount: number };
  }> {
    this.logger.log(`Performing bulk action ${bulkActionDto.action} for teacher: ${teacherId}`);

    const result = await this.teacherAnnouncementsService.bulkActions(
      teacherId,
      bulkActionDto.announcementIds,
      bulkActionDto.action
    );

    return {
      success: true,
      message: 'Bulk actions completed successfully',
      data: result,
    };
  }
}