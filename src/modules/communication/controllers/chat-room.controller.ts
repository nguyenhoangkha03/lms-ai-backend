import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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
import { ChatRoomService } from '../services/chat-room.service';
import { ChatService } from '../services/chat.service';
import { CreateRoomDto, UpdateRoomDto, InviteToRoomDto } from '../dto/chat.dto';
import { ParticipantRole } from '@/common/enums/communication.enums';

@ApiTags('Chat Rooms')
@ApiBearerAuth()
@Controller('chat/rooms')
@UseGuards(JwtAuthGuard)
export class ChatRoomController {
  constructor(
    private readonly roomService: ChatRoomService,
    private readonly chatService: ChatService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new chat room' })
  @ApiResponse({ status: 201, description: 'Room created successfully' })
  async createRoom(@Body() createRoomDto: CreateRoomDto, @Request() req) {
    const room = await this.roomService.createRoom({
      ...createRoomDto,
      createdBy: req.user.id,
    });

    return {
      success: true,
      data: { room },
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get user chat rooms' })
  @ApiResponse({ status: 200, description: 'Rooms retrieved successfully' })
  async getUserRooms(
    @Request() req,
    @Query('type') type?: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ) {
    const result = await this.roomService.getUserRooms(req.user.id, type, limit, offset);

    return {
      success: true,
      data: result,
    };
  }

  @Get(':roomId')
  @ApiOperation({ summary: 'Get room details' })
  @ApiResponse({ status: 200, description: 'Room details retrieved successfully' })
  async getRoomDetails(@Param('roomId', ParseUUIDPipe) roomId: string, @Request() req) {
    const hasAccess = await this.chatService.checkUserAccess(roomId, req.user.id);
    if (!hasAccess) {
      throw new BadRequestException('Access denied to chat room');
    }

    const room = await this.roomService.getRoomWithParticipants(roomId);

    return {
      success: true,
      data: { room },
    };
  }

  @Put(':roomId')
  @ApiOperation({ summary: 'Update room details' })
  @ApiResponse({ status: 200, description: 'Room updated successfully' })
  async updateRoom(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() updateRoomDto: UpdateRoomDto,
    @Request() req,
  ) {
    const isModerator = await this.roomService.isModerator(roomId, req.user.id);
    if (!isModerator) {
      throw new BadRequestException('Only moderators can update room settings');
    }

    const room = await this.roomService.updateRoom(roomId, updateRoomDto);

    return {
      success: true,
      data: { room },
    };
  }

  @Delete(':roomId')
  @ApiOperation({ summary: 'Delete a room' })
  @ApiResponse({ status: 200, description: 'Room deleted successfully' })
  async deleteRoom(@Param('roomId', ParseUUIDPipe) roomId: string, @Request() req) {
    const isOwner = await this.roomService.isRoomOwner(roomId, req.user.id);
    if (!isOwner) {
      throw new BadRequestException('Only room owner can delete the room');
    }

    await this.roomService.deleteRoom(roomId);

    return {
      success: true,
      message: 'Room deleted successfully',
    };
  }

  @Post(':roomId/join')
  @ApiOperation({ summary: 'Join a chat room' })
  @ApiResponse({ status: 200, description: 'Joined room successfully' })
  async joinRoom(@Param('roomId', ParseUUIDPipe) roomId: string, @Request() req) {
    await this.roomService.joinRoom(roomId, req.user.id);

    return {
      success: true,
      message: 'Joined room successfully',
    };
  }

  @Post(':roomId/leave')
  @ApiOperation({ summary: 'Leave a chat room' })
  @ApiResponse({ status: 200, description: 'Left room successfully' })
  async leaveRoom(@Param('roomId', ParseUUIDPipe) roomId: string, @Request() req) {
    await this.roomService.leaveRoom(roomId, req.user.id);

    return {
      success: true,
      message: 'Left room successfully',
    };
  }

  @Post(':roomId/invite')
  @ApiOperation({ summary: 'Invite users to a room' })
  @ApiResponse({ status: 200, description: 'Users invited successfully' })
  async inviteUsers(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() inviteDto: InviteToRoomDto,
    @Request() req,
  ) {
    const isModerator = await this.roomService.isModerator(roomId, req.user.id);
    if (!isModerator) {
      throw new BadRequestException('Only moderators can invite users');
    }

    await this.roomService.inviteUsers(roomId, inviteDto.userIds, inviteDto.role);

    return {
      success: true,
      message: 'Users invited successfully',
    };
  }

  @Get(':roomId/participants')
  @ApiOperation({ summary: 'Get room participants' })
  @ApiResponse({ status: 200, description: 'Participants retrieved successfully' })
  async getRoomParticipants(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
    @Request() req,
  ) {
    const hasAccess = await this.chatService.checkUserAccess(roomId, req.user.id);
    if (!hasAccess) {
      throw new BadRequestException('Access denied to chat room');
    }

    const result = await this.roomService.getRoomParticipants(roomId, limit, offset);

    return {
      success: true,
      data: result,
    };
  }

  @Put(':roomId/participants/:userId/role')
  @ApiOperation({ summary: 'Update participant role' })
  @ApiResponse({ status: 200, description: 'Participant role updated successfully' })
  async updateParticipantRole(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body('role') role: ParticipantRole,
    @Request() req,
  ) {
    const isModerator = await this.roomService.isModerator(roomId, req.user.id);
    if (!isModerator) {
      throw new BadRequestException('Only moderators can update participant roles');
    }

    await this.roomService.updateParticipantRole(roomId, userId, role);

    return {
      success: true,
      message: 'Participant role updated successfully',
    };
  }

  @Delete(':roomId/participants/:userId')
  @ApiOperation({ summary: 'Remove participant from room' })
  @ApiResponse({ status: 200, description: 'Participant removed successfully' })
  async removeParticipant(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Request() req,
  ) {
    const isModerator = await this.roomService.isModerator(roomId, req.user.id);
    if (!isModerator) {
      throw new BadRequestException('Only moderators can remove participants');
    }

    await this.roomService.removeParticipant(roomId, userId);

    return {
      success: true,
      message: 'Participant removed successfully',
    };
  }

  @Get('search')
  @ApiOperation({ summary: 'Search public rooms' })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
  async searchRooms(
    @Query('query') query: string,
    @Request() req,
    @Query('type') type?: string,
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
  ) {
    const result = await this.roomService.searchPublicRooms(query, type, limit, offset);

    return {
      success: true,
      data: result,
    };
  }
}
