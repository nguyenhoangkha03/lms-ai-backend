import { Controller, Get, Query, UseGuards, HttpStatus, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { ForumStatisticsService } from '../services/forum-statistics.service';
import { ForumStatisticsQueryDto } from '../dto/forum-statistics.dto';
import { ForumStatisticsResponseDto } from '../dto/forum-responses.dto';

@ApiTags('Forum Statistics')
@Controller('forum/statistics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ForumStatisticsController {
  constructor(private readonly statisticsService: ForumStatisticsService) {}

  @Get()
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: 'Get forum statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
    type: ForumStatisticsResponseDto,
  })
  async getStatistics(
    @Query() queryDto: ForumStatisticsQueryDto,
  ): Promise<ForumStatisticsResponseDto> {
    return this.statisticsService.getStatistics(queryDto);
  }

  @Get('overview')
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: 'Get forum overview statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Overview statistics retrieved successfully',
  })
  async getOverview() {
    return this.statisticsService.getStatistics({ type: 'overview' });
  }

  @Get('trends')
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: 'Get forum trend statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trend statistics retrieved successfully',
  })
  async getTrends(@Query() queryDto: ForumStatisticsQueryDto) {
    return this.statisticsService.getStatistics({ ...queryDto, type: 'trends' });
  }
}
