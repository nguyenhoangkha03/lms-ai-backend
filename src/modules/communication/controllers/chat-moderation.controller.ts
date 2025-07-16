import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ChatModerationService } from '../services/chat-moderation.service';
import { ChatRoomService } from '../services/chat-room.service';
import { ModerationActionDto } from '../dto/chat.dto';

@ApiTags('Chat Moderation')
@ApiBearerAuth()
@Controller('chat/moderation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChatModerationController {
  constructor(
    private readonly moderationService: ChatModerationService,
    private readonly roomService: ChatRoomService,
  ) {}

  @Post('action')
  @ApiOperation({ summary: 'Take moderation action' })
  @ApiResponse({ status: 201, description: 'Moderation action taken successfully' })
  async takeModerationAction(@Body() actionDto: ModerationActionDto, @Request() req) {
    const isModerator = await this.roomService.isModerator(actionDto.roomId, req.user.id);
    if (!isModerator) {
      throw new BadRequestException('Only moderators can take moderation actions');
    }

    let moderation;

    switch (actionDto.action) {
      case 'mute':
        moderation = await this.moderationService.muteUser(
          actionDto.roomId,
          actionDto.targetUserId,
          req.user.id,
          actionDto.duration || 60,
          actionDto.reason,
        );
        break;

      case 'ban':
        moderation = await this.moderationService.banUser(
          actionDto.roomId,
          actionDto.targetUserId,
          req.user.id,
          actionDto.reason,
          !actionDto.duration,
        );
        break;

      default:
        moderation = await this.moderationService.createModerationRecord({
          ...actionDto,
          moderatorId: req.user.id,
        });
    }

    return {
      success: true,
      data: { moderation },
    };
  }

  @Get('history/:roomId')
  @ApiOperation({ summary: 'Get moderation history for a room' })
  @ApiResponse({ status: 200, description: 'Moderation history retrieved successfully' })
  async getModerationHistory(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
    @Request() req,
  ) {
    const isModerator = await this.roomService.isModerator(roomId, req.user.id);
    if (!isModerator) {
      throw new BadRequestException('Only moderators can view moderation history');
    }

    const result = await this.moderationService.getModerationHistory(roomId, limit, offset);

    return {
      success: true,
      data: result,
    };
  }

  @Post('appeal/:moderationId')
  @ApiOperation({ summary: 'Appeal a moderation action' })
  @ApiResponse({ status: 200, description: 'Appeal submitted successfully' })
  async appealModeration(
    @Param('moderationId', ParseUUIDPipe) moderationId: string,
    @Body('reason') reason: string,
    @Request() req,
  ) {
    const moderation = await this.moderationService.appealModeration(
      moderationId,
      req.user.id,
      reason,
    );

    return {
      success: true,
      data: { moderation },
    };
  }

  @Put('appeal/:moderationId/review')
  @Roles('admin', 'moderator')
  @ApiOperation({ summary: 'Review an appeal' })
  @ApiResponse({ status: 200, description: 'Appeal reviewed successfully' })
  async reviewAppeal(
    @Param('moderationId', ParseUUIDPipe) moderationId: string,
    @Body('decision') decision: 'approved' | 'denied',
    @Request() req,
    @Body('reviewNotes') reviewNotes?: string,
  ) {
    const moderation = await this.moderationService.reviewAppeal(
      moderationId,
      req.user.id,
      decision,
      reviewNotes,
    );

    return {
      success: true,
      data: { moderation },
    };
  }

  @Get('user/:userId/status/:roomId')
  @ApiOperation({ summary: 'Check user moderation status in a room' })
  @ApiResponse({ status: 200, description: 'User status retrieved successfully' })
  async getUserModerationStatus(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Request() req,
  ) {
    const isModerator = await this.roomService.isModerator(roomId, req.user.id);
    if (!isModerator && req.user.id !== userId) {
      throw new BadRequestException('Access denied');
    }

    const isMuted = await this.moderationService.isUserMuted(roomId, userId);
    const isBanned = await this.moderationService.isUserBanned(roomId, userId);

    return {
      success: true,
      data: {
        userId,
        roomId,
        isMuted,
        isBanned,
      },
    };
  }
}
