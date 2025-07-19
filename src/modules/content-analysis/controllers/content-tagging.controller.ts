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
  Request,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ContentTaggingService } from '../services/content-tagging.service';
import {
  GenerateTagsDto,
  CreateContentTagDto,
  UpdateContentTagDto,
  TagQueryDto,
} from '../dto/content-tagging.dto';
import { ContentTagResponseDto } from '../dto/content-analysis-responses.dto';

@ApiTags('Content Analysis - Tagging')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('content-analysis/tagging')
export class ContentTaggingController {
  constructor(private readonly contentTaggingService: ContentTaggingService) {}

  @Post('generate')
  @Roles('teacher', 'admin')
  @ApiOperation({ summary: 'Generate tags for content using AI' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Tags generated successfully',
    type: [ContentTagResponseDto],
  })
  async generateTags(
    @Body() generateTagsDto: GenerateTagsDto,
    @Request() req,
  ): Promise<ContentTagResponseDto[]> {
    return this.contentTaggingService.generateTags(generateTagsDto, req.user.sub);
  }

  @Post()
  @Roles('teacher', 'admin')
  @ApiOperation({ summary: 'Create a new content tag' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Tag created successfully',
    type: ContentTagResponseDto,
  })
  async createTag(
    @Body() createTagDto: CreateContentTagDto,
    @Request() req,
  ): Promise<ContentTagResponseDto> {
    return this.contentTaggingService.createTag(createTagDto, req.user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Get content tags with filtering' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tags retrieved successfully',
    type: [ContentTagResponseDto],
  })
  async getTags(@Query() queryDto: TagQueryDto): Promise<ContentTagResponseDto[]> {
    return this.contentTaggingService.getTags(queryDto);
  }

  @Get('content/:contentType/:contentId')
  @ApiOperation({ summary: 'Get tags for specific content' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Content tags retrieved successfully',
    type: [ContentTagResponseDto],
  })
  async getTagsByContent(
    @Param('contentType') contentType: 'course' | 'lesson',
    @Param('contentId') contentId: string,
  ): Promise<ContentTagResponseDto[]> {
    return this.contentTaggingService.getTagsByContent(contentType, contentId);
  }

  @Put(':id')
  @Roles('teacher', 'admin')
  @ApiOperation({ summary: 'Update a content tag' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tag updated successfully',
    type: ContentTagResponseDto,
  })
  async updateTag(
    @Param('id') id: string,
    @Body() updateTagDto: UpdateContentTagDto,
    @Request() req,
  ): Promise<ContentTagResponseDto> {
    return this.contentTaggingService.updateTag(id, updateTagDto, req.user.sub);
  }

  @Put(':id/verify')
  @Roles('teacher', 'admin')
  @ApiOperation({ summary: 'Verify a content tag' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tag verified successfully',
    type: ContentTagResponseDto,
  })
  async verifyTag(@Param('id') id: string, @Request() req): Promise<ContentTagResponseDto> {
    return this.contentTaggingService.verifyTag(id, req.user.sub);
  }

  @Put('bulk-verify')
  @Roles('teacher', 'admin')
  @ApiOperation({ summary: 'Bulk verify content tags' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tags verified successfully',
    type: [ContentTagResponseDto],
  })
  async bulkVerifyTags(
    @Body() body: { tagIds: string[] },
    @Request() req,
  ): Promise<ContentTagResponseDto[]> {
    return this.contentTaggingService.bulkVerifyTags(body.tagIds, req.user.sub);
  }

  @Delete(':id')
  @Roles('teacher', 'admin')
  @ApiOperation({ summary: 'Delete a content tag' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Tag deleted successfully' })
  async deleteTag(@Param('id') id: string): Promise<void> {
    return this.contentTaggingService.deleteTag(id);
  }
}
