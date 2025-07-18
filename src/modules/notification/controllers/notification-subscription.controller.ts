import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationSubscriptionService } from '../services/notification-subscription.service';
import { SubscriptionDto } from '../dto/notification.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { UserPayload } from '@/common/interfaces/user-payload.interface';

@ApiTags('Notification Subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notification-subscriptions')
export class NotificationSubscriptionController {
  constructor(private readonly subscriptionService: NotificationSubscriptionService) {}

  @Post()
  @ApiOperation({ summary: 'Create notification subscription' })
  @ApiResponse({ status: 201, description: 'Subscription created successfully' })
  async create(@Body() subscriptionDto: SubscriptionDto, @CurrentUser() user: UserPayload) {
    const subscription = await this.subscriptionService.create(user.sub, subscriptionDto);

    return {
      success: true,
      message: 'Subscription created successfully',
      data: subscription,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get user subscriptions' })
  @ApiResponse({ status: 200, description: 'Subscriptions retrieved successfully' })
  async findAll(@CurrentUser() user: UserPayload) {
    const subscriptions = await this.subscriptionService.findAllForUser(user.sub);

    return {
      success: true,
      message: 'Subscriptions retrieved successfully',
      data: subscriptions,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete subscription' })
  @ApiResponse({ status: 200, description: 'Subscription deleted successfully' })
  async remove(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    await this.subscriptionService.delete(id, user.sub);

    return {
      success: true,
      message: 'Subscription deleted successfully',
    };
  }

  @Post(':id/verify')
  @ApiOperation({ summary: 'Verify subscription' })
  @ApiResponse({ status: 200, description: 'Subscription verified successfully' })
  async verify(@Param('id') id: string) {
    const subscription = await this.subscriptionService.verify(id);

    return {
      success: true,
      message: 'Subscription verified successfully',
      data: subscription,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get subscription statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats(@CurrentUser() user: UserPayload) {
    const stats = await this.subscriptionService.getSubscriptionStats(user.sub);

    return {
      success: true,
      message: 'Statistics retrieved successfully',
      data: stats,
    };
  }
}
