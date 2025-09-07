import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Response,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { DocumentUploadService, DocumentType } from './services/document-upload.service';
import { WinstonService } from '@/logger/winston.service';

@ApiTags('Document Upload')
@Controller('upload')
export class UploadController {
  constructor(
    private readonly documentUploadService: DocumentUploadService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(UploadController.name);
  }

  @Post('teacher/document')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload teacher application document' })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or validation error' })
  async uploadTeacherDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body('documentType') documentType: DocumentType,
    @Body('userId') userId: string,
    @Body('metadata') metadata?: string,
    @Body() body?: any,
  ) {
    this.logger.log(`Document upload request - userId: ${userId}, documentType: ${documentType}, file: ${file?.originalname}`);
    this.logger.log(`Request body:`, body);
    
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    const parsedMetadata = metadata ? JSON.parse(metadata) : {};

    const document = await this.documentUploadService.uploadTeacherDocument(userId, {
      documentType,
      file,
      metadata: parsedMetadata,
    });

    return {
      success: true,
      message: 'Document uploaded successfully',
      document: {
        id: document.id,
        originalName: document.originalName,
        documentType: document.documentType,
        size: document.size,
        uploadedAt: document.uploadedAt,
      },
    };
  }

  @Get('teacher/documents')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get teacher documents' })
  @ApiResponse({ status: 200, description: 'Documents retrieved successfully' })
  async getTeacherDocuments(@CurrentUser('id') userId: string) {
    const documents = await this.documentUploadService.getTeacherDocuments(userId);

    return {
      success: true,
      message: 'Documents retrieved successfully',
      documents: documents.map(doc => ({
        id: doc.id,
        originalName: doc.originalName,
        documentType: doc.documentType,
        size: doc.size,
        uploadedAt: doc.uploadedAt,
        isVerified: doc.isVerified,
        verifiedAt: doc.verifiedAt,
      })),
    };
  }

  @Get('teacher/document/:documentId/download')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Download teacher document' })
  @ApiResponse({ status: 200, description: 'Document downloaded successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async downloadTeacherDocument(
    @CurrentUser('id') userId: string,
    @Param('documentId') documentId: string,
    @Response() res: any,
  ) {
    const { buffer, fileName, mimeType } = await this.documentUploadService.downloadDocument(
      documentId,
      userId,
    );

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': buffer.length,
    });

    res.send(buffer);
  }

  @Delete('teacher/document/:documentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete teacher document' })
  @ApiResponse({ status: 200, description: 'Document deleted successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async deleteTeacherDocument(
    @CurrentUser('id') userId: string,
    @Param('documentId') documentId: string,
  ) {
    await this.documentUploadService.deleteDocument(documentId, userId);

    return {
      success: true,
      message: 'Document deleted successfully',
    };
  }

  // Admin endpoints for document verification
  @Post('admin/document/:documentId/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Verify teacher document (Admin only)' })
  @ApiResponse({ status: 200, description: 'Document verified successfully' })
  async verifyDocument(
    @CurrentUser('id') adminId: string,
    @Param('documentId') documentId: string,
    @Body('isApproved') isApproved: boolean,
    @Body('notes') notes?: string,
  ) {
    await this.documentUploadService.verifyDocument(documentId, adminId, isApproved, notes);

    return {
      success: true,
      message: `Document ${isApproved ? 'approved' : 'rejected'} successfully`,
    };
  }

  @Get('admin/documents/pending')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get pending documents for review (Admin only)' })
  @ApiResponse({ status: 200, description: 'Pending documents retrieved successfully' })
  async getPendingDocuments(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    // This would typically query a documents table
    // For now, return a placeholder response
    return {
      success: true,
      message: 'Pending documents retrieved successfully',
      documents: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
      },
    };
  }
}