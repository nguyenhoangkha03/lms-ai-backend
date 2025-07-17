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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { ForumCategoryService } from '../services/forum-category.service';
import { CreateForumCategoryDto, UpdateForumCategoryDto } from '../dto/forum-category.dto';
import { ForumCategoryResponseDto } from '../dto/forum-responses.dto';
import { UserRole } from '@/common/enums/user.enums';

@ApiTags('Forum Categories')
@Controller('forum/categories')
export class ForumCategoryController {
  constructor(private readonly categoryService: ForumCategoryService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new forum category' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Category created successfully',
    type: ForumCategoryResponseDto,
  })
  async create(
    @Body() createDto: CreateForumCategoryDto,
    @Request() req: any,
  ): Promise<ForumCategoryResponseDto> {
    return this.categoryService.create(createDto, req.user.sub);
  }

  @Get()
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: 'Get all forum categories' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Categories retrieved successfully',
    type: [ForumCategoryResponseDto],
  })
  async findAll(
    @Query('includeInactive') includeInactive?: boolean,
  ): Promise<ForumCategoryResponseDto[]> {
    return this.categoryService.findAll(includeInactive);
  }

  @Get('hierarchy')
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: 'Get category hierarchy' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category hierarchy retrieved successfully',
    type: [ForumCategoryResponseDto],
  })
  async getHierarchy(): Promise<ForumCategoryResponseDto[]> {
    return this.categoryService.getHierarchy();
  }

  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: 'Get forum category by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category retrieved successfully',
    type: ForumCategoryResponseDto,
  })
  async findById(@Param('id') id: string): Promise<ForumCategoryResponseDto> {
    return this.categoryService.findById(id);
  }

  @Get('slug/:slug')
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: 'Get forum category by slug' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category retrieved successfully',
    type: ForumCategoryResponseDto,
  })
  async findBySlug(@Param('slug') slug: string): Promise<ForumCategoryResponseDto> {
    return this.categoryService.findBySlug(slug);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update forum category' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category updated successfully',
    type: ForumCategoryResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateForumCategoryDto,
    @Request() req: any,
  ): Promise<ForumCategoryResponseDto> {
    return this.categoryService.update(id, updateDto, req.user.sub);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete forum category' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Category deleted successfully',
  })
  async delete(@Param('id') id: string, @Request() req: any): Promise<void> {
    return this.categoryService.delete(id, req.user.sub);
  }
}
