import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

export interface LessonRecommendationRequest {
  user_id: string;
  assessment_attemp_id: string;
}

export interface LessonRecommendation {
  accuracy_correct: number;
  course_title: string;
  data_source: string;
  difficulty_affected: string[];
  lesson_accuracy_percentage: string;
  lesson_correct_total_ratio: string;
  lesson_id: string;
  lesson_slug: string;
  lesson_title: string;
  lesson_wrong_total_ratio: string;
  order_index: number;
  priority_rank: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  priority_score: number;
  questions_wrong: Array<{
    orderIndex: number;
    title: string;
  }>;
  reason: string;
}

export interface LessonRecommendationResponse {
  success: boolean;
  data: {
    strategy: string;
    strategy_confidence: number;
    recommendations: LessonRecommendation[];
    total_recommendations: number;
  };
  timestamp: string;
}

export interface AttitudePredictionRequest {
  user_id: string;
}

export interface AttitudePredictionResponse {
  success: boolean;
  data: {
    predicted_attitude: 'Give_up' | 'Active' | 'Moderate';
    confidence: number;
    probabilities: Record<string, number>;
    user_id: string;
  };
  timestamp: string;
}

export interface AITrackingRequest {
  data: {
    user_id: string;
    course_id: string;
  };
}

export interface AITrackingResponse {
  success: boolean;
  data: {
    performance_level: 'excellent' | 'good' | 'average' | 'poor';
    predicted_score: number;
    trend_prediction: 'tăng' | 'giảm' | 'ổn định';
    user_id: string;
  };
  timestamp: string;
}

@Injectable()
export class AIIntegrationService {
  private readonly logger = new Logger(AIIntegrationService.name);
  private readonly aiApiUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.aiApiUrl = this.configService.get<string>('AI_API_URL') || 'http://localhost:5000';
  }

  /**
   * Gọi AI API để lấy lesson recommendations sau assessment
   */
  async getLessonRecommendations(
    request: LessonRecommendationRequest,
  ): Promise<LessonRecommendationResponse> {
    try {
      this.logger.log(`Getting lesson recommendations for user ${request.user_id}`);

      const response = await firstValueFrom(
        this.httpService.post(`${this.aiApiUrl}/api/recommend-lessons`, request, {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 seconds timeout
        }),
      );

      this.logger.log(`Successfully got ${response.data.data?.recommendations?.length || 0} recommendations`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get lesson recommendations: ${error.message}`);
      
      if (error instanceof AxiosError) {
        this.logger.error(`AI API Error Response: ${JSON.stringify(error.response?.data)}`);
      }

      // Return fallback response
      return {
        success: false,
        data: {
          strategy: 'FALLBACK',
          strategy_confidence: 0,
          recommendations: [],
          total_recommendations: 0,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Gọi AI API để dự đoán learning attitude
   */
  async predictLearningAttitude(
    request: AttitudePredictionRequest,
  ): Promise<AttitudePredictionResponse> {
    try {
      this.logger.log(`Predicting learning attitude for user ${request.user_id}`);

      const response = await firstValueFrom(
        this.httpService.post(`${this.aiApiUrl}/api/predict-attitude`, request, {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }),
      );

      this.logger.log(`Successfully predicted attitude: ${response.data.data?.predicted_attitude}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to predict learning attitude: ${error.message}`);
      
      if (error instanceof AxiosError) {
        this.logger.error(`AI API Error Response: ${JSON.stringify(error.response?.data)}`);
      }

      // Return fallback response
      return {
        success: false,
        data: {
          predicted_attitude: 'Moderate',
          confidence: 0,
          probabilities: {},
          user_id: request.user_id,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Gọi AI API để track performance và dự đoán xu hướng
   */
  async trackAIPerformance(
    request: AITrackingRequest,
  ): Promise<AITrackingResponse> {
    try {
      this.logger.log(
        `Tracking AI performance for user ${request.data.user_id} in course ${request.data.course_id}`,
      );

      const response = await firstValueFrom(
        this.httpService.post(`${this.aiApiUrl}/api/aitrack`, request, {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }),
      );

      this.logger.log(`Successfully tracked performance: ${response.data.data?.performance_level}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to track AI performance: ${error.message}`);
      
      if (error instanceof AxiosError) {
        this.logger.error(`AI API Error Response: ${JSON.stringify(error.response?.data)}`);
      }

      // Return fallback response
      return {
        success: false,
        data: {
          performance_level: 'average',
          predicted_score: 5.0,
          trend_prediction: 'ổn định',
          user_id: request.data.user_id,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Health check cho AI API
   */
  async checkAIApiHealth(): Promise<{ available: boolean; message: string }> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.aiApiUrl}/health`, {
          timeout: 5000,
        }),
      );

      return {
        available: response.status === 200,
        message: 'AI API is healthy',
      };
    } catch (error) {
      this.logger.warn(`AI API health check failed: ${error.message}`);
      return {
        available: false,
        message: 'AI API is not available',
      };
    }
  }
}