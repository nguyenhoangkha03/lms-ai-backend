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
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { SectionService } from '../services/section.service';
import { CreateSectionDto } from '../dto/sections/create-section.dto';
import { UpdateSectionDto } from '../dto/sections/update-section.dto';
import { SectionQueryDto } from '../dto/sections/section-query.dto';
import { ReorderSectionsDto } from '../dto/sections/reorder-sections.dto';
import { UserType } from '@/common/enums/user.enums';
import { WinstonService } from '@/logger/winston.service';

@ApiTags('Course Sections')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('course-sections')
export class SectionController {
  constructor(
    private readonly sectionService: SectionService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(SectionController.name);
  }

  @Post()
  @Roles(UserType.TEACHER, UserType.ADMIN)
  @ApiOperation({ summary: 'Create a new course section' })
  @ApiResponse({ status: 201, description: 'Section created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not course owner' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async create(@Body() createSectionDto: CreateSectionDto, @CurrentUser('id') userId: string) {
    this.logger.log('Im Akaisui');
    this.logger.log(`Creating section: ${createSectionDto.title} by user ${userId}`);

    const section = await this.sectionService.create(createSectionDto, userId);

    return {
      success: true,
      message: 'Section created successfully',
      data: section,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get course sections with filters' })
  @ApiQuery({ name: 'courseId', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'isRequired', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'includeLessons', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiResponse({ status: 200, description: 'Sections retrieved successfully' })
  async findAll(@Query() queryDto: SectionQueryDto) {
    this.logger.log(`Retrieving sections with filters: ${JSON.stringify(queryDto)}`);

    const result = await this.sectionService.findAll(queryDto);

    return {
      success: true,
      message: 'Sections retrieved successfully',
      ...result,
    };
  }

  @Get('course/:courseId')
  @ApiOperation({ summary: 'Get all sections for a specific course' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiQuery({ name: 'includeLessons', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Course sections retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async findByCourseId(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Query('includeLessons') includeLessons?: boolean,
  ) {
    this.logger.log(`Retrieving sections for course: ${courseId}`);

    const sections = await this.sectionService.findByCourseId(courseId, includeLessons);

    return {
      success: true,
      message: 'Course sections retrieved successfully',
      data: sections,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get section by ID' })
  @ApiParam({ name: 'id', description: 'Section ID' })
  @ApiQuery({ name: 'includeLessons', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Section retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Section not found' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('includeLessons') includeLessons?: boolean,
  ) {
    this.logger.log(`Retrieving section: ${id}`);

    const section = await this.sectionService.findById(id, includeLessons);

    return {
      success: true,
      message: 'Section retrieved successfully',
      data: section,
    };
  }

  @Put(':id')
  @Roles(UserType.TEACHER, UserType.ADMIN)
  @ApiOperation({ summary: 'Update section' })
  @ApiParam({ name: 'id', description: 'Section ID' })
  @ApiResponse({ status: 200, description: 'Section updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not course owner' })
  @ApiResponse({ status: 404, description: 'Section not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSectionDto: UpdateSectionDto,
    @CurrentUser('id') userId: string,
  ) {
    this.logger.log(`Updating section: ${id} by user ${userId}`);

    const section = await this.sectionService.update(id, updateSectionDto, userId);

    return {
      success: true,
      message: 'Section updated successfully',
      data: section,
    };
  }

  @Put('reorder')
  @Roles(UserType.TEACHER, UserType.ADMIN)
  @ApiOperation({ summary: 'Reorder course sections' })
  @ApiResponse({ status: 200, description: 'Sections reordered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid section IDs' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not course owner' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async reorder(@Body() reorderDto: ReorderSectionsDto, @CurrentUser('id') userId: string) {
    this.logger.log(`Reordering sections for course: ${reorderDto.courseId} by user ${userId}`);

    const sections = await this.sectionService.reorder(reorderDto, userId);

    return {
      success: true,
      message: 'Sections reordered successfully',
      data: sections,
    };
  }

  @Delete(':id')
  @Roles(UserType.TEACHER, UserType.ADMIN)
  @ApiOperation({ summary: 'Delete section' })
  @ApiParam({ name: 'id', description: 'Section ID' })
  @ApiResponse({ status: 204, description: 'Section deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete section with lessons' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not course owner' })
  @ApiResponse({ status: 404, description: 'Section not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    this.logger.log(`Deleting section: ${id} by user ${userId}`);

    await this.sectionService.remove(id, userId);

    return {
      success: true,
      message: 'Section deleted successfully',
    };
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get section statistics' })
  @ApiParam({ name: 'id', description: 'Section ID' })
  @ApiResponse({ status: 200, description: 'Section statistics retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Section not found' })
  async getStats(@Param('id', ParseUUIDPipe) id: string) {
    this.logger.log(`Retrieving stats for section: ${id}`);

    const stats = await this.sectionService.getSectionStats(id);

    return {
      success: true,
      message: 'Section statistics retrieved successfully',
      data: stats,
    };
  }
}
