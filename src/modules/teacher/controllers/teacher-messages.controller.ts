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
import { TeacherMessagesService } from '../services/teacher-messages.service';
import { WinstonService } from '@/logger/winston.service';

@ApiTags('Teacher Messages')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.TEACHER)
@Controller('teacher/messages')
export class TeacherMessagesController {
  constructor(
    private readonly teacherMessagesService: TeacherMessagesService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(TeacherMessagesController.name);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get all message conversations' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Conversations retrieved successfully' })
  async getConversations(
    @CurrentUser('id') teacherId: string,
    @Query('limit') limit = 20,
    @Query('offset') offset = 0,
  ): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    this.logger.log(`Getting conversations for teacher: ${teacherId}`);

    const conversations = await this.teacherMessagesService.getConversations(
      teacherId,
      Number(limit),
      Number(offset)
    );

    return {
      success: true,
      message: 'Conversations retrieved successfully',
      data: conversations,
    };
  }

  @Get('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Get messages in a conversation' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'before', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  async getMessages(
    @CurrentUser('id') teacherId: string,
    @Param('conversationId') conversationId: string,
    @Query('limit') limit = 50,
    @Query('before') before?: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    this.logger.log(`Getting messages for conversation ${conversationId}, teacher: ${teacherId}`);

    const messages = await this.teacherMessagesService.getMessages(
      teacherId,
      conversationId,
      Number(limit),
      before
    );

    return {
      success: true,
      message: 'Messages retrieved successfully',
      data: messages,
    };
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Start new conversation' })
  @ApiResponse({ status: 201, description: 'Conversation created successfully' })
  async createConversation(
    @CurrentUser('id') teacherId: string,
    @Body() createConversationDto: {
      participantIds: string[];
      initialMessage: string;
      subject?: string;
    },
  ): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    this.logger.log(`Creating conversation for teacher: ${teacherId}`);

    const conversation = await this.teacherMessagesService.createConversation(
      teacherId,
      createConversationDto
    );

    return {
      success: true,
      message: 'Conversation created successfully',
      data: conversation,
    };
  }

  @Post('conversations/:conversationId/messages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send message in conversation' })
  @ApiResponse({ status: 200, description: 'Message sent successfully' })
  async sendMessage(
    @CurrentUser('id') teacherId: string,
    @Param('conversationId') conversationId: string,
    @Body() sendMessageDto: {
      content: string;
      attachments?: string[];
      messageType?: 'text' | 'file' | 'image' | 'audio';
    },
  ): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    this.logger.log(`Sending message in conversation ${conversationId}, teacher: ${teacherId}`);

    const message = await this.teacherMessagesService.sendMessage(
      teacherId,
      conversationId,
      sendMessageDto
    );

    return {
      success: true,
      message: 'Message sent successfully',
      data: message,
    };
  }

  @Put('conversations/:conversationId/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark conversation as read' })
  @ApiResponse({ status: 200, description: 'Conversation marked as read' })
  async markAsRead(
    @CurrentUser('id') teacherId: string,
    @Param('conversationId') conversationId: string,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    this.logger.log(`Marking conversation ${conversationId} as read for teacher: ${teacherId}`);

    await this.teacherMessagesService.markAsRead(teacherId, conversationId);

    return {
      success: true,
      message: 'Conversation marked as read',
    };
  }

  @Delete('conversations/:conversationId')
  @ApiOperation({ summary: 'Archive conversation' })
  @ApiResponse({ status: 200, description: 'Conversation archived successfully' })
  async archiveConversation(
    @CurrentUser('id') teacherId: string,
    @Param('conversationId') conversationId: string,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    this.logger.log(`Archiving conversation ${conversationId} for teacher: ${teacherId}`);

    await this.teacherMessagesService.archiveConversation(teacherId, conversationId);

    return {
      success: true,
      message: 'Conversation archived successfully',
    };
  }

  @Post('bulk-message')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send message to multiple students' })
  @ApiResponse({ status: 200, description: 'Bulk message sent successfully' })
  async sendBulkMessage(
    @CurrentUser('id') teacherId: string,
    @Body() bulkMessageDto: {
      recipientIds: string[];
      subject: string;
      content: string;
      courseId?: string;
      attachments?: string[];
    },
  ): Promise<{
    success: boolean;
    message: string;
    data: { sentCount: number };
  }> {
    this.logger.log(`Sending bulk message to ${bulkMessageDto.recipientIds.length} recipients, teacher: ${teacherId}`);

    const result = await this.teacherMessagesService.sendBulkMessage(teacherId, bulkMessageDto);

    return {
      success: true,
      message: 'Bulk message sent successfully',
      data: result,
    };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread message count' })
  @ApiResponse({ status: 200, description: 'Unread count retrieved successfully' })
  async getUnreadCount(
    @CurrentUser('id') teacherId: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: { unreadCount: number };
  }> {
    this.logger.log(`Getting unread count for teacher: ${teacherId}`);

    const count = await this.teacherMessagesService.getUnreadCount(teacherId);

    return {
      success: true,
      message: 'Unread count retrieved successfully',
      data: { unreadCount: count },
    };
  }

  @Get('search')
  @ApiOperation({ summary: 'Search messages' })
  @ApiQuery({ name: 'query', required: true, type: String })
  @ApiQuery({ name: 'conversationId', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
  async searchMessages(
    @CurrentUser('id') teacherId: string,
    @Query('query') query: string,
    @Query('conversationId') conversationId?: string,
    @Query('limit') limit = 20,
  ): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    this.logger.log(`Searching messages for teacher: ${teacherId}, query: ${query}`);

    const results = await this.teacherMessagesService.searchMessages(
      teacherId,
      query,
      conversationId,
      Number(limit)
    );

    return {
      success: true,
      message: 'Search results retrieved successfully',
      data: results,
    };
  }
}