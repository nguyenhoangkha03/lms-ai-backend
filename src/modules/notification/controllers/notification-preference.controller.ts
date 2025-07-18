import { Controller, Get, Put, Body, UseGuards, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationPreferenceService } from '../services/notification-preference.service';
import { NotificationPreferenceDto } from '../dto/notification.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { UserPayload } from '@/common/interfaces/user-payload.interface';

@ApiTags('Notification Preferences')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notification-preferences')
export class NotificationPreferenceController {
  constructor(private readonly preferenceService: NotificationPreferenceService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences retrieved successfully' })
  async findAll(@CurrentUser() user: UserPayload) {
    const preferences = await this.preferenceService.findAllForUser(user.sub);

    return {
      success: true,
      message: 'Preferences retrieved successfully',
      data: preferences,
    };
  }

  @Put()
  @ApiOperation({ summary: 'Update notification preference' })
  @ApiResponse({ status: 200, description: 'Preference updated successfully' })
  async update(@Body() preferenceDto: NotificationPreferenceDto, @CurrentUser() user: UserPayload) {
    const preference = await this.preferenceService.upsert(user.sub, preferenceDto);

    return {
      success: true,
      message: 'Preference updated successfully',
      data: preference,
    };
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Update multiple notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated successfully' })
  async updateBulk(
    @Body() preferences: NotificationPreferenceDto[],
    @CurrentUser() user: UserPayload,
  ) {
    const updated = await this.preferenceService.updateBulk(user.sub, preferences);

    return {
      success: true,
      message: 'Preferences updated successfully',
      data: updated,
    };
  }

  @Post('reset')
  @ApiOperation({ summary: 'Reset preferences to defaults' })
  @ApiResponse({ status: 200, description: 'Preferences reset successfully' })
  async resetToDefaults(@CurrentUser() user: UserPayload) {
    const preferences = await this.preferenceService.resetToDefaults(user.sub);

    return {
      success: true,
      message: 'Preferences reset to defaults successfully',
      data: preferences,
    };
  }
}
