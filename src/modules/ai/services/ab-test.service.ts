import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ABTest } from '../entities/ab-test.entity';
import { ABTestResult } from '../entities/ab-test-result.entity';
import { MLModel } from '../entities/ml-model.entity';
import { PythonAiServiceService } from './python-ai-service.service';
import { CacheService } from '@/cache/cache.service';
import { ABTestStatus, ModelStatus } from '@/common/enums/ai.enums';

export interface CreateABTestDto {
  name: string;
  description?: string;
  controlModelId: string;
  testModelId: string;
  trafficSplit: number;
  successMetrics: string[];
  duration: number;
  targetAudience?: any;
  configuration?: {
    minimumSampleSize?: number;
    confidenceLevel?: number;
    significanceThreshold?: number;
    allowEarlyStop?: boolean;
    targetUsers?: string[];
    excludeUsers?: string[];
  };
}

export interface ABTestAnalysis {
  test: ABTest;
  summary: {
    totalUsers: number;
    controlUsers: number;
    testUsers: number;
    results: Record<string, any>;
    significance: any;
    winner?: 'control' | 'test' | 'inconclusive';
    confidence?: number;
  };
  recommendations: string[];
}

@Injectable()
export class AbTestService {
  private readonly logger = new Logger(AbTestService.name);

  constructor(
    @InjectRepository(ABTest)
    private readonly abTestRepository: Repository<ABTest>,
    @InjectRepository(ABTestResult)
    private readonly resultRepository: Repository<ABTestResult>,
    @InjectRepository(MLModel)
    private readonly modelRepository: Repository<MLModel>,
    private readonly pythonAiService: PythonAiServiceService,
    private readonly cacheService: CacheService,
  ) {}

  async createABTest(testData: CreateABTestDto, createdBy: string = '1'): Promise<ABTest> {
    try {
      this.logger.log(`Creating A/B test: ${testData.name}`);

      // Validate models exist and are deployable
      const [controlModel, testModel] = await Promise.all([
        this.modelRepository.findOne({ where: { id: testData.controlModelId } }),
        this.modelRepository.findOne({ where: { id: testData.testModelId } }),
      ]);

      if (!controlModel) {
        throw new NotFoundException(`Control model not found: ${testData.controlModelId}`);
      }

      if (!testModel) {
        throw new NotFoundException(`Test model not found: ${testData.testModelId}`);
      }

      // Ensure both models are in production or at least deployed
      if (controlModel.status !== ModelStatus.PRODUCTION) {
        throw new BadRequestException('Control model must be in production');
      }

      if (testModel.status !== ModelStatus.PRODUCTION && testModel.status !== ModelStatus.STAGING) {
        throw new BadRequestException('Test model must be deployed (production or staging)');
      }

      // Check for name uniqueness
      const existingTest = await this.abTestRepository.findOne({
        where: { name: testData.name, isActive: true },
      });

      if (existingTest) {
        throw new BadRequestException(
          `Active A/B test with name "${testData.name}" already exists`,
        );
      }

      // Calculate end date
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + testData.duration);

      const abTest = this.abTestRepository.create({
        name: testData.name,
        description: testData.description,
        controlModelId: testData.controlModelId,
        testModelId: testData.testModelId,
        trafficSplit: testData.trafficSplit,
        successMetrics: testData.successMetrics,
        status: ABTestStatus.PLANNED,
        startDate,
        endDate,
        configuration: testData.configuration || {
          minimumSampleSize: 100,
          confidenceLevel: 0.95,
          significanceThreshold: 0.05,
          allowEarlyStop: false,
        },
        createdBy,
        isActive: true,
        metadata: {
          createdAt: new Date(),
          targetAudience: testData.targetAudience,
        },
      });

      const savedTest = await this.abTestRepository.save(abTest);
      this.logger.log(`A/B test created successfully: ${savedTest.id}`);

      return savedTest;
    } catch (error) {
      this.logger.error(`Failed to create A/B test: ${error.message}`);
      throw error;
    }
  }

  async startABTest(testId: string): Promise<ABTest | null> {
    try {
      const test = await this.abTestRepository.findOne({
        where: { id: testId },
        relations: ['controlModel', 'testModel'],
      });

      if (!test) {
        throw new NotFoundException(`A/B test not found: ${testId}`);
      }

      if (test.status !== ABTestStatus.PLANNED) {
        throw new BadRequestException(`Cannot start test in status: ${test.status}`);
      }

      // Verify models are still deployable
      if (test.controlModel.status !== ModelStatus.PRODUCTION) {
        throw new BadRequestException('Control model is no longer in production');
      }

      if (
        test.testModel.status !== ModelStatus.PRODUCTION &&
        test.testModel.status !== ModelStatus.STAGING
      ) {
        throw new BadRequestException('Test model is no longer deployed');
      }

      // Start the test in Python AI service
      try {
        const startResponse = await this.pythonAiService.makeRequest('/ai/ab-test/start', {
          model_type: 'ab_testing',
          data: {
            test_id: testId,
            control_model_id: test.controlModelId,
            test_model_id: test.testModelId,
            traffic_split: test.trafficSplit,
            success_metrics: test.successMetrics,
            configuration: test.configuration,
          },
        });

        if (!startResponse.success) {
          throw new Error(`Python AI service error: ${startResponse.error}`);
        }

        // Update test status

        const abTest = await this.abTestRepository.findOneByOrFail({ id: testId });

        abTest.status = ABTestStatus.RUNNING;
        abTest.startDate = new Date();
        abTest.metadata = {
          ...abTest.metadata,
          pythonJobId: startResponse.data?.job_id,
          actualStartTime: new Date().toISOString(),
        };

        await this.abTestRepository.save(abTest);

        // Cache test info for quick access
        await this.cacheService.set(
          `ab_test:${testId}`,
          { ...test, status: ABTestStatus.RUNNING },
          3600, // 1 hour
        );

        this.logger.log(`A/B test started successfully: ${testId}`);

        return await this.abTestRepository.findOne({ where: { id: testId } });
      } catch (aiError) {
        this.logger.error(`Failed to start A/B test in AI service: ${aiError.message}`);
        throw new BadRequestException(`Failed to start A/B test: ${aiError.message}`);
      }
    } catch (error) {
      this.logger.error(`Failed to start A/B test: ${error.message}`);
      throw error;
    }
  }

  async recordABTestResult(
    testId: string,
    userId: string,
    modelVariant: 'control' | 'test',
    metricValues: Record<string, number>,
    contextData?: any,
  ): Promise<ABTestResult | null> {
    try {
      const test = await this.abTestRepository.findOne({ where: { id: testId } });

      if (!test) {
        throw new NotFoundException(`A/B test not found: ${testId}`);
      }

      if (test.status !== ABTestStatus.RUNNING) {
        throw new BadRequestException(`Cannot record results for test in status: ${test.status}`);
      }

      // Check if test is still within time window
      const now = new Date();
      if (now > test.endDate) {
        throw new BadRequestException('A/B test has expired');
      }

      // Validate metric values against expected metrics
      const missingMetrics = test.successMetrics.filter(metric => !(metric in metricValues));
      if (missingMetrics.length > 0) {
        throw new BadRequestException(`Missing required metrics: ${missingMetrics.join(', ')}`);
      }

      // Check for duplicate result for same user (optional - depends on test design)
      const existingResult = await this.resultRepository.findOne({
        where: { testId, userId },
      });

      if (existingResult) {
        this.logger.warn(`Duplicate result for user ${userId} in test ${testId}`);
        // Depending on requirements, you might want to update existing result
        // or throw an error. Here we'll update the existing result.
        const result = await this.resultRepository.findOneByOrFail({ id: existingResult.id });

        result.metricValues = metricValues;
        result.contextData = contextData;
        result.recordedAt = new Date();
        result.metadata = {
          ...result.metadata,
          updatedAt: new Date(),
          isUpdate: true,
        };

        await this.resultRepository.save(result);

        return await this.resultRepository.findOne({ where: { id: existingResult.id } });
      }

      const result = this.resultRepository.create({
        testId,
        userId,
        modelVariant,
        metricValues,
        contextData: contextData || {},
        recordedAt: new Date(),
        metadata: {
          userAgent: contextData?.userAgent,
          sessionId: contextData?.sessionId,
          deviceType: contextData?.deviceType,
        },
      });

      const savedResult = await this.resultRepository.save(result);

      // Update cache with new result count
      await this.updateResultCountCache(testId, modelVariant);

      this.logger.log(`Recorded A/B test result: ${savedResult.id} for test: ${testId}`);

      return savedResult;
    } catch (error) {
      this.logger.error(`Failed to record A/B test result: ${error.message}`);
      throw error;
    }
  }

  async getABTestResults(testId: string): Promise<ABTestAnalysis> {
    try {
      const test = await this.abTestRepository.findOne({
        where: { id: testId },
        relations: ['testResults', 'controlModel', 'testModel'],
      });

      if (!test) {
        throw new NotFoundException(`A/B test not found: ${testId}`);
      }

      // Get detailed results
      const results = await this.resultRepository.find({
        where: { testId },
        order: { recordedAt: 'ASC' },
      });

      const controlResults = results.filter(r => r.modelVariant === 'control');
      const testResults = results.filter(r => r.modelVariant === 'test');

      let analysis: ABTestAnalysis;

      // Try to get analysis from Python AI service
      try {
        const analysisResponse = await this.pythonAiService.makeRequest('/ai/ab-test/analyze', {
          model_type: 'ab_testing',
          data: {
            test_id: testId,
            control_results: controlResults.map(r => ({
              userId: r.userId,
              metrics: r.metricValues,
              timestamp: r.recordedAt,
            })),
            test_results: testResults.map(r => ({
              userId: r.userId,
              metrics: r.metricValues,
              timestamp: r.recordedAt,
            })),
            success_metrics: test.successMetrics,
            configuration: test.configuration,
          },
        });

        if (analysisResponse.success) {
          analysis = {
            test,
            summary: analysisResponse.data.summary,
            recommendations: analysisResponse.data.recommendations,
          };
        } else {
          throw new Error('AI analysis failed');
        }
      } catch (error) {
        this.logger.warn(`AI analysis failed, using fallback: ${error.message}`);

        // Fallback to basic analysis
        analysis = {
          test,
          summary: {
            totalUsers: results.length,
            controlUsers: controlResults.length,
            testUsers: testResults.length,
            results: this.calculateBasicMetrics(controlResults, testResults, test.successMetrics),
            significance: this.calculateBasicSignificance(
              controlResults,
              testResults,
              test.successMetrics,
            ),
          },
          recommendations: this.generateBasicRecommendations(controlResults, testResults, test),
        };
      }

      // Update test results summary
      await this.abTestRepository.update(testId, {
        results: analysis.summary,
      });

      return analysis;
    } catch (error) {
      this.logger.error(`Failed to get A/B test results: ${error.message}`);
      throw error;
    }
  }

  async stopABTest(testId: string, reason?: string): Promise<ABTest | null> {
    try {
      const test = await this.abTestRepository.findOne({ where: { id: testId } });

      if (!test) {
        throw new NotFoundException(`A/B test not found: ${testId}`);
      }

      if (test.status !== ABTestStatus.RUNNING) {
        throw new BadRequestException(`Cannot stop test in status: ${test.status}`);
      }

      // Stop the test in Python AI service
      try {
        await this.pythonAiService.makeRequest('/ai/ab-test/stop', {
          model_type: 'ab_testing',
          data: {
            test_id: testId,
            reason: reason || 'Manual stop',
          },
        });
      } catch (error) {
        this.logger.warn(`Failed to stop test in AI service: ${error.message}`);
      }

      // Get final analysis before stopping
      const finalAnalysis = await this.getABTestResults(testId);

      const abTest = await this.abTestRepository.findOneByOrFail({ id: testId });

      abTest.status = ABTestStatus.COMPLETED;
      abTest.endDate = new Date();
      abTest.results = finalAnalysis.summary;
      abTest.metadata = {
        ...abTest.metadata,
        stopReason: reason,
        stoppedAt: new Date(),
        finalAnalysis: finalAnalysis.summary,
      };

      await this.abTestRepository.save(abTest);

      // Clear cache
      await this.cacheService.del(`ab_test:${testId}`);

      this.logger.log(`A/B test stopped successfully: ${testId}`);

      return await this.abTestRepository.findOne({ where: { id: testId } });
    } catch (error) {
      this.logger.error(`Failed to stop A/B test: ${error.message}`);
      throw error;
    }
  }

  async getABTestById(testId: string): Promise<ABTest> {
    try {
      const test = await this.abTestRepository.findOne({
        where: { id: testId },
        relations: ['controlModel', 'testModel', 'testResults'],
      });

      if (!test) {
        throw new NotFoundException(`A/B test not found: ${testId}`);
      }

      return test;
    } catch (error) {
      this.logger.error(`Failed to get A/B test: ${error.message}`);
      throw error;
    }
  }

  async getAllABTests(
    filters?: {
      status?: ABTestStatus;
      modelId?: string;
      createdBy?: string;
    },
    pagination?: { page: number; limit: number },
  ): Promise<{ tests: ABTest[]; total: number }> {
    try {
      const query = this.abTestRepository
        .createQueryBuilder('test')
        .leftJoinAndSelect('test.controlModel', 'controlModel')
        .leftJoinAndSelect('test.testModel', 'testModel')
        .where('test.isActive = :isActive', { isActive: true });

      if (filters?.status) {
        query.andWhere('test.status = :status', { status: filters.status });
      }

      if (filters?.modelId) {
        query.andWhere('(test.controlModelId = :modelId OR test.testModelId = :modelId)', {
          modelId: filters.modelId,
        });
      }

      if (filters?.createdBy) {
        query.andWhere('test.createdBy = :createdBy', { createdBy: filters.createdBy });
      }

      // Add pagination
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 10;
      const offset = (page - 1) * limit;

      query.skip(offset).take(limit);
      query.orderBy('test.createdAt', 'DESC');

      const [tests, total] = await query.getManyAndCount();

      return { tests, total };
    } catch (error) {
      this.logger.error(`Failed to get A/B tests: ${error.message}`);
      throw error;
    }
  }

  async deleteABTest(testId: string): Promise<void> {
    try {
      const test = await this.abTestRepository.findOne({ where: { id: testId } });

      if (!test) {
        throw new NotFoundException(`A/B test not found: ${testId}`);
      }

      if (test.status === ABTestStatus.RUNNING) {
        throw new BadRequestException('Cannot delete a running A/B test. Stop it first.');
      }

      // Soft delete - mark as inactive
      const abTest = await this.abTestRepository.findOneByOrFail({ id: testId });

      abTest.isActive = false;
      abTest.metadata = {
        ...abTest.metadata,
        deletedAt: new Date(),
      };

      await this.abTestRepository.save(abTest);

      // Clean up cache
      await this.cacheService.del(`ab_test:${testId}`);

      this.logger.log(`A/B test deleted: ${testId}`);
    } catch (error) {
      this.logger.error(`Failed to delete A/B test: ${error.message}`);
      throw error;
    }
  }

  // ==================== PRIVATE HELPER METHODS ==================

  private async updateResultCountCache(testId: string, variant: 'control' | 'test'): Promise<void> {
    try {
      const cacheKey = `ab_test_counts:${testId}`;
      const counts = (await this.cacheService.get(cacheKey)) || { control: 0, test: 0 };

      counts[variant]++;

      await this.cacheService.set(cacheKey, counts, 3600);
    } catch (error) {
      this.logger.warn(`Failed to update result count cache: ${error.message}`);
    }
  }

  private calculateBasicMetrics(
    controlResults: ABTestResult[],
    testResults: ABTestResult[],
    successMetrics: string[],
  ): Record<string, any> {
    const metrics: Record<string, any> = {};

    successMetrics.forEach(metric => {
      const controlValues = controlResults
        .map(r => r.metricValues[metric])
        .filter(v => v !== undefined);

      const testValues = testResults.map(r => r.metricValues[metric]).filter(v => v !== undefined);

      const controlAvg =
        controlValues.length > 0
          ? controlValues.reduce((sum, val) => sum + val, 0) / controlValues.length
          : 0;

      const testAvg =
        testValues.length > 0
          ? testValues.reduce((sum, val) => sum + val, 0) / testValues.length
          : 0;

      metrics[metric] = {
        control: {
          average: controlAvg,
          count: controlValues.length,
          values: controlValues,
        },
        test: {
          average: testAvg,
          count: testValues.length,
          values: testValues,
        },
        improvement: controlAvg > 0 ? ((testAvg - controlAvg) / controlAvg) * 100 : 0,
      };
    });

    return metrics;
  }

  private calculateBasicSignificance(
    controlResults: ABTestResult[],
    testResults: ABTestResult[],
    successMetrics: string[],
  ): Record<string, any> {
    // Basic significance calculation (would be more sophisticated in practice)
    const significance: Record<string, any> = {};

    successMetrics.forEach(metric => {
      const controlCount = controlResults.length;
      const testCount = testResults.length;

      // Simple check for minimum sample size
      const hasMinSampleSize = controlCount >= 30 && testCount >= 30;

      significance[metric] = {
        hasMinSampleSize,
        controlSampleSize: controlCount,
        testSampleSize: testCount,
        isSignificant:
          hasMinSampleSize &&
          Math.abs(controlCount - testCount) / Math.max(controlCount, testCount) < 0.1,
        confidence: hasMinSampleSize ? 0.85 : 0.5,
      };
    });

    return significance;
  }

  private generateBasicRecommendations(
    controlResults: ABTestResult[],
    testResults: ABTestResult[],
    test: ABTest,
  ): string[] {
    const recommendations: string[] = [];

    if (controlResults.length < 30 || testResults.length < 30) {
      recommendations.push(
        'Collect more data to reach statistical significance (minimum 30 samples per variant)',
      );
    }

    const totalResults = controlResults.length + testResults.length;
    if (totalResults < test.configuration!.minimumSampleSize! || 100) {
      recommendations.push(
        `Need ${(test.configuration?.minimumSampleSize || 100) - totalResults} more samples to reach minimum sample size`,
      );
    }

    if (test.status === ABTestStatus.RUNNING) {
      const timeRemaining = test.endDate.getTime() - Date.now();
      if (timeRemaining < 24 * 60 * 60 * 1000) {
        // Less than 24 hours
        recommendations.push(
          'Test is nearing completion. Consider extending if more data is needed.',
        );
      }
    }

    if (
      Math.abs(controlResults.length - testResults.length) >
      Math.max(controlResults.length, testResults.length) * 0.2
    ) {
      recommendations.push(
        'Sample sizes between variants are imbalanced. Check traffic split configuration.',
      );
    }

    return recommendations;
  }
}
