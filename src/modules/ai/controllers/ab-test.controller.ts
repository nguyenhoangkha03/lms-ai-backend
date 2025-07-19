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
import { AbTestService } from '../services/ab-test.service';
import { CreateABTestDto } from '../dto/ab-test.dto';

@ApiTags('A/B Testing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ai/ab-tests')
export class AbTestController {
  constructor(private readonly abTestService: AbTestService) {}

  @Post()
  @Roles('admin', 'data_scientist')
  @ApiOperation({ summary: 'Create a new A/B test' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'A/B test created successfully',
  })
  async createABTest(
    @Body()
    createTestDto: {
      name: string;
      description: string;
      controlModelId: string;
      treatmentModelId: string;
      trafficSplit: number;
      successMetrics: string[];
      duration: number;
      targetAudience?: any;
    } & CreateABTestDto,
    @CurrentUser() _user: UserPayload,
  ) {
    const test = await this.abTestService.createABTest(createTestDto);

    return {
      success: true,
      message: 'A/B test created successfully',
      data: test,
    };
  }

  @Post(':id/start')
  @Roles('admin', 'data_scientist')
  @ApiOperation({ summary: 'Start an A/B test' })
  @ApiParam({ name: 'id', description: 'A/B test ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'A/B test started successfully',
  })
  async startABTest(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() _user: UserPayload) {
    const test = await this.abTestService.startABTest(id);

    return {
      success: true,
      message: 'A/B test started successfully',
      data: test,
    };
  }

  @Post(':id/stop')
  @Roles('admin', 'data_scientist')
  @ApiOperation({ summary: 'Stop an A/B test' })
  @ApiParam({ name: 'id', description: 'A/B test ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'A/B test stopped successfully',
  })
  async stopABTest(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() _user: UserPayload,
    @Body('reason') reason?: string,
  ) {
    const test = await this.abTestService.stopABTest(id, reason);

    return {
      success: true,
      message: 'A/B test stopped successfully',
      data: test,
    };
  }

  @Post(':id/results')
  @Roles('admin', 'data_scientist', 'instructor')
  @ApiOperation({ summary: 'Record A/B test result' })
  @ApiParam({ name: 'id', description: 'A/B test ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Test result recorded successfully',
  })
  async recordResult(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    resultDto: {
      userId: string;
      modelVariant: 'control' | 'test';
      metrics: Record<string, number>;
      metadata?: any;
    },
    @CurrentUser() _user: UserPayload,
  ) {
    const result = await this.abTestService.recordABTestResult(
      id,
      resultDto.userId,
      resultDto.modelVariant,
      resultDto.metrics,
      resultDto.metadata,
    );

    return {
      success: true,
      message: 'Test result recorded successfully',
      data: result,
    };
  }

  @Get(':id/results')
  @Roles('admin', 'data_scientist', 'instructor')
  @ApiOperation({ summary: 'Get A/B test results and analysis' })
  @ApiParam({ name: 'id', description: 'A/B test ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'A/B test results retrieved successfully',
  })
  async getABTestResults(@Param('id', ParseUUIDPipe) id: string) {
    const results = await this.abTestService.getABTestResults(id);

    return {
      success: true,
      data: results,
    };
  }

  @Get()
  @Roles('admin', 'data_scientist', 'instructor')
  @ApiOperation({ summary: 'Get all A/B tests' })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'A/B tests retrieved successfully',
  })
  async getABTests(
    @Query('status') _status?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    // Implementation would get A/B tests with pagination and filtering
    return {
      success: true,
      data: [],
      pagination: {
        page,
        limit,
        total: 0,
        pages: 0,
      },
    };
  }
}
