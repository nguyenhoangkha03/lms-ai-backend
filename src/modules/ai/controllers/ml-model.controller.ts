// import {
//   Controller,
//   Get,
//   Post,
//   Put,
//   Delete,
//   Body,
//   Param,
//   Query,
//   UseGuards,
//   HttpStatus,
//   HttpCode,
// } from '@nestjs/common';
// import {
//   ApiTags,
//   ApiOperation,
//   ApiResponse,
//   ApiParam,
//   ApiQuery,
//   ApiBearerAuth,
// } from '@nestjs/swagger';
// import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
// import { RolesGuard } from '@/modules/auth/guards/roles.guard';
// import { Roles } from '@/modules/auth/decorators/roles.decorator';
// import { UserType } from '@/common/enums/user.enums';
// import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
// import { UserPayload } from '@/modules/auth/interfaces/user-payload.interface';
// import { MLModelService } from '../services/ml-model.service';
// import { PythonAIServiceService } from '../services/python-ai-service.service';
// import {
//   CreateMLModelDto,
//   UpdateMLModelDto,
//   ModelDeploymentDto,
//   CreateModelVersionDto,
//   ModelTrainingDto,
//   ModelHealthCheckDto,
// } from '../dto/ml-model.dto';

// @ApiTags('ML Models')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
// @Controller('ai/models')
// export class MLModelController {
//   constructor(
//     private readonly mlModelService: MLModelService,
//     private readonly pythonAIService: PythonAIServiceService,
//   ) {}

//   @Post()
//   @UseGuards(RolesGuard)
//   @Roles(Role.ADMIN, Role.TEACHER)
//   @ApiOperation({ summary: 'Create new ML model' })
//   @ApiResponse({ status: 201, description: 'Model created successfully' })
//   async createModel(@CurrentUser() user: UserPayload, @Body() createModelDto: CreateMLModelDto) {
//     return this.mlModelService.create({
//       ...createModelDto,
//       createdBy: user.sub,
//     });
//   }

//   @Get()
//   @ApiOperation({ summary: 'Get all ML models' })
//   @ApiQuery({ name: 'type', required: false, description: 'Filter by model type' })
//   @ApiQuery({ name: 'status', required: false, description: 'Filter by model status' })
//   @ApiQuery({ name: 'framework', required: false, description: 'Filter by framework' })
//   @ApiResponse({ status: 200, description: 'Models retrieved successfully' })
//   async getModels(
//     @Query('type') type?: string,
//     @Query('status') status?: string,
//     @Query('framework') framework?: string,
//   ) {
//     return this.mlModelService.findAll({
//       type,
//       status,
//       framework,
//     });
//   }

//   @Get(':id')
//   @ApiOperation({ summary: 'Get ML model by ID' })
//   @ApiParam({ name: 'id', description: 'Model ID' })
//   @ApiResponse({ status: 200, description: 'Model retrieved successfully' })
//   async getModel(@Param('id') id: string) {
//     return this.mlModelService.findById(id);
//   }

//   @Put(':id')
//   @UseGuards(RolesGuard)
//   @Roles(Role.ADMIN, Role.TEACHER)
//   @ApiOperation({ summary: 'Update ML model' })
//   @ApiParam({ name: 'id', description: 'Model ID' })
//   @ApiResponse({ status: 200, description: 'Model updated successfully' })
//   async updateModel(@Param('id') id: string, @Body() updateModelDto: UpdateMLModelDto) {
//     return this.mlModelService.update(id, updateModelDto);
//   }

//   @Delete(':id')
//   @UseGuards(RolesGuard)
//   @Roles(Role.ADMIN)
//   @ApiOperation({ summary: 'Delete ML model' })
//   @ApiParam({ name: 'id', description: 'Model ID' })
//   @ApiResponse({ status: 204, description: 'Model deleted successfully' })
//   @HttpCode(HttpStatus.NO_CONTENT)
//   async deleteModel(@Param('id') id: string) {
//     return this.mlModelService.delete(id);
//   }

//   @Post(':id/deploy')
//   @UseGuards(RolesGuard)
//   @Roles(Role.ADMIN, Role.TEACHER)
//   @ApiOperation({ summary: 'Deploy ML model' })
//   @ApiParam({ name: 'id', description: 'Model ID' })
//   @ApiResponse({ status: 200, description: 'Model deployment initiated' })
//   async deployModel(@Param('id') id: string, @Body() deploymentDto: ModelDeploymentDto) {
//     return this.pythonAIService.deployModel({
//       ...deploymentDto,
//       modelId: id,
//     });
//   }

//   @Get(':id/health')
//   @ApiOperation({ summary: 'Check model health' })
//   @ApiParam({ name: 'id', description: 'Model ID' })
//   @ApiResponse({ status: 200, description: 'Health check completed' })
//   async checkHealth(@Param('id') id: string) {
//     return this.pythonAIService.checkModelHealth({ modelId: id });
//   }

//   @Get(':id/metrics')
//   @ApiOperation({ summary: 'Get model performance metrics' })
//   @ApiParam({ name: 'id', description: 'Model ID' })
//   @ApiQuery({ name: 'start', required: false, description: 'Start date for metrics' })
//   @ApiQuery({ name: 'end', required: false, description: 'End date for metrics' })
//   @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
//   async getMetrics(
//     @Param('id') id: string,
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

//     return this.pythonAIService.getModelMetrics(id, timeRange);
//   }

//   @Post(':id/train')
//   @UseGuards(RolesGuard)
//   @Roles(Role.ADMIN, Role.TEACHER)
//   @ApiOperation({ summary: 'Train ML model' })
//   @ApiParam({ name: 'id', description: 'Model ID' })
//   @ApiResponse({ status: 200, description: 'Training initiated' })
//   async trainModel(@Param('id') id: string, @Body() trainingDto: ModelTrainingDto) {
//     return this.pythonAIService.trainModel({
//       ...trainingDto,
//       modelId: id,
//     });
//   }

//   @Post(':id/retire')
//   @UseGuards(RolesGuard)
//   @Roles(Role.ADMIN)
//   @ApiOperation({ summary: 'Retire ML model' })
//   @ApiParam({ name: 'id', description: 'Model ID' })
//   @ApiResponse({ status: 200, description: 'Model retired successfully' })
//   async retireModel(@Param('id') id: string, @Body() retireDto: { reason?: string }) {
//     return this.pythonAIService.retireModel(id, retireDto.reason);
//   }

//   @Get(':id/versions')
//   @ApiOperation({ summary: 'Get model versions' })
//   @ApiParam({ name: 'id', description: 'Model ID' })
//   @ApiResponse({ status: 200, description: 'Versions retrieved successfully' })
//   async getVersions(@Param('id') id: string) {
//     return this.mlModelService.getVersions(id);
//   }

//   @Post(':id/versions')
//   @UseGuards(RolesGuard)
//   @Roles(Role.ADMIN, Role.TEACHER)
//   @ApiOperation({ summary: 'Create new model version' })
//   @ApiParam({ name: 'id', description: 'Model ID' })
//   @ApiResponse({ status: 201, description: 'Version created successfully' })
//   async createVersion(@Param('id') id: string, @Body() versionDto: CreateModelVersionDto) {
//     return this.pythonAIService.createModelVersion(id, versionDto);
//   }

//   @Put(':id/versions/:version/promote')
//   @UseGuards(RolesGuard)
//   @Roles(Role.ADMIN, Role.TEACHER)
//   @ApiOperation({ summary: 'Promote model version to production' })
//   @ApiParam({ name: 'id', description: 'Model ID' })
//   @ApiParam({ name: 'version', description: 'Version to promote' })
//   @ApiResponse({ status: 200, description: 'Version promoted successfully' })
//   async promoteVersion(@Param('id') id: string, @Param('version') version: string) {
//     return this.pythonAIService.promoteModelVersion(id, version);
//   }
// }
