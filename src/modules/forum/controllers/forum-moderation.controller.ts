import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { ForumModerationService } from '../services/forum-moderation.service';
import { CreateForumReportDto, UpdateForumReportDto } from '../dto/forum-report.dto';
import { BulkModerationDto } from '../dto/forum-moderation.dto';
import { UserRole } from '@/common/enums/user.enums';

@ApiTags('Forum Moderation')
@Controller('forum/moderation')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ForumModerationController {
  constructor(private readonly moderationService: ForumModerationService) {}

  @Post('reports/posts/:postId')
  @ApiOperation({ summary: 'Report a forum post' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Report submitted successfully',
  })
  async reportPost(
    @Param('postId') postId: string,
    @Body() reportDto: CreateForumReportDto,
    @Request() req: any,
  ) {
    return this.moderationService.reportPost(postId, req.user.sub, reportDto);
  }

  @Get('reports')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiOperation({ summary: 'Get moderation reports' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reports retrieved successfully',
  })
  async getReports(
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.moderationService.getReports({ status, page, limit });
  }

  @Put('reports/:reportId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiOperation({ summary: 'Handle moderation report' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report handled successfully',
  })
  async handleReport(
    @Param('reportId') reportId: string,
    @Body() updateDto: UpdateForumReportDto,
    @Request() req: any,
  ) {
    return this.moderationService.handleReport(reportId, updateDto, req.user.sub);
  }

  @Post('actions/bulk')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiOperation({ summary: 'Perform bulk moderation action' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bulk action performed successfully',
  })
  async bulkModeration(@Body() bulkDto: BulkModerationDto, @Request() req: any) {
    return this.moderationService.performBulkAction(bulkDto, req.user.sub);
  }
}
