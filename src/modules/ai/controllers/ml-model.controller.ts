import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserPayload } from '@/common/interfaces/user-payload.interface';
import { MlModelService } from '../services/ml-model.service';
import { ModelType, ModelFramework, DeploymentEnvironment } from '@/common/enums/ai.enums';
import { CreateABTestDto } from '../dto/ab-test.dto';

@ApiTags('ML Models')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ai/models')
export class MlModelController {
  constructor(private readonly mlModelService: MlModelService) {}

  @Post()
  @Roles('admin', 'data_scientist')
  @ApiOperation({ summary: 'Create a new ML model' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Model created successfully',
  })
  async createModel(
    @Body()
    createModelDto: {
      name: string;
      displayName: string;
      description: string;
      modelType: ModelType;
      framework: ModelFramework;
      version: string;
      config: any;
      tags?: string[];
    } & CreateABTestDto,
    @CurrentUser() _user: UserPayload,
  ) {
    const model = await this.mlModelService.createModel(createModelDto);

    return {
      success: true,
      message: 'Model created successfully',
      data: model,
    };
  }

  @Get()
  @Roles('admin', 'data_scientist', 'instructor')
  @ApiOperation({ summary: 'Get all ML models' })
  @ApiQuery({ name: 'modelType', required: false, enum: ModelType })
  @ApiQuery({ name: 'framework', required: false, enum: ModelFramework })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Models retrieved successfully',
  })
  async getModels(
    @Query('modelType') modelType?: ModelType,
    @Query('framework') framework?: ModelFramework,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const filters = { modelType, framework };
    const pagination = { page, limit };

    const result = await this.mlModelService.getModels(filters, pagination);

    return {
      success: true,
      data: result.models,
      pagination: {
        page,
        limit,
        total: result.total,
        pages: Math.ceil(result.total / limit),
      },
    };
  }

  @Get(':id')
  @Roles('admin', 'data_scientist', 'instructor')
  @ApiOperation({ summary: 'Get ML model by ID' })
  @ApiParam({ name: 'id', description: 'Model ID' })
  @ApiQuery({ name: 'includeVersions', required: false, type: Boolean })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Model retrieved successfully',
  })
  async getModelById(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('includeVersions') includeVersions: boolean = false,
  ) {
    const model = await this.mlModelService.getModelById(id, includeVersions);

    return {
      success: true,
      data: model,
    };
  }

  @Post(':id/versions')
  @Roles('admin', 'data_scientist')
  @ApiOperation({ summary: 'Create a new model version' })
  @ApiParam({ name: 'id', description: 'Model ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Model version created successfully',
  })
  async createModelVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    versionDto: {
      modelId: string;
      createdBy: string;
      version: string;
      description: string;
      config: any;
      modelArtifacts?: any;
      metrics?: any;
      isStable?: boolean;
    } & CreateABTestDto,
    @CurrentUser() _user: UserPayload,
  ) {
    const version = await this.mlModelService.createModelVersion(id, versionDto);

    return {
      success: true,
      message: 'Model version created successfully',
      data: version,
    };
  }

  @Post(':id/versions/:versionId/train')
  @Roles('admin', 'data_scientist')
  @ApiOperation({ summary: 'Train a model version' })
  @ApiParam({ name: 'id', description: 'Model ID' })
  @ApiParam({ name: 'versionId', description: 'Version ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Training started successfully',
  })
  async trainModel(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body()
    trainingDto: {
      modelId: string;
      trainedBy: string;
      datasetPath: string;
      trainingParams: any;
      validationSplit?: number;
      epochs?: number;
      batchSize?: number;
    },
  ) {
    const result = await this.mlModelService.trainModel(id, versionId, trainingDto);

    return {
      success: true,
      message: 'Training started successfully',
      data: result,
    };
  }

  @Post(':id/versions/:versionId/deploy')
  @Roles('admin', 'data_scientist')
  @ApiOperation({ summary: 'Deploy a model version' })
  @ApiParam({ name: 'id', description: 'Model ID' })
  @ApiParam({ name: 'versionId', description: 'Version ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Model deployed successfully',
  })
  async deployModel(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body()
    deploymentDto: {
      environment: DeploymentEnvironment;
      replicas?: number;
      resources?: any;
      autoScaling?: boolean;
    },
  ) {
    const result = await this.mlModelService.deployModel(id, versionId, deploymentDto);

    return {
      success: true,
      message: 'Model deployed successfully',
      data: result,
    };
  }

  @Delete(':id/versions/:versionId/deploy')
  @Roles('admin', 'data_scientist')
  @ApiOperation({ summary: 'Undeploy a model version' })
  @ApiParam({ name: 'id', description: 'Model ID' })
  @ApiParam({ name: 'versionId', description: 'Version ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Model undeployed successfully',
  })
  async undeployModel(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
  ) {
    await this.mlModelService.undeployModel(id, versionId);

    return {
      success: true,
      message: 'Model undeployed successfully',
    };
  }

  @Get(':id/metrics')
  @Roles('admin', 'data_scientist', 'instructor')
  @ApiOperation({ summary: 'Get model performance metrics' })
  @ApiParam({ name: 'id', description: 'Model ID' })
  @ApiQuery({ name: 'versionId', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Metrics retrieved successfully',
  })
  async getModelMetrics(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('versionId') versionId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const timeRange =
      startDate && endDate
        ? {
            start: new Date(startDate),
            end: new Date(endDate),
          }
        : undefined;

    const metrics = await this.mlModelService.getModelPerformanceMetrics(id, versionId, timeRange);

    return {
      success: true,
      data: metrics,
      timeRange,
    };
  }

  @Post(':id/versions/:versionId/validate')
  @Roles('admin', 'data_scientist')
  @ApiOperation({ summary: 'Validate a model version' })
  @ApiParam({ name: 'id', description: 'Model ID' })
  @ApiParam({ name: 'versionId', description: 'Version ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Validation completed successfully',
  })
  async validateModel(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body()
    validationDto: {
      testDataset: string;
      validationMetrics: string[];
      thresholds?: Record<string, number>;
    },
  ) {
    const result = await this.mlModelService.validateModel(id, versionId, validationDto);

    return {
      success: true,
      message: 'Validation completed successfully',
      data: result,
    };
  }

  @Put(':id')
  @Roles('admin', 'data_scientist')
  @ApiOperation({ summary: 'Update ML model' })
  @ApiParam({ name: 'id', description: 'Model ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Model updated successfully',
  })
  async updateModel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    updateDto: Partial<{
      name: string;
      description: string;
      config: any;
      tags: string[];
    }>,
  ) {
    const model = await this.mlModelService.updateModel(id, updateDto);

    return {
      success: true,
      message: 'Model updated successfully',
      data: model,
    };
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete ML model' })
  @ApiParam({ name: 'id', description: 'Model ID' })
  @ApiQuery({ name: 'force', required: false, type: Boolean })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Model deleted successfully',
  })
  async deleteModel(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('force') force: boolean = false,
  ) {
    await this.mlModelService.deleteModel(id, force);

    return {
      success: true,
      message: 'Model deleted successfully',
    };
  }

  @Get(':id/health')
  @Roles('admin', 'data_scientist', 'instructor')
  @ApiOperation({ summary: 'Check model health' })
  @ApiParam({ name: 'id', description: 'Model ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Health status retrieved successfully',
  })
  async checkModelHealth(@Param('id', ParseUUIDPipe) id: string) {
    const health = await this.mlModelService.monitorModelHealth(id);

    return {
      success: true,
      data: health,
      checkedAt: new Date(),
    };
  }

  @Get(':id/usage-stats')
  @Roles('admin', 'data_scientist')
  @ApiOperation({ summary: 'Get model usage statistics' })
  @ApiParam({ name: 'id', description: 'Model ID' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Usage statistics retrieved successfully',
  })
  async getUsageStatistics(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const timeRange = {
      start: new Date(startDate),
      end: new Date(endDate),
    };

    const stats = await this.mlModelService.getModelUsageStatistics(id, timeRange);

    return {
      success: true,
      data: stats,
      timeRange,
    };
  }
}
