// import {
//   Controller,
//   Post,
//   Get,
//   Put,
//   Delete,
//   Body,
//   Param,
//   Query,
//   UseGuards,
//   HttpCode,
//   HttpStatus,
// } from '@nestjs/common';
// import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
// import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
// import { RolesGuard } from '@/modules/auth/guards/roles.guard';
// import { Roles } from '@/modules/auth/decorators/roles.decorator';
// import { Role } from '@/common/enums/role.enum';
// import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
// import { UserPayload } from '@/modules/auth/interfaces/user-payload.interface';
// import { ABTestService } from '../services/ab-test.service';
// import { CreateABTestDto, ABTestResultDto } from '../dto/ml-model.dto';

// @ApiTags('A/B Testing')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
// @Controller('ai/ab-tests')
// export class ABTestController {
//   constructor(private readonly abTestService: ABTestService) {}

//   @Post()
//   @UseGuards(RolesGuard)
//   @Roles(Role.ADMIN, Role.TEACHER)
//   @ApiOperation({ summary: 'Create new A/B test' })
//   @ApiResponse({ status: 201, description: 'A/B test created successfully' })
//   async createTest(@CurrentUser() user: UserPayload, @Body() createTestDto: CreateABTestDto) {
//     return this.abTestService.create({
//       ...createTestDto,
//       createdBy: user.sub,
//     });
//   }

//   @Get()
//   @ApiOperation({ summary: 'Get all A/B tests' })
//   @ApiResponse({ status: 200, description: 'A/B tests retrieved successfully' })
//   async getTests(@Query('status') status?: string, @Query('modelId') modelId?: string) {
//     return this.abTestService.findAll({ status, modelId });
//   }

//   @Get(':id')
//   @ApiOperation({ summary: 'Get A/B test by ID' })
//   @ApiParam({ name: 'id', description: 'A/B test ID' })
//   @ApiResponse({ status: 200, description: 'A/B test retrieved successfully' })
//   async getTest(@Param('id') id: string) {
//     return this.abTestService.findById(id);
//   }

//   @Put(':id/start')
//   @UseGuards(RolesGuard)
//   @Roles(Role.ADMIN, Role.TEACHER)
//   @ApiOperation({ summary: 'Start A/B test' })
//   @ApiParam({ name: 'id', description: 'A/B test ID' })
//   @ApiResponse({ status: 200, description: 'A/B test started successfully' })
//   async startTest(@Param('id') id: string) {
//     return this.abTestService.startTest(id);
//   }

//   @Put(':id/stop')
//   @UseGuards(RolesGuard)
//   @Roles(Role.ADMIN, Role.TEACHER)
//   @ApiOperation({ summary: 'Stop A/B test' })
//   @ApiParam({ name: 'id', description: 'A/B test ID' })
//   @ApiResponse({ status: 200, description: 'A/B test stopped successfully' })
//   async stopTest(@Param('id') id: string) {
//     return this.abTestService.stopTest(id);
//   }

//   @Post(':id/results')
//   @ApiOperation({ summary: 'Record A/B test result' })
//   @ApiParam({ name: 'id', description: 'A/B test ID' })
//   @ApiResponse({ status: 201, description: 'Result recorded successfully' })
//   async recordResult(@Param('id') id: string, @Body() resultDto: ABTestResultDto) {
//     return this.abTestService.recordResult({
//       ...resultDto,
//       testId: id,
//     });
//   }

//   @Get(':id/analysis')
//   @ApiOperation({ summary: 'Get A/B test statistical analysis' })
//   @ApiParam({ name: 'id', description: 'A/B test ID' })
//   @ApiResponse({ status: 200, description: 'Analysis retrieved successfully' })
//   async getAnalysis(@Param('id') id: string) {
//     return this.abTestService.getStatisticalAnalysis(id);
//   }

//   @Delete(':id')
//   @UseGuards(RolesGuard)
//   @Roles(Role.ADMIN)
//   @ApiOperation({ summary: 'Delete A/B test' })
//   @ApiParam({ name: 'id', description: 'A/B test ID' })
//   @ApiResponse({ status: 204, description: 'A/B test deleted successfully' })
//   @HttpCode(HttpStatus.NO_CONTENT)
//   async deleteTest(@Param('id') id: string) {
//     return this.abTestService.delete(id);
//   }
// }
