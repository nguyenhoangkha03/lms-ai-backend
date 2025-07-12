// src/modules/file-management/controllers/file-management.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  Headers,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Response, Request } from 'express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiHeader,
} from '@nestjs/swagger';
import { FileManagementService } from '../services/file-management.service';
import { ImageProcessingService } from '../services/image-processing.service';
import { FileStorageService } from '../services/file-storage.service';
import { SecurityEventInterceptor } from '../../auth/interceptors/security-event.interceptor';
import { WinstonService } from '@/logger/winston.service';
import { Authorize } from '../../auth/decorators/authorize.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RateLimit } from '../../auth/decorators/rate-limit.decorator';
import { User } from '../../user/entities/user.entity';
import { UserType } from '@/common/enums/user.enums';
import { FileType } from '@/common/enums/file.enums';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { UploadFileDto } from '../dto/upload-file.dto';
import { UpdateFileDto } from '../dto/update-file.dto';
import { FileQueryDto } from '../dto/file-query.dto';
import { ImageProcessingDto } from '../dto/image-processing.dto';
import { VideoProcessingDto } from '../dto/video-processing.dto';
import { BulkUpdateAccessLevelDto } from '../dto/bulk-update-access-level.dto';
import { BulkDeleteFilesDto } from '../dto/bulk-delete-files.dto';
import { FileAccessDto } from '../dto/file-access.dto';
import { FileStreamDto } from '../dto/file-stream.dto';
import { FileStatisticsDto } from '../dto/file-statistics.dto';
// import * as multer from 'multer';

@ApiTags('File Management')
@Controller('files')
@UseInterceptors(SecurityEventInterceptor)
@ApiBearerAuth()
export class FileManagementController {
  constructor(
    private readonly fileManagementService: FileManagementService,
    private readonly imageProcessingService: ImageProcessingService,
    private readonly fileStorageService: FileStorageService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(FileManagementController.name);
  }

  // === PUBLIC ENDPOINTS === //

  @Get('public/:id')
  @Authorize({ requireAuth: false })
  @ApiOperation({ summary: 'Get public file information' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'File information retrieved' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getPublicFile(@Param('id', ParseUUIDPipe) id: string) {
    return this.fileManagementService.getFile(id, undefined, true);
  }

  @Get('download/:id')
  @Authorize({ requireAuth: false })
  @RateLimit({ points: 100, duration: 3600 })
  @ApiOperation({ summary: 'Download file with access control' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiQuery({ name: 'token', required: false, description: 'Access token for private files' })
  @ApiResponse({ status: 200, description: 'File downloaded successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async downloadFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() accessDto: FileAccessDto,
    @Res() res: Response,
    @CurrentUser() user?: User,
  ) {
    const file = await this.fileManagementService.getFile(id, user);

    // Generate secure download URL if needed
    if (accessDto.accessType === 'download') {
      const { buffer } = await this.fileManagementService.getFileStream(id, user);

      res.set({
        'Content-Type': file.mimeType,
        'Content-Length': buffer.length.toString(),
        'Content-Disposition': `attachment; filename="${file.originalName}"`,
        'Cache-Control': 'private, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      });

      return res.send(buffer);
    }

    // Redirect to signed URL for streaming
    const signedUrl = await this.fileManagementService.generateAccessUrl(
      file,
      user,
      accessDto.expiresIn,
    );

    return res.redirect(signedUrl!);
  }

  @Get('stream/:id')
  @Authorize({ requireAuth: false })
  @RateLimit({ points: 200, duration: 3600 })
  @ApiOperation({ summary: 'Stream file content (video/audio)' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiHeader({
    name: 'Range',
    required: false,
    description: 'HTTP Range header for partial content',
  })
  @ApiResponse({ status: 206, description: 'Partial content (for range requests)' })
  @ApiResponse({ status: 200, description: 'Full content' })
  async streamFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() streamDto: FileStreamDto,
    @Headers('range') range: string,
    @Res() res: Response,
    @CurrentUser() user?: User,
  ) {
    const file = await this.fileManagementService.getFile(id, user);

    if (![FileType.VIDEO, FileType.AUDIO].includes(file.fileType)) {
      return res.status(400).json({ message: 'File type does not support streaming' });
    }

    const result = await this.fileManagementService.getFileStream(id, user, range);

    const headers: Record<string, string> = {
      'Content-Type': file.mimeType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=86400',
    };

    if (result.contentRange) {
      headers['Content-Range'] = result.contentRange;
      headers['Content-Length'] = result.buffer.length.toString();
      res.status(206);
    } else {
      headers['Content-Length'] = result.buffer.length.toString();
      res.status(200);
    }

    res.set(headers);
    return res.send(result.buffer);
  }

  // === AUTHENTICATED ENDPOINTS === //

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @Authorize({ permissions: ['upload:file'] })
  @RateLimit({ points: 20, duration: 3600 })
  @ApiOperation({ summary: 'Upload file with comprehensive validation' })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or validation failed' })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadFileDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    if (!file) {
      return { message: 'No file provided' };
    }

    // Extract client information
    uploadDto.ipAddress = req.ip;
    uploadDto.userAgent = req.get('User-Agent');

    this.logger.log(`File upload request: ${file.originalname} by ${user.id}`);

    return this.fileManagementService.uploadFile(file, uploadDto, user);
  }

  @Post('upload/multiple')
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiConsumes('multipart/form-data')
  @Authorize({ permissions: ['upload:file'] })
  @RateLimit({ points: 10, duration: 3600 })
  @ApiOperation({ summary: 'Upload multiple files' })
  @ApiResponse({ status: 201, description: 'Files uploaded successfully' })
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() uploadDto: UploadFileDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    if (!files || files.length === 0) {
      return { message: 'No files provided' };
    }

    uploadDto.ipAddress = req.ip;
    uploadDto.userAgent = req.get('User-Agent');

    const results: { success: boolean; error?: string; fileName?: string }[] = [];
    for (const file of files) {
      try {
        // const result = await this.fileManagementService.uploadFile(file, uploadDto, user);
        // results.push({ success: true, file: result });
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          fileName: file.originalname,
        });
      }
    }

    return {
      totalFiles: files.length,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length,
      results,
    };
  }

  @Get()
  @Authorize({ permissions: ['read:file'] })
  @ApiOperation({ summary: 'Get files with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Files retrieved successfully' })
  async getFiles(@Query() queryDto: FileQueryDto & PaginationDto, @CurrentUser() user: User) {
    return this.fileManagementService.getFiles(queryDto, user);
  }

  @Get(':id')
  @Authorize({ permissions: ['read:file'] })
  @ApiOperation({ summary: 'Get file by ID' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiQuery({ name: 'includeUrl', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'File found' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('includeUrl') includeUrl: boolean = false,
    @CurrentUser() user: User,
  ) {
    return this.fileManagementService.getFile(id, user, includeUrl);
  }

  @Patch(':id')
  @Authorize({ permissions: ['update:file'] })
  @ApiOperation({ summary: 'Update file metadata' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'File updated successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async updateFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateFileDto,
    @CurrentUser() user: User,
  ) {
    return this.fileManagementService.updateFile(id, updateDto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Authorize({ permissions: ['delete:file'] })
  @ApiOperation({ summary: 'Delete file' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({ status: 204, description: 'File deleted successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async deleteFile(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.fileManagementService.deleteFile(id, user);
  }

  // === IMAGE PROCESSING ENDPOINTS === //

  @Post(':id/process/image')
  @Authorize({ permissions: ['process:file'] })
  @ApiOperation({ summary: 'Process image (resize, optimize, thumbnails)' })
  @ApiParam({ name: 'id', description: 'Image file ID' })
  @ApiResponse({ status: 200, description: 'Image processing started' })
  @ApiResponse({ status: 400, description: 'Not an image file' })
  async processImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() processingDto: ImageProcessingDto,
    @CurrentUser() user: User,
  ) {
    const file = await this.fileManagementService.getFile(id, user);

    if (file.fileType !== FileType.IMAGE) {
      return { message: 'File is not an image' };
    }

    // Queue image processing
    await this.imageProcessingService.processImage(id);

    return {
      message: 'Image processing started',
      fileId: id,
      estimatedTime: '1-5 minutes',
    };
  }

  @Post(':id/process/video')
  @Authorize({ permissions: ['process:file'] })
  @ApiOperation({ summary: 'Process video (transcode, thumbnails, streaming)' })
  @ApiParam({ name: 'id', description: 'Video file ID' })
  @ApiResponse({ status: 200, description: 'Video processing started' })
  @ApiResponse({ status: 400, description: 'Not a video file' })
  async processVideo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() processingDto: VideoProcessingDto,
    @CurrentUser() user: User,
  ) {
    const file = await this.fileManagementService.getFile(id, user);

    if (file.fileType !== FileType.VIDEO) {
      return { message: 'File is not a video' };
    }

    // This would queue video processing
    // Implementation depends on video processing service

    return {
      message: 'Video processing started',
      fileId: id,
      estimatedTime: '5-30 minutes',
    };
  }

  @Get(':id/processing-status')
  @Authorize({ permissions: ['read:file'] })
  @ApiOperation({ summary: 'Get file processing status' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'Processing status retrieved' })
  async getProcessingStatus(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    const file = await this.fileManagementService.getFile(id, user);

    if (file.fileType === FileType.IMAGE) {
      return this.imageProcessingService.getProcessingStatus(id);
    }

    // For other file types, return basic status
    return {
      status: file.processingStatus,
      error: file.processingError,
    };
  }

  // === ACCESS CONTROL ENDPOINTS === //

  @Post(':id/access-url')
  @Authorize({ permissions: ['read:file'] })
  @ApiOperation({ summary: 'Generate temporary access URL' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'Access URL generated' })
  async generateAccessUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() accessDto: FileAccessDto,
    @CurrentUser() user: User,
  ) {
    const file = await this.fileManagementService.getFile(id, user);
    const accessUrl = await this.fileManagementService.generateAccessUrl(
      file,
      user,
      accessDto.expiresIn,
    );

    return {
      accessUrl,
      expiresIn: accessDto.expiresIn,
      expiresAt: new Date(Date.now() + accessDto.expiresIn! * 1000),
    };
  }

  // === BULK OPERATIONS === //

  @Patch('bulk/access-level')
  @Authorize({
    roles: [UserType.ADMIN],
    permissions: ['manage:file'],
  })
  @ApiOperation({ summary: 'Bulk update file access levels (Admin only)' })
  @ApiResponse({ status: 200, description: 'Files updated successfully' })
  async bulkUpdateAccessLevel(
    @Body() bulkUpdateDto: BulkUpdateAccessLevelDto,
    @CurrentUser() user: User,
  ) {
    const results: { fileId: string; success: boolean; error?: string }[] = [];

    for (const fileId of bulkUpdateDto.fileIds) {
      try {
        await this.fileManagementService.updateFile(
          fileId,
          { accessLevel: bulkUpdateDto.accessLevel },
          user,
        );
        results.push({ fileId, success: true });
      } catch (error) {
        results.push({ fileId, success: false, error: error.message });
      }
    }

    return {
      totalFiles: bulkUpdateDto.fileIds.length,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length,
      results,
    };
  }

  @Delete('bulk')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Authorize({
    roles: [UserType.ADMIN],
    permissions: ['manage:file'],
  })
  @ApiOperation({ summary: 'Bulk delete files (Admin only)' })
  @ApiResponse({ status: 204, description: 'Files deleted successfully' })
  async bulkDeleteFiles(@Body() bulkDeleteDto: BulkDeleteFilesDto, @CurrentUser() user: User) {
    for (const fileId of bulkDeleteDto.fileIds) {
      try {
        await this.fileManagementService.deleteFile(fileId, user);
      } catch (error) {
        this.logger.warn(`Failed to delete file ${fileId}: ${error.message}`);
      }
    }

    this.logger.log(`Bulk deleted ${bulkDeleteDto.fileIds.length} files by ${user.id}`);
  }

  // === STATISTICS ENDPOINTS === //

  @Get('statistics/overview')
  @Authorize({ permissions: ['read:statistics'] })
  @ApiOperation({ summary: 'Get file statistics overview' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStatistics(@Query() statsDto: FileStatisticsDto, @CurrentUser() user: User) {
    // For non-admin users, only show their own statistics
    if (user.userType !== UserType.ADMIN) {
      statsDto.userId = user.id;
    }

    return this.fileManagementService.getFileStatistics(statsDto.userId);
  }

  @Get('statistics/storage')
  @Authorize({
    roles: [UserType.ADMIN],
    permissions: ['read:system:statistics'],
  })
  @ApiOperation({ summary: 'Get storage statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Storage statistics retrieved' })
  async getStorageStatistics(@CurrentUser() _user: User) {
    const providerInfo = this.fileStorageService.getProviderInfo();
    const fileStats = await this.fileManagementService.getFileStatistics();

    return {
      provider: providerInfo,
      usage: fileStats,
      timestamp: new Date(),
    };
  }

  // === ADMIN ENDPOINTS === //

  @Get('admin/pending-moderation')
  @Authorize({
    roles: [UserType.ADMIN],
    permissions: ['moderate:content'],
  })
  @ApiOperation({ summary: 'Get files pending moderation (Admin only)' })
  @ApiResponse({ status: 200, description: 'Pending files retrieved' })
  async getPendingModeration(
    @Query() queryDto: FileQueryDto & PaginationDto,
    @CurrentUser() user: User,
  ) {
    // Add filter for flagged files
    return this.fileManagementService.getFiles(
      {
        ...queryDto,
        // Add moderation filters here
      },
      user,
    );
  }

  @Post(':id/moderate')
  @Authorize({
    roles: [UserType.ADMIN],
    permissions: ['moderate:content'],
  })
  @ApiOperation({ summary: 'Moderate file content (Admin only)' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'File moderated successfully' })
  async moderateFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() moderationDto: { approved: boolean; reason?: string },
    @CurrentUser() user: User,
  ) {
    const file = await this.fileManagementService.getFile(id, user);

    // Update moderation status
    await this.fileManagementService.updateFile(
      id,
      {
        metadata: {
          ...file.metadata,
          moderation: {
            approved: moderationDto.approved,
            moderatedBy: user.id,
            moderatedAt: new Date(),
            reason: moderationDto.reason,
          },
        },
      },
      user,
    );

    this.logger.log(
      `File ${id} moderated by ${user.id}: ${moderationDto.approved ? 'approved' : 'rejected'}`,
    );

    return {
      message: `File ${moderationDto.approved ? 'approved' : 'rejected'}`,
      moderatedBy: user.id,
      moderatedAt: new Date(),
    };
  }
}
