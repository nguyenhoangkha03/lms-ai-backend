import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WinstonService } from '@/logger/winston.service';
import { AuditLogService } from '@/modules/system/services/audit-log.service';
import { UserService } from '@/modules/user/services/user.service';
import { FileManagementService } from '@/modules/file-management/services/file-management.service';
import { FileUpload } from '@/modules/course/entities/file-upload.entity';
import { AuditAction } from '@/common/enums/system.enums';
import { FileRelatedType } from '@/common/enums/course.enums';
import { FileType, FileAccessLevel, ProcessingStatus } from '@/common/enums/file.enums';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as crypto from 'crypto';

export interface UploadedDocument {
  id: string;
  originalName: string;
  fileName: string;
  fileKey: string;
  fileUrl: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
  uploadedBy: string;
  documentType: DocumentType;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
  metadata?: Record<string, any>;
  checksum?: string;
}

export enum DocumentType {
  RESUME = 'resume',
  DEGREE_CERTIFICATE = 'degree_certificate',
  CERTIFICATION = 'certification',
  IDENTITY_DOCUMENT = 'identity_document',
  TEACHING_PORTFOLIO = 'teaching_portfolio',
  REFERENCE_LETTER = 'reference_letter',
  OTHER = 'other',
}

export interface DocumentUploadDto {
  documentType: DocumentType;
  file: Express.Multer.File;
  metadata?: Record<string, any>;
}

@Injectable()
export class DocumentUploadService {
  private readonly allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: WinstonService,
    private readonly auditLogService: AuditLogService,
    private readonly userService: UserService,
    private readonly fileManagementService: FileManagementService,
    @InjectRepository(FileUpload)
    private readonly fileUploadRepository: Repository<FileUpload>,
  ) {
    this.logger.setContext(DocumentUploadService.name);
  }

  async uploadTeacherDocument(
    userId: string,
    documentUploadDto: DocumentUploadDto,
  ): Promise<UploadedDocument> {
    const { documentType, file, metadata } = documentUploadDto;

    this.logger.log(`Document upload attempt for user: ${userId}, type: ${documentType}`);

    // Validate file
    this.validateFile(file);

    try {
      // Upload file using FileManagementService (similar to admin controller)
      const fileRecord = await this.fileManagementService.uploadFile(
        file,
        {
          fileType: this.getFileTypeFromDocumentType(documentType),
          relatedType: this.getRelatedTypeFromDocumentType(documentType),
          relatedId: userId,
          accessLevel: FileAccessLevel.PRIVATE,
        },
        userId,
      );

      // Create document record for backward compatibility
      const document: UploadedDocument = {
        id: fileRecord.id,
        originalName: file.originalname,
        fileName: fileRecord.originalName,
        fileKey: fileRecord.filePath!,
        fileUrl: fileRecord.fileUrl,
        mimeType: file.mimetype,
        size: file.size,
        uploadedAt: fileRecord.uploadedAt,
        uploadedBy: userId,
        documentType,
        isVerified: false,
        checksum: fileRecord.checksum,
        metadata: {
          ...metadata,
          uploadSource: 'teacher_application',
        },
      };

      // Update teacher profile with document info
      await this.updateTeacherProfileDocuments(userId, documentType, document);

      // Log audit
      await this.auditLogService.createAuditLog({
        userId,
        action: AuditAction.UPLOAD,
        entityType: 'teacher_document',
        entityId: document.id,
        metadata: {
          documentType,
          fileName: document.fileName,
          originalName: document.originalName,
          size: document.size,
          mimeType: document.mimeType,
        },
      });

      this.logger.log(`Document uploaded successfully: ${document.id} for user: ${userId}`);
      return document;
    } catch (error) {
      this.logger.error(`Document upload failed for user ${userId}: ${error.message}`);

      // File cleanup is handled by FileStorageService
      throw new InternalServerErrorException('Failed to upload document');
    }
  }

  async getTeacherDocuments(userId: string): Promise<UploadedDocument[]> {
    try {
      const fileUploads = await this.fileUploadRepository.find({
        where: {
          uploaderId: userId,
          relatedType: In([
            FileRelatedType.TEACHER_RESUME,
            FileRelatedType.TEACHER_DEGREE,
            FileRelatedType.TEACHER_CERTIFICATION,
            FileRelatedType.TEACHER_ID_DOCUMENT,
            FileRelatedType.TEACHER_PORTFOLIO,
          ]),
          isActive: true,
        },
        order: { uploadedAt: 'DESC' },
      });

      return fileUploads.map(upload => ({
        id: upload.id,
        originalName: upload.originalName,
        fileName: upload.storedName,
        fileKey: upload.filePath!,
        fileUrl: upload.fileUrl,
        mimeType: upload.mimeType,
        size: upload.fileSize,
        uploadedAt: upload.uploadedAt,
        uploadedBy: upload.uploaderId,
        documentType: upload.metadata?.originalDocumentType || DocumentType.OTHER,
        isVerified: upload.metadata?.isVerified || false,
        verifiedBy: upload.metadata?.verifiedBy,
        verifiedAt: upload.metadata?.verifiedAt ? new Date(upload.metadata.verifiedAt) : undefined,
        checksum: upload.checksum,
        metadata: upload.metadata,
      }));
    } catch (error) {
      this.logger.error(`Failed to get documents for user ${userId}: ${error.message}`);
      return [];
    }
  }

  async verifyDocument(
    documentId: string,
    verifiedBy: string,
    isApproved: boolean,
    notes?: string,
  ): Promise<void> {
    this.logger.log(`Document verification attempt: ${documentId} by ${verifiedBy}`);

    // This would typically update a documents table
    // For now, we'll update the teacher profile

    await this.auditLogService.createAuditLog({
      userId: verifiedBy,
      action: isApproved ? AuditAction.APPROVE : AuditAction.REJECT,
      entityType: 'teacher_document',
      entityId: documentId,
      metadata: {
        isApproved,
        notes,
        verifiedAt: new Date(),
      },
    });

    this.logger.log(`Document ${isApproved ? 'approved' : 'rejected'}: ${documentId}`);
  }

  async deleteDocument(documentId: string, userId: string): Promise<void> {
    this.logger.log(`Document deletion attempt: ${documentId} by ${userId}`);

    const fileUpload = await this.fileUploadRepository.findOne({
      where: {
        id: documentId,
        uploaderId: userId,
        isActive: true,
      },
    });

    if (!fileUpload) {
      throw new NotFoundException('Document not found');
    }

    try {
      // Mark as inactive instead of hard delete
      await this.fileUploadRepository.update(documentId, {
        isActive: false,
        deletedAt: new Date(),
      });

      // Log audit
      await this.auditLogService.createAuditLog({
        userId,
        action: AuditAction.DELETE,
        entityType: 'teacher_document',
        entityId: documentId,
        metadata: {
          fileName: fileUpload.storedName,
          documentType: fileUpload.metadata?.originalDocumentType,
          fileKey: fileUpload.filePath,
        },
      });

      this.logger.log(`Document deleted successfully: ${documentId}`);
    } catch (error) {
      this.logger.error(`Failed to delete document ${documentId}: ${error.message}`);
      throw new InternalServerErrorException('Failed to delete document');
    }
  }

  async downloadDocument(
    documentId: string,
    userId: string,
  ): Promise<{
    buffer: Buffer;
    fileName: string;
    mimeType: string;
  }> {
    const fileUpload = await this.fileUploadRepository.findOne({
      where: {
        id: documentId,
        uploaderId: userId,
        isActive: true,
      },
    });

    if (!fileUpload) {
      throw new NotFoundException('Document not found');
    }

    try {
      const fileData = await this.fileManagementService.getFileStream(fileUpload.id);

      // Update download count
      await this.fileUploadRepository.update(documentId, {
        downloadCount: fileUpload.downloadCount + 1,
        lastDownloadedAt: new Date(),
      });

      // Log audit
      await this.auditLogService.createAuditLog({
        userId,
        action: AuditAction.DOWNLOAD,
        entityType: 'teacher_document',
        entityId: documentId,
        metadata: {
          fileName: fileUpload.storedName,
          documentType: fileUpload.metadata?.originalDocumentType,
          fileKey: fileUpload.filePath,
        },
      });

      return {
        buffer: fileData.buffer,
        fileName: fileUpload.originalName,
        mimeType: fileUpload.mimeType,
      };
    } catch (error) {
      this.logger.error(`Failed to download document ${documentId}: ${error.message}`);
      throw new InternalServerErrorException('Failed to download document');
    }
  }

  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type not allowed. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
      );
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File too large. Maximum size: ${this.maxFileSize / 1024 / 1024}MB`,
      );
    }

    // Check for potential security issues
    if (this.containsMaliciousContent(file)) {
      throw new BadRequestException('File contains potentially malicious content');
    }
  }

  private containsMaliciousContent(file: Express.Multer.File): boolean {
    const fileName = file.originalname.toLowerCase();

    // Check for suspicious file extensions
    const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.vbs', '.js'];
    if (suspiciousExtensions.some(ext => fileName.includes(ext))) {
      return true;
    }

    // Check for null bytes in filename
    if (fileName.includes('\0')) {
      return true;
    }

    // Additional checks could be added here (virus scanning, etc.)
    return false;
  }

  // generateFileName method removed - using FileStorageService.generateFileKey instead

  private generateDocumentId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  // calculateChecksum method removed - using FileStorageService.calculateFileHash instead

  // ensureUploadDirectory method removed - handled by FileStorageService

  private getFileTypeFromDocumentType(documentType: DocumentType): FileType {
    switch (documentType) {
      case DocumentType.RESUME:
      case DocumentType.DEGREE_CERTIFICATE:
      case DocumentType.CERTIFICATION:
      case DocumentType.TEACHING_PORTFOLIO:
      case DocumentType.REFERENCE_LETTER:
      case DocumentType.IDENTITY_DOCUMENT: // Allow both images and documents for ID verification
        return FileType.DOCUMENT;
      default:
        return FileType.OTHER;
    }
  }

  private getRelatedTypeFromDocumentType(documentType: DocumentType): FileRelatedType {
    switch (documentType) {
      case DocumentType.RESUME:
        return FileRelatedType.TEACHER_RESUME;
      case DocumentType.DEGREE_CERTIFICATE:
        return FileRelatedType.TEACHER_DEGREE;
      case DocumentType.CERTIFICATION:
        return FileRelatedType.TEACHER_CERTIFICATION;
      case DocumentType.IDENTITY_DOCUMENT:
        return FileRelatedType.TEACHER_ID_DOCUMENT;
      case DocumentType.TEACHING_PORTFOLIO:
        return FileRelatedType.TEACHER_PORTFOLIO;
      default:
        return FileRelatedType.TEACHER_PORTFOLIO; // fallback
    }
  }

  private async updateTeacherProfileDocuments(
    userId: string,
    documentType: DocumentType,
    document: UploadedDocument,
  ): Promise<void> {
    try {
      const teacherProfile = await this.userService.getTeacherProfile(userId);

      if (!teacherProfile) {
        throw new NotFoundException('Teacher profile not found');
      }

      const applicationData = teacherProfile.applicationData || {};
      const documents = applicationData.documents || [];

      // Ensure documents is an array
      const documentsArray = Array.isArray(documents) ? documents : [];

      // Remove existing document of same type
      const filteredDocs = documentsArray.filter(doc => doc.documentType !== documentType);

      // Add new document
      filteredDocs.push(document);

      // Update profile
      await this.userService.updateTeacherProfile(userId, {
        applicationData: {
          ...applicationData,
          documents: filteredDocs,
        },
      });

      this.logger.log(`Updated teacher profile documents for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to update teacher profile documents: ${error.message}`);
      throw error;
    }
  }

  // removeDocumentFromProfile method removed - using FileUpload entity instead
}
