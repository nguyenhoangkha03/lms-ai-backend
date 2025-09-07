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
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import {
  CategoryService,
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryQueryDto,
} from '../services/category.service';
import { UserType } from '@/common/enums/user.enums';
import { WinstonService } from '@/logger/winston.service';

@ApiTags('Category Management')
@ApiBearerAuth('JWT-auth')
// @UseGuards(JwtAuthGuard, RolesGuard)
@Controller('categories')
export class CategoryController {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(CategoryController.name);
  }

  @Get()
  @ApiOperation({ summary: 'Get all categories with filters' })
  @ApiQuery({ name: 'parentId', required: false, type: String })
  @ApiQuery({ name: 'level', required: false, type: Number })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'showInMenu', required: false, type: Boolean })
  @ApiQuery({ name: 'isFeatured', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'includeChildren', required: false, type: Boolean })
  @ApiQuery({ name: 'includeCourses', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully' })
  async findAll(@Query() queryDto: CategoryQueryDto) {
    this.logger.log(`Retrieving categories with filters: ${JSON.stringify(queryDto)}`);

    const result = await this.categoryService.findAll(queryDto);

    return {
      success: true,
      message: 'Categories retrieved successfully',
      ...result,
    };
  }

  @Get('root-categories')
  @Public()
  @ApiOperation({ summary: 'Get root categories for onboarding' })
  @ApiResponse({ status: 200, description: 'Root categories retrieved successfully' })
  async getRootCategories() {
    this.logger.log('Retrieving root categories for onboarding');

    const categories = await this.categoryService.getRootCategories();

    return {
      success: true,
      message: 'Root categories retrieved successfully',
      categories,
    };
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get category tree structure' })
  @ApiResponse({ status: 200, description: 'Category tree retrieved successfully' })
  async getCategoryTree() {
    this.logger.log('Retrieving category tree structure');

    const tree = await this.categoryService.getCategoryTree();

    return {
      success: true,
      message: 'Category tree retrieved successfully',
      tree,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    this.logger.log(`Retrieving category: ${id}`);

    const category = await this.categoryService.findById(id);

    return {
      success: true,
      message: 'Category retrieved successfully',
      category,
    };
  }

  @Post()
  @Roles(UserType.ADMIN)
  @ApiOperation({ summary: 'Create new category (Admin only)' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Category slug already exists' })
  async create(@Body() createCategoryDto: CreateCategoryDto, @CurrentUser('id') userId: string) {
    this.logger.log(`Creating category: ${createCategoryDto.name} by user ${userId}`);

    const category = await this.categoryService.create(createCategoryDto, userId);

    return {
      success: true,
      message: 'Category created successfully',
      category,
    };
  }

  @Put(':id')
  @Roles(UserType.ADMIN)
  @ApiOperation({ summary: 'Update category (Admin only)' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @CurrentUser('id') userId: string,
  ) {
    this.logger.log(`Updating category: ${id} by user ${userId}`);

    const category = await this.categoryService.update(id, updateCategoryDto, userId);

    return {
      success: true,
      message: 'Category updated successfully',
      category,
    };
  }

  @Delete(':id')
  @Roles(UserType.ADMIN)
  @ApiOperation({ summary: 'Delete category (Admin only)' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 204, description: 'Category deleted successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete category with courses' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    this.logger.log(`Deleting category: ${id} by user ${userId}`);

    await this.categoryService.remove(id, userId);

    return {
      success: true,
      message: 'Category deleted successfully',
    };
  }

  @Put(':id/reorder')
  @Roles(UserType.ADMIN)
  @ApiOperation({ summary: 'Reorder category (Admin only)' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category reordered successfully' })
  async reorder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: { newParentId?: string | null; orderIndex: number },
    @CurrentUser('id') userId: string,
  ) {
    this.logger.log(`Reordering category: ${id} by user ${userId}`);

    const category = await this.categoryService.reorder(
      id,
      data.newParentId || null,
      data.orderIndex,
      userId,
    );

    return {
      success: true,
      message: 'Category reordered successfully',
      category,
    };
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get category statistics' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category statistics retrieved successfully' })
  async getStats(@Param('id', ParseUUIDPipe) id: string) {
    this.logger.log(`Retrieving stats for category: ${id}`);

    const stats = await this.categoryService.getCategoryStats(id);

    return {
      success: true,
      message: 'Category statistics retrieved successfully',
      stats,
    };
  }

  @Post('rebuild-course-counts')
  @Roles(UserType.ADMIN)
  @ApiOperation({ summary: 'Rebuild course counts for all categories (Admin only)' })
  @ApiResponse({ status: 200, description: 'Course counts rebuilt successfully' })
  @HttpCode(HttpStatus.OK)
  async rebuildCourseCounts() {
    this.logger.log('Admin requested rebuilding course counts for all categories');

    await this.categoryService.rebuildAllCourseCounts();

    return {
      success: true,
      message: 'Course counts rebuilt successfully for all categories',
    };
  }
}
