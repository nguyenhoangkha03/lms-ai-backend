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
//   UploadedFile,
//   UseInterceptors,
// } from '@nestjs/common';
// import { FileInterceptor } from '@nestjs/platform-express';
// import {
//   ApiTags,
//   ApiOperation,
//   ApiResponse,
//   ApiParam,
//   ApiConsumes,
//   ApiBearerAuth,
// } from '@nestjs/swagger';
// import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
// import { RolesGuard } from '@/modules/auth/guards/roles.guard';
// import { Roles } from '@/modules/auth/decorators/roles.decorator';
// import { Role } from '@/common/enums/role.enum';
// import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
// import { UserPayload } from '@/modules/auth/interfaces/user-payload.interface';
// import { ModelRegistryService } from '../services/model-registry.service';

// @ApiTags('Model Registry')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
// @Controller('ai/registry')
// export class ModelRegistryController {
//   constructor(private readonly registryService: ModelRegistryService) {}

//   @Post('upload')
//   @UseGuards(RolesGuard)
//   @Roles(Role.ADMIN, Role.TEACHER)
//   @UseInterceptors(FileInterceptor('model'))
//   @ApiConsumes('multipart/form-data')
//   @ApiOperation({ summary: 'Upload model artifact' })
//   @ApiResponse({ status: 201, description: 'Model uploaded successfully' })
//   async uploadModel(
//     @CurrentUser() user: UserPayload,
//     @UploadedFile() file: Express.Multer.File,
//     @Body()
//     uploadDto: {
//       modelId: string;
//       version: string;
//       description?: string;
//       metadata?: string;
//     },
//   ) {
//     const metadata = uploadDto.metadata ? JSON.parse(uploadDto.metadata) : {};

//     return this.registryService.uploadModelArtifact(uploadDto.modelId, uploadDto.version, file, {
//       description: uploadDto.description,
//       uploadedBy: user.sub,
//       metadata,
//     });
//   }

//   @Get('artifacts/:modelId')
//   @ApiOperation({ summary: 'Get model artifacts' })
//   @ApiParam({ name: 'modelId', description: 'Model ID' })
//   @ApiResponse({ status: 200, description: 'Artifacts retrieved successfully' })
//   async getArtifacts(@Param('modelId') modelId: string) {
//     return this.registryService.getModelArtifacts(modelId);
//   }

//   @Get('artifacts/:modelId/:version/download')
//   @ApiOperation({ summary: 'Download model artifact' })
//   @ApiParam({ name: 'modelId', description: 'Model ID' })
//   @ApiParam({ name: 'version', description: 'Model version' })
//   @ApiResponse({ status: 200, description: 'Artifact download initiated' })
//   async downloadArtifact(@Param('modelId') modelId: string, @Param('version') version: string) {
//     return this.registryService.downloadModelArtifact(modelId, version);
//   }

//   @Delete('artifacts/:modelId/:version')
//   @UseGuards(RolesGuard)
//   @Roles(Role.ADMIN)
//   @ApiOperation({ summary: 'Delete model artifact' })
//   @ApiParam({ name: 'modelId', description: 'Model ID' })
//   @ApiParam({ name: 'version', description: 'Model version' })
//   @ApiResponse({ status: 200, description: 'Artifact deleted successfully' })
//   async deleteArtifact(@Param('modelId') modelId: string, @Param('version') version: string) {
//     return this.registryService.deleteModelArtifact(modelId, version);
//   }

//   @Get('lineage/:modelId')
//   @ApiOperation({ summary: 'Get model lineage and provenance' })
//   @ApiParam({ name: 'modelId', description: 'Model ID' })
//   @ApiResponse({ status: 200, description: 'Lineage retrieved successfully' })
//   async getModelLineage(@Param('modelId') modelId: string) {
//     return this.registryService.getModelLineage(modelId);
//   }

//   @Post('validate/:modelId/:version')
//   @ApiOperation({ summary: 'Validate model artifact' })
//   @ApiParam({ name: 'modelId', description: 'Model ID' })
//   @ApiParam({ name: 'version', description: 'Model version' })
//   @ApiResponse({ status: 200, description: 'Validation completed' })
//   async validateModel(@Param('modelId') modelId: string, @Param('version') version: string) {
//     return this.registryService.validateModelArtifact(modelId, version);
//   }
// }
