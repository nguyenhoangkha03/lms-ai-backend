import {
  Controller,
  Get,
  Post,
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
import { PlagiarismDetectionService } from '../services/plagiarism-detection.service';
import {
  CheckPlagiarismDto,
  BulkPlagiarismCheckDto,
  PlagiarismQueryDto,
} from '../dto/plagiarism-detection.dto';
import { PlagiarismCheckResponseDto } from '../dto/content-analysis-responses.dto';

@ApiTags('Content Analysis - Plagiarism Detection')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('content-analysis/plagiarism')
export class PlagiarismDetectionController {
  constructor(private readonly plagiarismDetectionService: PlagiarismDetectionService) {}

  @Post('check')
  @Roles('teacher', 'admin')
  @ApiOperation({ summary: 'Check content for plagiarism' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Plagiarism check completed',
    type: PlagiarismCheckResponseDto,
  })
  async checkPlagiarism(
    @Body() checkDto: CheckPlagiarismDto,
    @Request() req,
  ): Promise<PlagiarismCheckResponseDto> {
    return this.plagiarismDetectionService.checkPlagiarism(checkDto, req.user.sub);
  }

  @Post('bulk-check')
  @Roles('admin')
  @ApiOperation({ summary: 'Bulk check content for plagiarism' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Bulk plagiarism check completed',
    type: [PlagiarismCheckResponseDto],
  })
  async bulkCheckPlagiarism(
    @Body() bulkDto: BulkPlagiarismCheckDto,
    @Request() req,
  ): Promise<PlagiarismCheckResponseDto[]> {
    return this.plagiarismDetectionService.bulkCheckPlagiarism(bulkDto, req.user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Get plagiarism checks with filtering' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Plagiarism checks retrieved successfully',
    type: [PlagiarismCheckResponseDto],
  })
  async getPlagiarismChecks(
    @Query() queryDto: PlagiarismQueryDto,
  ): Promise<PlagiarismCheckResponseDto[]> {
    return this.plagiarismDetectionService.getPlagiarismChecks(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get plagiarism check by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Plagiarism check retrieved successfully',
    type: PlagiarismCheckResponseDto,
  })
  async getPlagiarismCheckById(@Param('id') id: string): Promise<PlagiarismCheckResponseDto> {
    return this.plagiarismDetectionService.getPlagiarismCheckById(id);
  }

  @Get('statistics/overview')
  @Roles('admin')
  @ApiOperation({ summary: 'Get plagiarism detection statistics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Statistics retrieved successfully' })
  async getPlagiarismStatistics(): Promise<any> {
    return this.plagiarismDetectionService.getPlagiarismStatistics();
  }
}
