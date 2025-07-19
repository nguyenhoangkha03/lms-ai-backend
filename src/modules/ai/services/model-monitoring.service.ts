import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MLModel } from '../entities/ml-model.entity';
import { ModelPrediction } from '../entities/model-prediction.entity';
import { PythonAiServiceService } from './python-ai-service.service';
import { CacheService } from '@/cache/cache.service';

@Injectable()
export class ModelMonitoringService {
  private readonly logger = new Logger(ModelMonitoringService.name);

  constructor(
    @InjectRepository(MLModel)
    private readonly modelRepository: Repository<MLModel>,
    @InjectRepository(ModelPrediction)
    private readonly predictionRepository: Repository<ModelPrediction>,
    private readonly pythonAiService: PythonAiServiceService,
    private readonly cacheService: CacheService,
  ) {}

  async checkModelHealth(modelId: string): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: any;
    alerts: string[];
    recommendations: string[];
  }> {
    try {
      const model = await this.modelRepository.findOne({ where: { id: modelId } });
      if (!model) {
        return {
          status: 'unhealthy',
          metrics: {},
          alerts: ['Model not found'],
          recommendations: ['Check model configuration'],
        };
      }

      // Get health metrics from Python AI service
      const healthResponse = await this.pythonAiService.makeRequest('/ai/monitoring/health', {
        model_type: 'monitoring',
        data: { model_id: modelId },
      });

      if (healthResponse.success) {
        return healthResponse.data;
      } else {
        return {
          status: 'unhealthy',
          metrics: {},
          alerts: ['Health check service unavailable'],
          recommendations: ['Check AI service connectivity'],
        };
      }
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`);
      return {
        status: 'unhealthy',
        metrics: {},
        alerts: [`Health check error: ${error.message}`],
        recommendations: ['Contact system administrator'],
      };
    }
  }

  async collectPerformanceMetrics(
    modelId: string,
    timeRange: { start: Date; end: Date },
  ): Promise<{
    latency: number;
    throughput: number;
    errorRate: number;
    accuracy?: number;
    memoryUsage: number;
    cpuUsage: number;
  }> {
    try {
      const metricsResponse = await this.pythonAiService.makeRequest('/ai/monitoring/metrics', {
        model_type: 'monitoring',
        data: {
          model_id: modelId,
          time_range: timeRange,
        },
        cache_key: `model_metrics:${modelId}:${timeRange.start.getTime()}:${timeRange.end.getTime()}`,
      });

      if (metricsResponse.success) {
        return metricsResponse.data;
      } else {
        // Return default metrics
        return {
          latency: 0,
          throughput: 0,
          errorRate: 0,
          memoryUsage: 0,
          cpuUsage: 0,
        };
      }
    } catch (error) {
      this.logger.error(`Performance metrics collection failed: ${error.message}`);
      return {
        latency: 0,
        throughput: 0,
        errorRate: 0,
        memoryUsage: 0,
        cpuUsage: 0,
      };
    }
  }

  async checkPerformanceAlerts(
    modelId: string,
    metrics: any,
  ): Promise<
    Array<{
      type: 'warning' | 'critical';
      message: string;
      metric: string;
      threshold: number;
      actual: number;
    }>
  > {
    const alerts: any = [];

    // Define thresholds
    const thresholds = {
      latency: { warning: 1000, critical: 5000 }, // ms
      errorRate: { warning: 0.05, critical: 0.1 }, // 5% warning, 10% critical
      memoryUsage: { warning: 0.8, critical: 0.95 }, // 80% warning, 95% critical
      cpuUsage: { warning: 0.8, critical: 0.95 }, // 80% warning, 95% critical
    };

    // Check each metric against thresholds
    for (const [metric, values] of Object.entries(thresholds)) {
      const actualValue = metrics[metric];
      if (actualValue !== undefined) {
        if (actualValue >= values.critical) {
          alerts.push({
            type: 'critical',
            message: `${metric} is critically high`,
            metric,
            threshold: values.critical,
            actual: actualValue,
          });
        } else if (actualValue >= values.warning) {
          alerts.push({
            type: 'warning',
            message: `${metric} is above warning threshold`,
            metric,
            threshold: values.warning,
            actual: actualValue,
          });
        }
      }
    }

    return alerts;
  }

  async detectDataDrift(
    modelId: string,
    newData: any,
  ): Promise<{
    hasDrift: boolean;
    driftScore: number;
    driftType: 'covariate' | 'concept' | 'label' | 'none';
    recommendations: string[];
  }> {
    try {
      const driftResponse = await this.pythonAiService.makeRequest('/ai/monitoring/drift', {
        model_type: 'monitoring',
        data: {
          model_id: modelId,
          new_data: newData,
        },
      });

      if (driftResponse.success) {
        return driftResponse.data;
      } else {
        return {
          hasDrift: false,
          driftScore: 0,
          driftType: 'none',
          recommendations: ['Drift detection service unavailable'],
        };
      }
    } catch (error) {
      this.logger.error(`Data drift detection failed: ${error.message}`);
      return {
        hasDrift: false,
        driftScore: 0,
        driftType: 'none',
        recommendations: [`Drift detection error: ${error.message}`],
      };
    }
  }
}
