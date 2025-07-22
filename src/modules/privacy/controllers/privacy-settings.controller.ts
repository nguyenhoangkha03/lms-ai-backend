import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Get, HttpStatus, Patch, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { PrivacySettingsService } from '../services/privacy-settings.service';
import { UpdatePrivacySettingsDto } from '../dto/update-privacy-settings.dto';

@ApiTags('Privacy Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('privacy/settings')
export class PrivacySettingsController {
  constructor(private readonly privacySettingsService: PrivacySettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user privacy settings' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Privacy settings retrieved successfully' })
  async getPrivacySettings(@Request() req: any) {
    return this.privacySettingsService.getPrivacySettings(req.user.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update user privacy settings' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Privacy settings updated successfully' })
  async updatePrivacySettings(@Request() req: any, @Body() updateDto: UpdatePrivacySettingsDto) {
    return this.privacySettingsService.updatePrivacySettings(req.user.id, updateDto, req.user.id);
  }

  @Get('cookies')
  @ApiOperation({ summary: 'Get user cookie consent preferences' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Cookie preferences retrieved successfully' })
  async getCookieConsent(@Request() req: any) {
    return this.privacySettingsService.getCookieConsent(req.user.id);
  }

  @Patch('cookies')
  @ApiOperation({ summary: 'Update user cookie consent preferences' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Cookie preferences updated successfully' })
  async updateCookieConsent(
    @Request() req: any,
    @Body()
    cookiePreferences: {
      essential?: boolean;
      functional?: boolean;
      analytics?: boolean;
      marketing?: boolean;
      preferences?: boolean;
    },
  ) {
    return this.privacySettingsService.updateCookieConsent(req.user.id, cookiePreferences);
  }
}
