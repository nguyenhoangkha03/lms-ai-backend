import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import {
  CreateResourceOptimizationDto,
  ResourceOptimizationQueryDto,
  UpdateResourceOptimizationDto,
} from '../dto/resource-optimization.dto';
import { ResourceOptimizationService } from '../services/resource-optimization.service';
import { ResourceOptimizationResponseDto } from '../dto/predictive-analytics-responses.dto';
import { ResourceType } from '../entities/resource-optimization.entity';

@ApiTags('Resource Optimization')
@Controller('predictive-analytics/resource-optimization')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ResourceOptimizationController {
  constructor(private readonly resourceOptimizationService: ResourceOptimizationService) {}

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new resource optimization' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Resource optimization created successfully',
    type: ResourceOptimizationResponseDto,
  })
  async create(@Body() createDto: CreateResourceOptimizationDto) {
    return await this.resourceOptimizationService.create(createDto);
  }

  @Get()
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Get all resource optimizations' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resource optimizations retrieved successfully',
    type: [ResourceOptimizationResponseDto],
  })
  async findAll(@Query() query: ResourceOptimizationQueryDto) {
    return await this.resourceOptimizationService.findAll(query);
  }

  @Get(':id')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Get a resource optimization by ID' })
  @ApiParam({ name: 'id', description: 'Resource optimization ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resource optimization retrieved successfully',
    type: ResourceOptimizationResponseDto,
  })
  async findOne(@Param('id') id: string) {
    return await this.resourceOptimizationService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update a resource optimization' })
  @ApiParam({ name: 'id', description: 'Resource optimization ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resource optimization updated successfully',
    type: ResourceOptimizationResponseDto,
  })
  async update(@Param('id') id: string, @Body() updateDto: UpdateResourceOptimizationDto) {
    return await this.resourceOptimizationService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a resource optimization' })
  @ApiParam({ name: 'id', description: 'Resource optimization ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Resource optimization deleted successfully',
  })
  async remove(@Param('id') id: string) {
    await this.resourceOptimizationService.remove(id);
  }

  @Post('analyze')
  @Roles('admin')
  @ApiOperation({ summary: 'Analyze resource usage and generate optimization recommendations' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Resource analysis completed successfully',
    type: ResourceOptimizationResponseDto,
  })
  async analyzeResourceUsage(@Body() body: { resourceType: ResourceType; resourceId: string }) {
    return await this.resourceOptimizationService.analyzeResourceUsage(
      body.resourceType,
      body.resourceId,
    );
  }

  @Get('summary/overview')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Get optimization summary overview' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Optimization summary retrieved successfully',
  })
  async getOptimizationSummary() {
    return await this.resourceOptimizationService.getOptimizationSummary();
  }

  @Post(':id/implement')
  @Roles('admin')
  @ApiOperation({ summary: 'Implement a resource optimization' })
  @ApiParam({ name: 'id', description: 'Resource optimization ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resource optimization implemented successfully',
    type: ResourceOptimizationResponseDto,
  })
  async implementOptimization(@Param('id') id: string) {
    return await this.resourceOptimizationService.implementOptimization(id);
  }

  @Post(':id/validate')
  @Roles('admin')
  @ApiOperation({ summary: 'Validate optimization results' })
  @ApiParam({ name: 'id', description: 'Resource optimization ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Optimization results validated successfully',
    type: ResourceOptimizationResponseDto,
  })
  async validateOptimizationResults(@Param('id') id: string) {
    return await this.resourceOptimizationService.validateOptimizationResults(id);
  }
}
