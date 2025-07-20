import { Controller, Get, Query, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { PerformanceMonitoringService } from '../services/performance-monitoring.service';
import { QueryOptimizationService } from '../services/query-optimization.service';
import { RateLimitingService } from '@/common/services/rate-limiting.service';

@ApiTags('Performance')
@Controller('performance')
@UseGuards(RolesGuard)
export class PerformanceController {
  constructor(
    private readonly performanceMonitoringService: PerformanceMonitoringService,
    private readonly _queryOptimizationService: QueryOptimizationService,
    private readonly rateLimitingService: RateLimitingService,
  ) {}

  @Get('metrics')
  @Roles('admin')
  @ApiOperation({ summary: 'Get system performance metrics' })
  @ApiQuery({ name: 'timeframe', required: false, description: 'Timeframe in milliseconds' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Performance metrics retrieved successfully',
  })
  async getMetrics(@Query('timeframe') timeframe?: number) {
    const metrics = await this.performanceMonitoringService.getPerformanceMetrics(
      timeframe ? parseInt(timeframe.toString(), 10) : undefined,
    );

    return {
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Get system health status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'System health status retrieved successfully',
  })
  async getHealth() {
    const health = await this.performanceMonitoringService.getSystemHealth();

    return {
      success: true,
      data: health,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('endpoints')
  @Roles('admin')
  @ApiOperation({ summary: 'Get endpoint-specific performance metrics' })
  @ApiQuery({ name: 'endpoint', required: true, description: 'Endpoint to analyze' })
  @ApiQuery({ name: 'timeframe', required: false, description: 'Timeframe in milliseconds' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Endpoint metrics retrieved successfully',
  })
  async getEndpointMetrics(
    @Query('endpoint') endpoint: string,
    @Query('timeframe') timeframe?: number,
  ) {
    const metrics = await this.performanceMonitoringService.getEndpointMetrics(
      endpoint,
      timeframe ? parseInt(timeframe.toString(), 10) : undefined,
    );

    return {
      success: true,
      data: metrics,
      endpoint,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('rate-limits')
  @Roles('admin')
  @ApiOperation({ summary: 'Get rate limiting statistics' })
  @ApiQuery({ name: 'key', required: true, description: 'Rate limit key to check' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Rate limit stats retrieved successfully',
  })
  async getRateLimitStats(@Query('key') key: string) {
    const stats = await this.rateLimitingService.getRateLimitStats(key);

    return {
      success: true,
      data: stats,
      key,
      timestamp: new Date().toISOString(),
    };
  }
}
