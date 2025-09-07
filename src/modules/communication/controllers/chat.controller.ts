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
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ChatService } from '../services/chat.service';
import { ChatMessageService } from '../services/chat-message.service';
import { ChatFileService } from '../services/chat-file.service';
import {
  SendMessageDto,
  SearchMessagesDto,
  FileUploadDto,
  EditMessageDto,
  MessageReactionDto,
} from '../dto/chat.dto';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly messageService: ChatMessageService,
    private readonly fileService: ChatFileService,
  ) {}

  @Get('rooms/:roomId/messages')
  @ApiOperation({ summary: 'Get messages from a chat room' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  async getMessages(
    @Request() req,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Query('limit') limit: number = 50,
    @Query('before') before?: string,
  ) {
    // Check access to room
    const hasAccess = await this.chatService.checkUserAccess(roomId, req.user.id);
    if (!hasAccess) {
      throw new BadRequestException('Access denied to chat room');
    }

    const beforeDate = before ? new Date(before) : undefined;
    const messages = await this.messageService.getRecentMessages(roomId, limit, beforeDate);

    return {
      success: true,
      data: {
        messages,
        hasMore: messages.length === limit,
      },
    };
  }

  @Post('rooms/:roomId/messages')
  @ApiOperation({ summary: 'Send a message to a chat room' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  async sendMessage(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() sendMessageDto: SendMessageDto, 
    @Request() req
  ) {
    const message = await this.messageService.createMessage({
      ...sendMessageDto,
      roomId,
      senderId: req.user.id,
    });

    return {
      success: true,
      data: { message },
    };
  }

  @Put('messages/:messageId')
  @ApiOperation({ summary: 'Edit a message' })
  @ApiResponse({ status: 200, description: 'Message edited successfully' })
  async editMessage(
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() editMessageDto: EditMessageDto,
    @Request() req,
  ) {
    const message = await this.messageService.findById(messageId);

    if (message.senderId !== req.user.id) {
      throw new BadRequestException('Cannot edit message from another user');
    }

    const updatedMessage = await this.messageService.editMessage(messageId, editMessageDto.content);

    return {
      success: true,
      data: { message: updatedMessage },
    };
  }

  @Delete('messages/:messageId')
  @ApiOperation({ summary: 'Delete a message' })
  @ApiResponse({ status: 200, description: 'Message deleted successfully' })
  async deleteMessage(@Param('messageId', ParseUUIDPipe) messageId: string, @Request() req) {
    const message = await this.messageService.findById(messageId);

    if (message.senderId !== req.user.id) {
      throw new BadRequestException('Cannot delete message from another user');
    }

    await this.messageService.deleteMessage(messageId);

    return {
      success: true,
      message: 'Message deleted successfully',
    };
  }

  @Post('messages/:messageId/reactions')
  @ApiOperation({ summary: 'Add reaction to a message' })
  @ApiResponse({ status: 201, description: 'Reaction added successfully' })
  async addReaction(
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() reactionDto: MessageReactionDto,
    @Request() req,
  ) {
    const reaction = await this.messageService.addReaction(
      messageId,
      req.user.id,
      reactionDto.emoji,
    );

    return {
      success: true,
      data: { reaction },
    };
  }

  @Delete('messages/:messageId/reactions/:emoji')
  @ApiOperation({ summary: 'Remove reaction from a message' })
  @ApiResponse({ status: 200, description: 'Reaction removed successfully' })
  async removeReaction(
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Param('emoji') emoji: string,
    @Request() req,
  ) {
    await this.messageService.removeReaction(messageId, req.user.id, emoji);

    return {
      success: true,
      message: 'Reaction removed successfully',
    };
  }

  @Post('messages/:messageId/pin')
  @ApiOperation({ summary: 'Pin a message' })
  @ApiResponse({ status: 200, description: 'Message pinned successfully' })
  async pinMessage(@Param('messageId', ParseUUIDPipe) messageId: string, @Request() req) {
    const message = await this.messageService.pinMessage(messageId, req.user.id);

    return {
      success: true,
      data: { message },
    };
  }

  @Delete('messages/:messageId/pin')
  @ApiOperation({ summary: 'Unpin a message' })
  @ApiResponse({ status: 200, description: 'Message unpinned successfully' })
  async unpinMessage(@Param('messageId', ParseUUIDPipe) messageId: string, @Request() _req) {
    const message = await this.messageService.unpinMessage(messageId);

    return {
      success: true,
      data: { message },
    };
  }

  @Get('rooms/:roomId/pinned')
  @ApiOperation({ summary: 'Get pinned messages from a room' })
  @ApiResponse({ status: 200, description: 'Pinned messages retrieved successfully' })
  async getPinnedMessages(@Param('roomId', ParseUUIDPipe) roomId: string, @Request() req) {
    const hasAccess = await this.chatService.checkUserAccess(roomId, req.user.id);
    if (!hasAccess) {
      throw new BadRequestException('Access denied to chat room');
    }

    const messages = await this.messageService.getPinnedMessages(roomId);

    return {
      success: true,
      data: { messages },
    };
  }

  @Post('search')
  @ApiOperation({ summary: 'Search messages in a room' })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
  async searchMessagesPost(@Body() searchDto: SearchMessagesDto, @Request() req) {
    const hasAccess = await this.chatService.checkUserAccess(searchDto.roomId, req.user.id);
    if (!hasAccess) {
      throw new BadRequestException('Access denied to chat room');
    }

    const result = await this.messageService.searchMessages(
      searchDto.roomId,
      {
        query: searchDto.query,
        limit: searchDto.limit || 50,
        offset: searchDto.offset || 0,
      }
    );

    return {
      success: true,
      data: result,
    };
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload file to chat' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: FileUploadDto,
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const hasAccess = await this.chatService.checkUserAccess(uploadDto.roomId, req.user.id);
    if (!hasAccess) {
      throw new BadRequestException('Access denied to chat room');
    }

    const chatFile = await this.fileService.processFileUpload(file, uploadDto.roomId, req.user.id);

    return {
      success: true,
      data: { file: chatFile },
    };
  }

  @Get('files/:fileId')
  @ApiOperation({ summary: 'Get file information' })
  @ApiResponse({ status: 200, description: 'File information retrieved successfully' })
  async getFile(@Param('fileId', ParseUUIDPipe) fileId: string, @Request() req) {
    const file = await this.fileService.getFileById(fileId);

    // Check if user has access to the room containing this file
    if (!file.messageId) {
      throw new BadRequestException('File is not associated with any message');
    }
    const message = await this.messageService.findById(file.messageId);
    const hasAccess = await this.chatService.checkUserAccess(message.roomId, req.user.id);

    if (!hasAccess) {
      throw new BadRequestException('Access denied to file');
    }

    // Increment download count
    await this.fileService.incrementDownloadCount(fileId);

    return {
      success: true,
      data: { file },
    };
  }

  @Get('rooms/:roomId/files')
  @ApiOperation({ summary: 'Get files shared in a room' })
  @ApiResponse({ status: 200, description: 'Room files retrieved successfully' })
  async getRoomFiles(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Request() req,
    @Query('category') category?: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ) {
    const hasAccess = await this.chatService.checkUserAccess(roomId, req.user.id);
    if (!hasAccess) {
      throw new BadRequestException('Access denied to chat room');
    }

    const result = await this.fileService.getRoomFiles(roomId, category, limit, offset);

    return {
      success: true,
      data: result,
    };
  }

  @Delete('files/:fileId')
  @ApiOperation({ summary: 'Delete a file' })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  async deleteFile(@Param('fileId', ParseUUIDPipe) fileId: string, @Request() req) {
    await this.fileService.deleteFile(fileId, req.user.id);

    return {
      success: true,
      message: 'File deleted successfully',
    };
  }

  @Get('rooms/:roomId/messages/search')
  @ApiOperation({ summary: 'Search messages in a chat room' })
  @ApiResponse({ status: 200, description: 'Messages search completed' })
  async searchMessages(
    @Request() req,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Query('query') query: string,
    @Query('senderId') senderId?: string,
    @Query('messageType') messageType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ) {
    const hasAccess = await this.chatService.checkUserAccess(roomId, req.user.id);
    if (!hasAccess) {
      throw new BadRequestException('Access denied to chat room');
    }

    const searchParams = {
      query,
      senderId,
      messageType,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      limit,
      offset,
    };

    const result = await this.messageService.searchMessages(roomId, searchParams);

    return {
      success: true,
      data: result,
    };
  }

  @Get('threads/:threadId/messages')
  @ApiOperation({ summary: 'Get messages from a thread' })
  @ApiResponse({ status: 200, description: 'Thread messages retrieved successfully' })
  async getThreadMessages(
    @Param('threadId', ParseUUIDPipe) threadId: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
    @Request() _req,
  ) {
    const result = await this.messageService.getThreadMessages(threadId, limit, offset);

    return {
      success: true,
      data: result,
    };
  }

  @Post('messages/:messageId/read')
  @ApiOperation({ summary: 'Mark messages as read' })
  @ApiResponse({ status: 200, description: 'Messages marked as read' })
  async markMessagesRead(@Param('messageId', ParseUUIDPipe) messageId: string, @Request() req) {
    await this.messageService.markMessagesAsRead([messageId], req.user.id);

    return {
      success: true,
      message: 'Message marked as read',
    };
  }
}
