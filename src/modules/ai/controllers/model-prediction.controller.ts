// import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
// import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
// import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
// import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
// import { UserPayload } from '@/modules/auth/interfaces/user-payload.interface';
// import { PythonAIServiceService } from '../services/python-ai-service.service';
// import { ModelPredictionService } from '../services/model-prediction.service';
// import {
//   CreatePredictionDto,
//   BatchPredictionDto,
//   ModelExplanationRequestDto,
//   PredictionResponseDto,
// } from '../dto/ml-model.dto';

// @ApiTags('Model Predictions')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
// @Controller('ai/predictions')
// export class ModelPredictionController {
//   constructor(
//     private readonly pythonAIService: PythonAIServiceService,
//     private readonly predictionService: ModelPredictionService,
//   ) {}

//   @Post()
//   @ApiOperation({ summary: 'Make single prediction' })
//   @ApiResponse({
//     status: 201,
//     description: 'Prediction completed successfully',
//     type: PredictionResponseDto,
//   })
//   async predict(
//     @CurrentUser() user: UserPayload,
//     @Body() predictionDto: CreatePredictionDto,
//   ): Promise<PredictionResponseDto> {
//     // Set user ID if not provided
//     if (!predictionDto.userId && user.role === 'student') {
//       predictionDto.userId = user.sub;
//     }

//     return this.pythonAIService.predict(predictionDto);
//   }

//   @Post('batch')
//   @ApiOperation({ summary: 'Make batch predictions' })
//   @ApiResponse({
//     status: 201,
//     description: 'Batch predictions completed successfully',
//     type: [PredictionResponseDto],
//   })
//   async batchPredict(
//     @Body() batchPredictionDto: BatchPredictionDto,
//   ): Promise<PredictionResponseDto[]> {
//     return this.pythonAIService.batchPredict(batchPredictionDto);
//   }

//   @Post('bulk')
//   @ApiOperation({ summary: 'Process multiple prediction requests' })
//   @ApiResponse({
//     status: 201,
//     description: 'Bulk predictions processed',
//     type: [PredictionResponseDto],
//   })
//   async bulkPredict(@Body() requests: CreatePredictionDto[]): Promise<PredictionResponseDto[]> {
//     return this.pythonAIService.bulkPredict(requests);
//   }

//   @Get()
//   @ApiOperation({ summary: 'Get user predictions history' })
//   @ApiResponse({ status: 200, description: 'Predictions retrieved successfully' })
//   async getPredictions(
//     @CurrentUser() user: UserPayload,
//     @Query('modelId') modelId?: string,
//     @Query('type') type?: string,
//     @Query('limit') limit?: number,
//     @Query('offset') offset?: number,
//   ) {
//     return this.predictionService.getUserPredictions(user.sub, {
//       modelId,
//       type,
//       limit: limit || 20,
//       offset: offset || 0,
//     });
//   }

//   @Get(':id')
//   @ApiOperation({ summary: 'Get prediction by ID' })
//   @ApiParam({ name: 'id', description: 'Prediction ID' })
//   @ApiResponse({ status: 200, description: 'Prediction retrieved successfully' })
//   async getPrediction(@Param('id') id: string) {
//     return this.predictionService.findById(id);
//   }

//   @Post(':id/explain')
//   @ApiOperation({ summary: 'Explain prediction' })
//   @ApiParam({ name: 'id', description: 'Prediction ID' })
//   @ApiResponse({ status: 200, description: 'Explanation generated successfully' })
//   async explainPrediction(
//     @Param('id') id: string,
//     @Body() explanationDto: ModelExplanationRequestDto,
//   ) {
//     const prediction = await this.predictionService.findById(id);
//     if (!prediction) {
//       throw new Error('Prediction not found');
//     }

//     return this.pythonAIService.explainPrediction({
//       ...explanationDto,
//       modelId: prediction.modelVersion.model.id,
//       inputData: prediction.inputData,
//     });
//   }

//   @Get('analytics/performance')
//   @ApiOperation({ summary: 'Get prediction performance analytics' })
//   @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
//   async getPredictionAnalytics(
//     @Query('modelId') modelId?: string,
//     @Query('start') start?: string,
//     @Query('end') end?: string,
//   ) {
//     const timeRange =
//       start && end
//         ? {
//             start: new Date(start),
//             end: new Date(end),
//           }
//         : undefined;

//     return this.predictionService.getPerformanceAnalytics(modelId, timeRange);
//   }
// }
