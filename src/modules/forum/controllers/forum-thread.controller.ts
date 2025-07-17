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
  HttpStatus,
  UseInterceptors,
} from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { ForumThreadService } from '../services/forum-thread.service';
import { CreateForumThreadDto, UpdateForumThreadDto } from '../dto/forum-thread.dto';
import { ForumThreadResponseDto } from '../dto/forum-responses.dto';
import { ModerationActionDto } from '../dto/forum-moderation.dto';
import { UserRole } from '@/common/enums/user.enums';
import { ForumThreadStatus } from '@/common/enums/forum.enums';
import { ForumThread } from '../entities/forum-thread.entity';

@ApiTags('Forum Threads')
@Controller('forum/threads')
export class ForumThreadController {
  constructor(private readonly threadService: ForumThreadService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new forum thread' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Thread created successfully',
    type: ForumThreadResponseDto,
  })
  async create(
    @Body() createDto: CreateForumThreadDto,
    @Request() req: any,
  ): Promise<ForumThreadResponseDto> {
    return this.threadService.create(createDto, req.user.sub);
  }

  @Get()
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: 'Get all forum threads' })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ForumThreadStatus })
  @ApiQuery({ name: 'featured', required: false, type: Boolean })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Threads retrieved successfully',
  })
  async findAll(
    @Query('categoryId') categoryId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: ForumThreadStatus,
    @Query('featured') featured?: boolean,
  ) {
    return this.threadService.findAll({
      categoryId,
      page,
      limit,
      status,
      featured,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get forum thread by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Thread retrieved successfully',
    type: ForumThreadResponseDto,
  })
  async findById(@Param('id') id: string, @Request() req?: any): Promise<ForumThreadResponseDto> {
    const userId = req?.user?.sub;
    return this.threadService.findById(id, userId);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get forum thread by slug' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Thread retrieved successfully',
    type: ForumThreadResponseDto,
  })
  async findBySlug(@Param('slug') slug: string, @Request() req?: any): Promise<ForumThread> {
    const userId = req?.user?.sub;
    return this.threadService.findBySlug(slug, userId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update forum thread' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Thread updated successfully',
    type: ForumThreadResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateForumThreadDto,
    @Request() req: any,
  ): Promise<ForumThreadResponseDto> {
    return this.threadService.update(id, updateDto, req.user.sub);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete forum thread' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Thread deleted successfully',
  })
  async delete(@Param('id') id: string, @Request() req: any): Promise<void> {
    return this.threadService.delete(id, req.user.sub);
  }

  @Post(':id/lock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lock forum thread' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Thread locked successfully',
  })
  async lock(
    @Param('id') id: string,
    @Body() moderationDto: ModerationActionDto,
    @Request() req: any,
  ): Promise<void> {
    return this.threadService.lock(id, req.user.sub, moderationDto.reason);
  }

  @Post(':id/unlock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unlock forum thread' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Thread unlocked successfully',
  })
  async unlock(@Param('id') id: string, @Request() req: any): Promise<void> {
    return this.threadService.unlock(id, req.user.sub);
  }

  @Post(':id/pin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pin forum thread' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Thread pinned successfully',
  })
  async pin(@Param('id') id: string, @Request() req: any): Promise<void> {
    return this.threadService.pin(id, req.user.sub);
  }

  @Post(':id/unpin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unpin forum thread' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Thread unpinned successfully',
  })
  async unpin(@Param('id') id: string, @Request() req: any): Promise<void> {
    return this.threadService.unpin(id, req.user.sub);
  }

  @Post(':id/resolve')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark thread as resolved' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Thread marked as resolved',
  })
  async resolve(
    @Param('id') id: string,
    @Body() body: { acceptedAnswerId?: string },
    @Request() req: any,
  ): Promise<void> {
    return this.threadService.markAsResolved(id, req.user.sub, body.acceptedAnswerId);
  }
}
