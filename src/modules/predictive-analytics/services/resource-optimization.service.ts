import { ResourceOptimization, ResourceType } from '../entities/resource-optimization.entity';
import {
  CreateResourceOptimizationDto,
  UpdateResourceOptimizationDto,
  ResourceOptimizationQueryDto,
} from '../dto/resource-optimization.dto';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ResourceOptimizationService {
  private readonly logger = new Logger(ResourceOptimizationService.name);

  constructor(
    @InjectRepository(ResourceOptimization)
    private readonly optimizationRepository: Repository<ResourceOptimization>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreateResourceOptimizationDto): Promise<ResourceOptimization> {
    try {
      const optimization = this.optimizationRepository.create({
        ...dto,
        optimizationDate: new Date(),
      });

      const savedOptimization = await this.optimizationRepository.save(optimization);

      this.logger.log(
        `Created resource optimization ${savedOptimization.id} for ${dto.resourceType}:${dto.resourceId}`,
      );
      return savedOptimization;
    } catch (error) {
      this.logger.error(`Error creating resource optimization: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll(query: ResourceOptimizationQueryDto): Promise<ResourceOptimization[]> {
    try {
      const queryBuilder = this.optimizationRepository.createQueryBuilder('optimization');

      if (query.resourceType) {
        queryBuilder.andWhere('optimization.resourceType = :resourceType', {
          resourceType: query.resourceType,
        });
      }

      if (query.resourceId) {
        queryBuilder.andWhere('optimization.resourceId = :resourceId', {
          resourceId: query.resourceId,
        });
      }

      if (query.minEfficiencyImprovement) {
        queryBuilder.andWhere(
          '(optimization.predictedEfficiency - optimization.currentEfficiency) >= :minImprovement',
          {
            minImprovement: query.minEfficiencyImprovement,
          },
        );
      }

      if (query.implemented !== undefined) {
        queryBuilder.andWhere('optimization.isImplemented = :implemented', {
          implemented: query.implemented,
        });
      }

      if (query.startDate && query.endDate) {
        queryBuilder.andWhere('optimization.optimizationDate BETWEEN :startDate AND :endDate', {
          startDate: query.startDate,
          endDate: query.endDate,
        });
      }

      queryBuilder
        .orderBy('(optimization.predictedEfficiency - optimization.currentEfficiency)', 'DESC')
        .addOrderBy('optimization.optimizationDate', 'DESC');

      return await queryBuilder.getMany();
    } catch (error) {
      this.logger.error(`Error finding optimizations: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: string): Promise<ResourceOptimization> {
    try {
      const optimization = await this.optimizationRepository.findOne({
        where: { id },
      });

      if (!optimization) {
        throw new NotFoundException(`Resource optimization with ID ${id} not found`);
      }

      return optimization;
    } catch (error) {
      this.logger.error(`Error finding optimization ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(id: string, dto: UpdateResourceOptimizationDto): Promise<ResourceOptimization> {
    try {
      const optimization = await this.findOne(id);
      Object.assign(optimization, dto);

      const updatedOptimization = await this.optimizationRepository.save(optimization);

      this.logger.log(`Updated resource optimization ${id}`);
      return updatedOptimization;
    } catch (error) {
      this.logger.error(`Error updating optimization ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.findOne(id);
      await this.optimizationRepository.softDelete(id);

      this.logger.log(`Removed resource optimization ${id}`);
    } catch (error) {
      this.logger.error(`Error removing optimization ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async analyzeResourceUsage(
    resourceType: ResourceType,
    resourceId: string,
  ): Promise<ResourceOptimization> {
    try {
      this.logger.log(`Analyzing resource usage for ${resourceType}:${resourceId}`);

      // Collect resource usage data
      const usageData = await this.collectResourceUsageData(resourceType, resourceId);

      // Analyze optimization opportunities
      const optimizationAnalysis = await this.analyzeOptimizationOpportunities(usageData);

      // Create optimization record
      const optimizationDto: CreateResourceOptimizationDto = {
        resourceType,
        resourceId,
        currentEfficiency: optimizationAnalysis.currentEfficiency,
        predictedEfficiency: optimizationAnalysis.predictedEfficiency,
        currentUsage: optimizationAnalysis.currentUsage,
        recommendations: optimizationAnalysis.recommendations,
        predictedOutcomes: optimizationAnalysis.predictedOutcomes,
      };

      return await this.create(optimizationDto);
    } catch (error) {
      this.logger.error(`Error analyzing resource usage: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getOptimizationSummary(): Promise<any> {
    try {
      const optimizations = await this.optimizationRepository.find({
        order: { optimizationDate: 'DESC' },
      });

      const summary = {
        totalOptimizations: optimizations.length,
        implementedOptimizations: 0,
        totalEfficiencyGain: 0,
        avgCurrentEfficiency: 0,
        avgPredictedEfficiency: 0,
        resourceTypeDistribution: {},
        topRecommendations: [] as any[],
        implementationStatus: {
          pending: 0,
          inProgress: 0,
          completed: 0,
        },
      };

      if (optimizations.length > 0) {
        summary.implementedOptimizations = optimizations.filter(o => o.isImplemented).length;

        summary.avgCurrentEfficiency = Math.round(
          optimizations.reduce((sum, o) => sum + o.currentEfficiency, 0) / optimizations.length,
        );

        summary.avgPredictedEfficiency = Math.round(
          optimizations.reduce((sum, o) => sum + o.predictedEfficiency, 0) / optimizations.length,
        );

        summary.totalEfficiencyGain = Math.round(
          optimizations.reduce((sum, o) => sum + (o.predictedEfficiency - o.currentEfficiency), 0),
        );

        // Resource type distribution
        const typeDistribution = {};
        optimizations.forEach(o => {
          typeDistribution[o.resourceType] = (typeDistribution[o.resourceType] || 0) + 1;
        });
        summary.resourceTypeDistribution = typeDistribution;

        // Top recommendations by efficiency gain
        summary.topRecommendations = optimizations
          .sort(
            (a, b) =>
              b.predictedEfficiency -
              b.currentEfficiency -
              (a.predictedEfficiency - a.currentEfficiency),
          )
          .slice(0, 5)
          .map(o => ({
            id: o.id,
            resourceType: o.resourceType,
            resourceId: o.resourceId,
            efficiencyGain: o.predictedEfficiency - o.currentEfficiency,
            isImplemented: o.isImplemented,
          }));

        // Implementation status
        optimizations.forEach(o => {
          if (o.isImplemented) {
            summary.implementationStatus.completed++;
          } else if (o.implementationPlan) {
            summary.implementationStatus.inProgress++;
          } else {
            summary.implementationStatus.pending++;
          }
        });
      }

      return summary;
    } catch (error) {
      this.logger.error(`Error getting optimization summary: ${error.message}`, error.stack);
      throw error;
    }
  }

  async implementOptimization(id: string): Promise<ResourceOptimization> {
    try {
      const optimization = await this.findOne(id);

      // Create implementation plan if not exists
      if (!optimization.implementationPlan) {
        optimization.implementationPlan = this.generateImplementationPlan(optimization);
      }

      // Mark as implemented
      const updateDto: UpdateResourceOptimizationDto = {
        isImplemented: true,
      };

      return await this.update(id, updateDto);
    } catch (error) {
      this.logger.error(`Error implementing optimization ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async validateOptimizationResults(id: string): Promise<ResourceOptimization> {
    try {
      const optimization = await this.findOne(id);

      if (!optimization.isImplemented) {
        throw new BadRequestException('Optimization must be implemented before validation');
      }

      // Collect post-implementation data
      const postImplementationData = await this.collectResourceUsageData(
        optimization.resourceType,
        optimization.resourceId,
      );

      const actualEfficiency = postImplementationData.efficiency;

      const implementationResults = {
        successRate: Math.min(100, (actualEfficiency / optimization.predictedEfficiency) * 100),
        unexpectedIssues: [] as string[],
        additionalBenefits: [] as string[],
        lessonsLearned: [],
      };

      // Analyze results
      if (actualEfficiency >= optimization.predictedEfficiency * 0.9) {
        implementationResults.additionalBenefits.push('Met or exceeded efficiency targets');
      } else {
        implementationResults.unexpectedIssues.push('Lower than expected efficiency gains');
      }

      const updateDto: UpdateResourceOptimizationDto = {
        actualEfficiency,
        implementationResults,
      };

      return await this.update(id, updateDto);
    } catch (error) {
      this.logger.error(
        `Error validating optimization results ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async collectResourceUsageData(
    resourceType: ResourceType,
    _resourceId: string,
  ): Promise<any> {
    // This would collect actual usage data based on resource type
    // For now, return sample data
    const sampleData = {
      efficiency: Math.floor(Math.random() * 30) + 60, // 60-90
      utilizationRate: Math.floor(Math.random() * 40) + 60, // 60-100
      peakHours: ['09:00-11:00', '14:00-16:00', '19:00-21:00'],
      averageSessionDuration: Math.floor(Math.random() * 1800) + 900, // 15-45 minutes
      userSatisfaction: Math.floor(Math.random() * 20) + 70, // 70-90
      bottlenecks: ['High concurrent usage', 'Slow loading times'],
    };

    switch (resourceType) {
      case ResourceType.CONTENT:
        return {
          ...sampleData,
          contentViews: Math.floor(Math.random() * 1000) + 500,
          completionRate: Math.floor(Math.random() * 30) + 70,
        };
      case ResourceType.INSTRUCTOR_TIME:
        return {
          ...sampleData,
          bookingRate: Math.floor(Math.random() * 20) + 80,
          cancellationRate: Math.floor(Math.random() * 10) + 5,
        };
      case ResourceType.SYSTEM_RESOURCES:
        return {
          ...sampleData,
          cpuUsage: Math.floor(Math.random() * 40) + 40,
          memoryUsage: Math.floor(Math.random() * 30) + 50,
          responseTime: Math.floor(Math.random() * 500) + 200,
        };
      default:
        return sampleData;
    }
  }

  private async analyzeOptimizationOpportunities(usageData: any): Promise<any> {
    const currentEfficiency = usageData.efficiency;

    // Calculate potential efficiency improvements
    let predictedEfficiency = currentEfficiency;
    const recommendations: any[] = [];

    if (usageData.utilizationRate < 80) {
      predictedEfficiency += 10;
      recommendations.push({
        action: 'Increase resource utilization',
        impact: 10,
        effort: 3,
        timeline: '2 weeks',
        dependencies: ['Usage pattern analysis', 'User education'],
      });
    }

    if (usageData.userSatisfaction < 80) {
      predictedEfficiency += 8;
      recommendations.push({
        action: 'Improve user experience',
        impact: 8,
        effort: 5,
        timeline: '1 month',
        dependencies: ['UI/UX improvements', 'Performance optimization'],
      });
    }

    if (usageData.bottlenecks && usageData.bottlenecks.length > 0) {
      predictedEfficiency += 12;
      recommendations.push({
        action: 'Address performance bottlenecks',
        impact: 12,
        effort: 7,
        timeline: '3 weeks',
        dependencies: ['Infrastructure upgrade', 'Code optimization'],
      });
    }

    const predictedOutcomes = {
      costSavings: (predictedEfficiency - currentEfficiency) * 100,
      performanceImprovement: predictedEfficiency - currentEfficiency,
      userExperienceImprovement: Math.min(20, (predictedEfficiency - currentEfficiency) * 0.8),
      implementationCost: recommendations.reduce((sum, r) => sum + r.effort * 1000, 0),
      riskLevel: recommendations.length > 2 ? 'medium' : 'low',
    };

    return {
      currentEfficiency,
      predictedEfficiency: Math.min(100, predictedEfficiency),
      currentUsage: usageData,
      recommendations,
      predictedOutcomes,
    };
  }

  private generateImplementationPlan(optimization: ResourceOptimization): any[] {
    const plan: any[] = [];

    if (optimization.recommendations.length > 0) {
      plan.push({
        phase: 'Planning',
        actions: ['Analyze current state', 'Define success metrics', 'Allocate resources'],
        timeline: '1 week',
        resources: ['Project manager', 'Technical team'],
        milestones: ['Implementation plan approved'],
      });

      plan.push({
        phase: 'Implementation',
        actions: optimization.recommendations.map(r => r.action),
        timeline: '2-4 weeks',
        resources: ['Development team', 'Infrastructure team'],
        milestones: ['All recommendations implemented'],
      });

      plan.push({
        phase: 'Validation',
        actions: ['Monitor performance', 'Collect user feedback', 'Measure efficiency gains'],
        timeline: '2 weeks',
        resources: ['QA team', 'Analytics team'],
        milestones: ['Results validated and documented'],
      });
    }

    return plan;
  }
}
