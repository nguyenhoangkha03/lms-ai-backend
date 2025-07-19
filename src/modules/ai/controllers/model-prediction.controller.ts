import {
  Controller,
  Get,
  Post,
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
import { ModelPredictionService } from '../services/model-prediction.service';

@ApiTags('Model Predictions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ai/predictions')
export class ModelPredictionController {
  constructor(private readonly predictionService: ModelPredictionService) {}

  @Post()
  @Roles('student', 'instructor', 'admin')
  @ApiOperation({ summary: 'Make a prediction using a trained model' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Prediction made successfully',
  })
  async makePrediction(
    @Body()
    predictionDto: {
      modelId: string;
      inputData: any;
      predictionType: string;
      context?: any;
    },
    @CurrentUser() user: UserPayload,
  ) {
    const prediction = await this.predictionService.makePrediction(
      predictionDto.modelId,
      predictionDto.inputData,
      predictionDto.predictionType,
      user.sub,
      predictionDto.context,
    );

    return {
      success: true,
      message: 'Prediction made successfully',
      data: prediction,
    };
  }

  @Get()
  @Roles('student', 'instructor', 'admin')
  @ApiOperation({ summary: 'Get user predictions history' })
  @ApiQuery({ name: 'modelId', required: false, type: String })
  @ApiQuery({ name: 'predictionType', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Predictions retrieved successfully',
  })
  async getUserPredictions(
    @CurrentUser() user: UserPayload,
    @Query('modelId') modelId?: string,
    @Query('predictionType') predictionType?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const predictions = await this.predictionService.getUserPredictions(
      user.sub,
      { modelId, predictionType },
      { page, limit },
    );

    return {
      success: true,
      data: predictions.predictions,
      pagination: {
        page,
        limit,
        total: predictions.total,
        pages: Math.ceil(predictions.total / limit),
      },
    };
  }

  @Get(':id')
  @Roles('student', 'instructor', 'admin')
  @ApiOperation({ summary: 'Get prediction by ID' })
  @ApiParam({ name: 'id', description: 'Prediction ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Prediction retrieved successfully',
  })
  async getPredictionById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() _user: UserPayload,
  ) {
    const prediction = await this.predictionService.getPredictionById(id);

    return {
      success: true,
      data: prediction,
    };
  }

  @Post('batch')
  @Roles('instructor', 'admin')
  @ApiOperation({ summary: 'Make batch predictions' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Batch predictions started successfully',
  })
  async makeBatchPredictions(
    @Body()
    batchDto: {
      modelId: string;
      inputDataList: any[];
      predictionType: string;
      context?: any;
    },
    @CurrentUser() user: UserPayload,
  ) {
    const batchJob = await this.predictionService.makeBatchPredictions(
      batchDto.modelId,
      batchDto.inputDataList,
      batchDto.predictionType,
      user.sub,
      batchDto.context,
    );

    return {
      success: true,
      message: 'Batch predictions started successfully',
      data: {
        batchId: batchJob.id,
        status: batchJob.status,
        totalPredictions: batchDto.inputDataList.length,
      },
    };
  }

  @Get('batch/:batchId/status')
  @Roles('instructor', 'admin')
  @ApiOperation({ summary: 'Get batch prediction status' })
  @ApiParam({ name: 'batchId', description: 'Batch ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Batch status retrieved successfully',
  })
  async getBatchStatus(@Param('batchId') batchId: string, @CurrentUser() _user: UserPayload) {
    const status = await this.predictionService.getBatchPredictionStatus(batchId);

    return {
      success: true,
      data: status,
    };
  }
}
