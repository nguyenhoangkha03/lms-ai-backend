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
import { ForumTagService } from '../services/forum-tag.service';
import { CreateForumTagDto, UpdateForumTagDto } from '../dto/forum-tag.dto';
import { UserRole } from '@/common/enums/user.enums';

@ApiTags('Forum Tags')
@Controller('forum/tags')
export class ForumTagController {
  constructor(private readonly tagService: ForumTagService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new forum tag' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Tag created successfully',
  })
  async create(@Body() createDto: CreateForumTagDto, @Request() req: any) {
    return this.tagService.create(createDto, req.user.sub);
  }

  @Get()
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: 'Get all forum tags' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tags retrieved successfully',
  })
  async findAll(@Query('includeInactive') includeInactive?: boolean) {
    return this.tagService.findAll(includeInactive);
  }

  @Get('popular')
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: 'Get popular forum tags' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Popular tags retrieved successfully',
  })
  async findPopular(@Query('limit') limit?: number) {
    return this.tagService.findPopularTags(limit);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search forum tags' })
  @ApiQuery({ name: 'q', required: true, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tag search results',
  })
  async search(@Query('q') query: string, @Query('limit') limit?: number) {
    return this.tagService.searchTags(query, limit);
  }

  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: 'Get forum tag by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tag retrieved successfully',
  })
  async findById(@Param('id') id: string) {
    return this.tagService.findById(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update forum tag' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tag updated successfully',
  })
  async update(@Param('id') id: string, @Body() updateDto: UpdateForumTagDto, @Request() req: any) {
    return this.tagService.update(id, updateDto, req.user.sub);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete forum tag' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Tag deleted successfully',
  })
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.tagService.delete(id, req.user.sub);
  }
}
