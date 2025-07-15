// import { Controller, Post, Get, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
// import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
// import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
// import { RolesGuard } from '@/modules/auth/guards/roles.guard';
// import { Roles } from '@/modules/auth/decorators/roles.decorator';
// import { Role } from '@/common/enums/role.enum';
// import { ModelServingService } from '../services/model-serving.service';

// @ApiTags('Model Serving')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
// @Controller('ai/serving')
// export class ModelServingController {
//   constructor(private readonly servingService: ModelServingService) {}

//   @Get('services')
//   @ApiOperation({ summary: 'Get all running model services' })
//   @ApiResponse({ status: 200, description: 'Services retrieved successfully' })
//   async getServices() {
//     return this.servingService.getAllServices();
//   }

//   @Get('services/:modelId')
//   @ApiOperation({ summary: 'Get model service status' })
//   @ApiParam({ name: 'modelId', description: 'Model ID' })
//   @ApiResponse({ status: 200, description: 'Service status retrieved successfully' })
//   async getServiceStatus(@Param('modelId') modelId: string) {
//     return this.servingService.getServiceStatus(modelId);
//   }

//   @Post('services/:modelId/scale')
//   @UseGuards(RolesGuard)
//   @Roles(Role.ADMIN)
//   @ApiOperation({ summary: 'Scale model service' })
//   @ApiParam({ name: 'modelId', description: 'Model ID' })
//   @ApiResponse({ status: 200, description: 'Service scaled successfully' })
//   async scaleService(@Param('modelId') modelId: string, @Body() scaleDto: { replicas: number }) {
//     return this.servingService.scaleService(modelId, scaleDto.replicas);
//   }

//   @Put('services/:modelId/restart')
//   @UseGuards(RolesGuard)
//   @Roles(Role.ADMIN)
//   @ApiOperation({ summary: 'Restart model service' })
//   @ApiParam({ name: 'modelId', description: 'Model ID' })
//   @ApiResponse({ status: 200, description: 'Service restarted successfully' })
//   async restartService(@Param('modelId') modelId: string) {
//     return this.servingService.restartService(modelId);
//   }

//   @Get('monitoring/metrics')
//   @ApiOperation({ summary: 'Get serving metrics across all models' })
//   @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
//   async getServingMetrics(@Query('start') start?: string, @Query('end') end?: string) {
//     const timeRange =
//       start && end
//         ? {
//             start: new Date(start),
//             end: new Date(end),
//           }
//         : undefined;

//     return this.servingService.getServingMetrics(timeRange);
//   }

//   @Get('monitoring/health')
//   @ApiOperation({ summary: 'Get health status of all model services' })
//   @ApiResponse({ status: 200, description: 'Health status retrieved successfully' })
//   async getHealthStatus() {
//     return this.servingService.getOverallHealthStatus();
//   }

//   @Post('models/compare')
//   @ApiOperation({ summary: 'Compare performance of multiple models' })
//   @ApiResponse({ status: 200, description: 'Comparison completed successfully' })
//   async compareModels(
//     @Body()
//     compareDto: {
//       modelIds: string[];
//       metrics: string[];
//       timeRange?: { start: string; end: string };
//     },
//   ) {
//     const timeRange = compareDto.timeRange
//       ? {
//           start: new Date(compareDto.timeRange.start),
//           end: new Date(compareDto.timeRange.end),
//         }
//       : undefined;

//     return this.servingService.compareModelPerformance(
//       compareDto.modelIds,
//       compareDto.metrics,
//       timeRange,
//     );
//   }
// }
