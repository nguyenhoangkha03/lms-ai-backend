import { Controller, Get, Post, Param, Body, Query, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SimilarityDetectionService } from '../services/similarity-detection.service';
import {
  AnalyzeSimilarityDto,
  BulkSimilarityAnalysisDto,
  SimilarityQueryDto,
} from '../dto/similarity-detection.dto';
import { SimilarityResponseDto } from '../dto/content-analysis-responses.dto';

@ApiTags('Content Analysis - Similarity Detection')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('content-analysis/similarity')
export class SimilarityDetectionController {
  constructor(private readonly similarityDetectionService: SimilarityDetectionService) {}

  @Post('analyze')
  @Roles('teacher', 'admin')
  @ApiOperation({ summary: 'Analyze similarity between two contents' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Similarity analyzed successfully',
    type: SimilarityResponseDto,
  })
  async analyzeSimilarity(
    @Body() analyzeSimilarityDto: AnalyzeSimilarityDto,
  ): Promise<SimilarityResponseDto> {
    return this.similarityDetectionService.analyzeSimilarity(analyzeSimilarityDto);
  }

  @Post('bulk-analyze')
  @Roles('teacher', 'admin')
  @ApiOperation({ summary: 'Bulk analyze similarity between content and multiple targets' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Bulk similarity analysis completed',
    type: [SimilarityResponseDto],
  })
  async bulkAnalyzeSimilarity(
    @Body() bulkDto: BulkSimilarityAnalysisDto,
  ): Promise<SimilarityResponseDto[]> {
    return this.similarityDetectionService.bulkAnalyzeSimilarity(bulkDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get similarity records with filtering' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Similarities retrieved successfully',
    type: [SimilarityResponseDto],
  })
  async getSimilarities(@Query() queryDto: SimilarityQueryDto): Promise<SimilarityResponseDto[]> {
    return this.similarityDetectionService.getSimilarities(queryDto);
  }

  @Get('similar/:contentType/:contentId')
  @ApiOperation({ summary: 'Get similar content for specific content' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Similar content retrieved successfully',
    type: [SimilarityResponseDto],
  })
  async getSimilarContent(
    @Param('contentType') contentType: 'course' | 'lesson',
    @Param('contentId') contentId: string,
    @Query('limit') limit?: number,
    @Query('minSimilarity') minSimilarity?: number,
  ): Promise<SimilarityResponseDto[]> {
    return this.similarityDetectionService.getSimilarContent(
      contentType,
      contentId,
      limit || 10,
      minSimilarity || 0.5,
    );
  }
}
