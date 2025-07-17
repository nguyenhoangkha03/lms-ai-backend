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
import { ForumPostService } from '../services/forum-post.service';
import { CreateForumPostDto, UpdateForumPostDto } from '../dto/forum-post.dto';
import { ForumPostResponseDto } from '../dto/forum-responses.dto';

@ApiTags('Forum Posts')
@Controller('forum/posts')
export class ForumPostController {
  constructor(private readonly postService: ForumPostService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new forum post' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Post created successfully',
    type: ForumPostResponseDto,
  })
  async create(
    @Body() createDto: CreateForumPostDto,
    @Request() req: any,
  ): Promise<ForumPostResponseDto> {
    return this.postService.create(createDto, req.user.sub);
  }

  @Get('thread/:threadId')
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: 'Get posts by thread ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'parentId', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Posts retrieved successfully',
  })
  async findByThread(
    @Param('threadId') threadId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('parentId') parentId?: string,
  ) {
    return this.postService.findByThread(threadId, {
      page,
      limit,
      parentId,
    });
  }

  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: 'Get forum post by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Post retrieved successfully',
    type: ForumPostResponseDto,
  })
  async findById(@Param('id') id: string): Promise<ForumPostResponseDto> {
    return this.postService.findById(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update forum post' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Post updated successfully',
    type: ForumPostResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateForumPostDto,
    @Request() req: any,
  ): Promise<ForumPostResponseDto> {
    return this.postService.update(id, updateDto, req.user.sub);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete forum post' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Post deleted successfully',
  })
  async delete(@Param('id') id: string, @Request() req: any): Promise<void> {
    return this.postService.delete(id, req.user.sub);
  }

  @Post(':id/accept')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark post as accepted answer' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Post marked as accepted',
  })
  async markAsAccepted(@Param('id') id: string, @Request() req: any): Promise<void> {
    return this.postService.markAsAccepted(id, req.user.sub);
  }
}
