import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationService } from '../services/notification.service';
import { NotificationDeliveryService } from '../services/notification-delivery.service';
import {
  CreateNotificationDto,
  NotificationQueryDto,
  BulkNotificationDto,
  TestNotificationDto,
} from '../dto/notification.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { UserPayload } from '@/common/interfaces/user-payload.interface';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly deliveryService: NotificationDeliveryService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new notification' })
  @ApiResponse({ status: 201, description: 'Notification created successfully' })
  async create(@Body() createDto: CreateNotificationDto) {
    const notification = await this.notificationService.create(createDto);

    // Schedule delivery
    if (createDto.scheduledFor) {
      await this.deliveryService.scheduleNotification(notification.id, createDto.scheduledFor);
    } else {
      await this.deliveryService.deliverNotification(notification.id);
    }

    return {
      success: true,
      message: 'Notification created and scheduled for delivery',
      data: notification,
    };
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Send bulk notifications' })
  @ApiResponse({ status: 201, description: 'Bulk notifications created successfully' })
  async createBulk(@Body() bulkDto: BulkNotificationDto) {
    const results = await this.notificationService.createBulk(bulkDto);

    return {
      success: true,
      message: 'Bulk notifications created successfully',
      data: {
        created: results.length,
        notifications: results,
      },
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
  async findAll(@Query() query: NotificationQueryDto, @CurrentUser() user: UserPayload) {
    const result = await this.notificationService.findAllForUser(user.id, query);

    console.log(`User ${user.id} retrieved length ${result.data.length} notifications`);
    console.log(`User ${user.id} retrieved total ${result.total} notifications`);
    console.log(`User ${user.id} retrieved data ${result.data}`);

    return {
      success: true,
      message: 'Notifications retrieved successfully',
      data: {
        notifications: result.data,
        total: result.total,
        unreadCount: await this.notificationService.getUnreadCount(user.id),
        hasMore: (query.page || 1) * (query.limit || 10) < result.total,
        page: query.page || 1,
        limit: query.limit || 10,
        totalPages: Math.ceil(result.total / (query.limit || 10)),
      },
    };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Unread count retrieved successfully' })
  async getUnreadCount(@CurrentUser() user: UserPayload) {
    console.log('🔍 Debug - User payload:', user);
    console.log('🔍 Debug - User ID:', user?.id);

    const count = await this.notificationService.getUnreadCount(user.id);

    return {
      success: true,
      message: 'Unread count retrieved successfully',
      data: { count },
    };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markAsRead(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    await this.notificationService.markAsRead(id, user.id);

    return {
      success: true,
      message: 'Notification marked as read',
    };
  }

  @Patch('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(@CurrentUser() user: UserPayload) {
    const count = await this.notificationService.markAllAsRead(user.id);

    return {
      success: true,
      message: 'All notifications marked as read',
      data: { markedCount: count },
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification' })
  @ApiResponse({ status: 200, description: 'Notification deleted successfully' })
  async remove(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    await this.notificationService.delete(id, user.id);

    return {
      success: true,
      message: 'Notification deleted successfully',
    };
  }

  @Post('test')
  @ApiOperation({ summary: 'Send test notification' })
  @ApiResponse({ status: 201, description: 'Test notification sent successfully' })
  async sendTest(@Body() testDto: TestNotificationDto, @CurrentUser() user: UserPayload) {
    await this.notificationService.sendTestNotification(testDto, user.id);

    return {
      success: true,
      message: 'Test notification sent successfully',
    };
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get notification analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getAnalytics(@CurrentUser() user: UserPayload) {
    const analytics = await this.notificationService.getAnalytics(user.id);

    return {
      success: true,
      message: 'Analytics retrieved successfully',
      data: analytics,
    };
  }
}
