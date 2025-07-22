import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { UserRole } from '@/common/enums/user.enums';
import { DataDeletionOptions, DataDeletionService } from '../services/data-deletion.service';

@ApiTags('Data Deletion')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('privacy/data-deletion')
export class DataDeletionController {
  constructor(private readonly dataDeletionService: DataDeletionService) {}

  @Post('request')
  @ApiOperation({ summary: 'Request user data deletion' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Data deletion request created successfully',
  })
  async requestDataDeletion(@Request() req: any, @Body() options: DataDeletionOptions) {
    return this.dataDeletionService.deleteUserData(req.user.id, options, req.user.id);
  }

  @Post('admin/:userId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: 'Delete user data (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User data deleted successfully' })
  async deleteUserDataAdmin(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Request() req: any,
    @Body() options: DataDeletionOptions,
  ) {
    return this.dataDeletionService.deleteUserData(userId, options, req.user.id);
  }

  @Post('schedule/:userId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: 'Schedule user data deletion (Admin only)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Data deletion scheduled successfully' })
  async scheduleDataDeletion(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Request() req: any,
    @Body()
    body: {
      options: DataDeletionOptions;
      scheduleDate: string;
    },
  ) {
    return this.dataDeletionService.scheduleDataDeletion(
      userId,
      body.options,
      new Date(body.scheduleDate),
      req.user.id,
    );
  }
}
