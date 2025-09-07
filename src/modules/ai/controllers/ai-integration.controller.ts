import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Authorize } from '../../auth/decorators/authorize.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '@/modules/user/entities/user.entity';
import { UserType } from '@/common/enums/user.enums';
import {
  AIIntegrationService,
  LessonRecommendationRequest,
  AttitudePredictionRequest,
  AITrackingRequest,
} from '../services/ai-integration.service';

@ApiTags('AI Integration')
@Controller('ai-integration')
export class AIIntegrationController {
  constructor(private readonly aiIntegrationService: AIIntegrationService) {}

  @Post('lesson-recommendations')
  @Authorize({
    roles: [UserType.STUDENT, UserType.TEACHER, UserType.ADMIN],
  })
  @ApiOperation({
    summary: 'Get AI lesson recommendations after assessment',
    description: 'Lấy đề xuất lessons từ AI sau khi hoàn thành bài kiểm tra',
  })
  @ApiResponse({
    status: 200,
    description: 'Lesson recommendations retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            strategy: { type: 'string', example: 'INTENSIVE_FOUNDATION' },
            strategy_confidence: { type: 'number', example: 0.79 },
            recommendations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  lesson_id: { type: 'string', example: 'lesson-html-tags' },
                  lesson_title: { type: 'string', example: 'Các thẻ tiêu đề và đoạn văn' },
                  priority_rank: { type: 'string', example: 'CRITICAL' },
                  priority_score: { type: 'number', example: 8.12 },
                  reason: { type: 'string', example: 'Bạn đã trả lời sai 2 câu hỏi' },
                },
              },
            },
            total_recommendations: { type: 'number', example: 1 },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  async getLessonRecommendations(
    @Body() request: LessonRecommendationRequest,
    @CurrentUser() user: User,
  ) {
    try {
      if (!request.user_id || !request.assessment_attemp_id) {
        throw new BadRequestException('user_id and assessment_attemp_id are required');
      }

      const result = await this.aiIntegrationService.getLessonRecommendations(request);

      return {
        success: true,
        data: result.data,
        ai_api_available: result.success,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('predict-attitude')
  @Authorize({
    roles: [UserType.STUDENT, UserType.TEACHER, UserType.ADMIN],
  })
  @ApiOperation({
    summary: 'Predict student learning attitude',
    description: 'Dự đoán thái độ học tập của sinh viên bằng AI',
  })
  @ApiResponse({
    status: 200,
    description: 'Learning attitude predicted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            predicted_attitude: { type: 'string', enum: ['Give_up', 'Active', 'Moderate'] },
            confidence: { type: 'number', example: 0.92 },
            probabilities: { type: 'object' },
            user_id: { type: 'string' },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  async predictLearningAttitude(
    @Body() request: AttitudePredictionRequest,
    @CurrentUser() user: User,
  ) {
    try {
      if (!request.user_id) {
        throw new BadRequestException('user_id is required');
      }

      const result = await this.aiIntegrationService.predictLearningAttitude(request);

      return {
        success: true,
        data: result.data,
        ai_api_available: result.success,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('track-performance')
  @Authorize({
    roles: [UserType.STUDENT, UserType.TEACHER, UserType.ADMIN],
  })
  @ApiOperation({
    summary: 'Track AI performance and predict trends',
    description: 'Theo dõi hiệu suất học tập và dự đoán xu hướng bằng AI',
  })
  @ApiResponse({
    status: 200,
    description: 'Performance tracking completed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            performance_level: { 
              type: 'string', 
              enum: ['excellent', 'good', 'average', 'poor'],
              example: 'good' 
            },
            predicted_score: { type: 'number', example: 8.02 },
            trend_prediction: { 
              type: 'string', 
              enum: ['tăng', 'giảm', 'ổn định'],
              example: 'giảm' 
            },
            user_id: { type: 'string' },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  async trackAIPerformance(
    @Body() request: AITrackingRequest,
    @CurrentUser() user: User,
  ) {
    try {
      if (!request.data || !request.data.user_id || !request.data.course_id) {
        throw new BadRequestException('data.user_id and data.course_id are required');
      }

      const result = await this.aiIntegrationService.trackAIPerformance(request);

      return {
        success: true,
        data: result.data,
        ai_api_available: result.success,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('health')
  @ApiOperation({
    summary: 'Check AI API health status',
    description: 'Kiểm tra trạng thái của AI API',
  })
  @ApiResponse({
    status: 200,
    description: 'AI API health status retrieved',
  })
  @HttpCode(HttpStatus.OK)
  async checkAIHealth() {
    try {
      const healthStatus = await this.aiIntegrationService.checkAIApiHealth();

      return {
        success: true,
        ai_api_available: healthStatus.available,
        message: healthStatus.message,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        ai_api_available: false,
        message: 'Failed to check AI API health',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}