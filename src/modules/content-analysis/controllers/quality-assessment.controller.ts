import { Controller, Get, Post, Param, Body, Query, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ContentQualityAssessmentService } from '../services/content-quality-assessment.service';
import {
  AssessContentQualityDto,
  BulkQualityAssessmentDto,
  QualityAssessmentQueryDto,
} from '../dto/quality-assessment.dto';
import { QualityAssessmentResponseDto } from '../dto/content-analysis-responses.dto';

@ApiTags('Content Analysis - Quality Assessment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('content-analysis/quality')
export class QualityAssessmentController {
  constructor(private readonly qualityAssessmentService: ContentQualityAssessmentService) {}

  @Post('assess')
  @Roles('teacher', 'admin')
  @ApiOperation({ summary: 'Assess content quality using AI' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Quality assessed successfully',
    type: QualityAssessmentResponseDto,
  })
  async assessContentQuality(
    @Body() assessDto: AssessContentQualityDto,
  ): Promise<QualityAssessmentResponseDto> {
    return this.qualityAssessmentService.assessContentQuality(assessDto);
  }

  @Post('bulk-assess')
  @Roles('admin')
  @ApiOperation({ summary: 'Bulk assess content quality' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Bulk assessment completed',
    type: [QualityAssessmentResponseDto],
  })
  async bulkAssessContentQuality(
    @Body() bulkDto: BulkQualityAssessmentDto,
  ): Promise<QualityAssessmentResponseDto[]> {
    return this.qualityAssessmentService.bulkAssessContentQuality(bulkDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get quality assessments with filtering' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Assessments retrieved successfully',
    type: [QualityAssessmentResponseDto],
  })
  async getQualityAssessments(
    @Query() queryDto: QualityAssessmentQueryDto,
  ): Promise<QualityAssessmentResponseDto[]> {
    return this.qualityAssessmentService.getQualityAssessments(queryDto);
  }

  @Get('trends/:contentType/:contentId')
  @ApiOperation({ summary: 'Get quality trends for specific content' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Quality trends retrieved successfully',
    type: [QualityAssessmentResponseDto],
  })
  async getContentQualityTrends(
    @Param('contentType') contentType: 'course' | 'lesson',
    @Param('contentId') contentId: string,
    @Query('limit') limit?: number,
  ): Promise<QualityAssessmentResponseDto[]> {
    return this.qualityAssessmentService.getContentQualityTrends(
      contentType,
      contentId,
      limit || 10,
    );
  }

  @Get('statistics')
  @Roles('admin')
  @ApiOperation({ summary: 'Get quality statistics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Statistics retrieved successfully' })
  async getQualityStatistics(
    @Query('contentType') contentType?: 'course' | 'lesson',
  ): Promise<any> {
    return this.qualityAssessmentService.getQualityStatistics(contentType);
  }
}
