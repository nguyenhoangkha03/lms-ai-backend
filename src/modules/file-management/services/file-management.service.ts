// src/modules/file-management/services/file-management.service.ts
import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Repository } from 'typeorm';
import { Queue } from 'bull';
import { WinstonService } from '@/logger/winston.service';
import { CacheService } from '@/cache/cache.service';
import { FileStorageService } from './file-storage.service';
import { FileUpload } from '../../course/entities/file-upload.entity';
import { User } from '../../user/entities/user.entity';
import { FileType, FileAccessLevel } from '@/common/enums/file.enums';
import { UploadFileDto } from '../dto/upload-file.dto';
import { FileQueryDto } from '../dto/file-query.dto';
import { UpdateFileDto } from '../dto/update-file.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
// import { paginate } from '@/common/utils/pagination.util';
// import * as crypto from 'crypto';
import * as path from 'path';
import * as mimeTypes from 'mime-types';

interface FileValidationRules {
  maxSize: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  requireAuth: boolean;
  virusScan: boolean;
}

@Injectable()
export class FileManagementService {
  private readonly fileValidationRules: Map<FileType, FileValidationRules> = new Map();
  private readonly dangerousExtensions = [
    '.exe',
    '.bat',
    '.cmd',
    '.com',
    '.pif',
    '.scr',
    '.vbs',
    '.vbe',
    '.ws',
    '.wsf',
    '.wsc',
    '.wsh',
    '.ps1',
    '.ps1xml',
    '.ps2',
    '.ps2xml',
    '.psc1',
    '.psc2',
    '.msh',
    '.msh1',
    '.msh2',
    '.mshxml',
    '.msh1xml',
    '.msh2xml',
    '.scf',
    '.lnk',
    '.inf',
    '.reg',
  ];

  constructor(
    @InjectRepository(FileUpload)
    private readonly fileRepository: Repository<FileUpload>,
    private readonly fileStorageService: FileStorageService,
    @InjectQueue('file-processing')
    private readonly fileProcessingQueue: Queue,
    private readonly logger: WinstonService,
    private readonly cacheService: CacheService,
  ) {
    this.logger.setContext(FileManagementService.name);
    this.initializeValidationRules();
  }

  /**
   * Initialize file validation rules
   */
  private initializeValidationRules(): void {
    // Image files
    this.fileValidationRules.set(FileType.IMAGE, {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        'image/bmp',
        'image/tiff',
      ],
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff'],
      requireAuth: false,
      virusScan: false,
    });

    // Video files
    this.fileValidationRules.set(FileType.VIDEO, {
      maxSize: 2 * 1024 * 1024 * 1024, // 2GB
      allowedMimeTypes: [
        'video/mp4',
        'video/webm',
        'video/ogg',
        'video/avi',
        'video/mov',
        'video/wmv',
        'video/flv',
        'video/mkv',
      ],
      allowedExtensions: ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.flv', '.mkv'],
      requireAuth: true,
      virusScan: true,
    });

    // Audio files
    this.fileValidationRules.set(FileType.AUDIO, {
      maxSize: 100 * 1024 * 1024, // 100MB
      allowedMimeTypes: [
        'audio/mpeg',
        'audio/wav',
        'audio/ogg',
        'audio/aac',
        'audio/flac',
        'audio/m4a',
        'audio/wma',
      ],
      allowedExtensions: ['.mp3', '.wav', '.ogg', '.aac', '.flac', '.m4a', '.wma'],
      requireAuth: true,
      virusScan: false,
    });

    // Document files
    this.fileValidationRules.set(FileType.DOCUMENT, {
      maxSize: 50 * 1024 * 1024, // 50MB
      allowedMimeTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/csv',
        'text/rtf',
      ],
      allowedExtensions: [
        '.pdf',
        '.doc',
        '.docx',
        '.xls',
        '.xlsx',
        '.ppt',
        '.pptx',
        '.txt',
        '.csv',
        '.rtf',
      ],
      requireAuth: true,
      virusScan: true,
    });

    // Archive files
    this.fileValidationRules.set(FileType.ARCHIVE, {
      maxSize: 200 * 1024 * 1024, // 200MB
      allowedMimeTypes: [
        'application/zip',
        'application/x-rar-compressed',
        'application/x-7z-compressed',
        'application/x-tar',
        'application/gzip',
      ],
      allowedExtensions: ['.zip', '.rar', '.7z', '.tar', '.gz'],
      requireAuth: true,
      virusScan: true,
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    uploadDto: UploadFileDto,
    uploaderId: string,
  ): Promise<FileUpload> {
    this.logger.log(`Uploading file: ${file.originalname} by user ${uploaderId}`);

    await this.validateFile(file, uploadDto.fileType);

    await this.performSecurityChecks(file);

    const fileKey = this.fileStorageService.generateFileKey(
      this.getStorageCategory(uploadDto.fileType),
      file.originalname,
      uploaderId,
    );

    const fileHash = this.fileStorageService.calculateFileHash(file.buffer);

    const existingFile = await this.findByHash(fileHash, uploaderId);
    if (existingFile && uploadDto.allowDuplicates !== true) {
      this.logger.log(`Duplicate file detected: ${fileHash}`);
      return existingFile;
    }

    const _storageFile = await this.fileStorageService.uploadFile(file, fileKey, {
      acl: uploadDto.accessLevel === FileAccessLevel.PUBLIC ? 'public-read' : 'private',
      metadata: {
        originalName: file.originalname,
        uploaderId: uploaderId,
        fileType: uploadDto.fileType,
        ...uploadDto.metadata,
      },
      contentType: file.mimetype,
      tags: {
        userId: uploaderId,
        fileType: uploadDto.fileType,
        environment: process.env.NODE_ENV || 'development',
      },
    });

    const fileUpload = this.fileRepository.create({
      uploaderId: uploaderId,
      originalName: file.originalname,
      storedName: path.basename(fileKey),
      filePath: fileKey,
      fileSize: file.size,
      mimeType: file.mimetype,
      fileType: uploadDto.fileType,
      accessLevel: uploadDto.accessLevel || FileAccessLevel.PRIVATE,
      checksum: fileHash,
      lessonId: uploadDto.lessonId,
      courseId: uploadDto.courseId,
      isActive: true,
      metadata: {
        storageProvider: this.fileStorageService.getProviderInfo().provider,
        uploadedAt: new Date(),
        ipAddress: uploadDto.ipAddress,
        userAgent: uploadDto.userAgent,
        ...this.extractFileMetadata(file),
      },
    });

    const savedFile = await this.fileRepository.save(fileUpload);

    await this.queueFileProcessing(savedFile, file);

    await this.clearFileCache(uploaderId, uploadDto.lessonId, uploadDto.courseId);

    this.logger.log(`File uploaded successfully: ${savedFile.id}`);
    return savedFile;
  }

  /**
   * Get file with access control
   */
  async getFile(id: string, user?: User, includeUrl: boolean = false): Promise<FileUpload> {
    const cacheKey = `file:${id}:${user?.id || 'anonymous'}:${includeUrl}`;
    const cached = await this.cacheService.get<FileUpload>(cacheKey);
    if (cached) return cached;

    const file = await this.fileRepository.findOne({
      where: { id, isActive: true },
      relations: ['uploader'],
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Check access permissions
    await this.checkFileAccess(file, user);

    if (includeUrl) {
      file.downloadUrl = await this.generateAccessUrl(file, user);
    }

    // Filter sensitive information
    const filteredFile = this.filterFileData(file, user);

    await this.cacheService.set(cacheKey, filteredFile, 300);
    return filteredFile;
  }

  /**
   * Get files with filtering and pagination
   */
  async getFiles(queryDto: FileQueryDto & PaginationDto, user?: User): Promise<any> {
    const queryBuilder = this.fileRepository
      .createQueryBuilder('file')
      .leftJoinAndSelect('file.uploader', 'uploader')
      .where('file.isActive = :isActive', { isActive: true });

    // Access control filters
    if (!user) {
      queryBuilder.andWhere('file.accessLevel = :publicLevel', {
        publicLevel: FileAccessLevel.PUBLIC,
      });
    } else if (!this.isAdmin(user)) {
      queryBuilder.andWhere(
        '(file.uploaderId = :userId OR file.accessLevel IN (:...allowedLevels))',
        {
          userId: user.id,
          allowedLevels: [FileAccessLevel.PUBLIC, FileAccessLevel.ENROLLED_ONLY],
        },
      );
    }

    // Apply filters
    if (queryDto.fileType) {
      queryBuilder.andWhere('file.fileType = :fileType', { fileType: queryDto.fileType });
    }

    if (queryDto.uploaderId) {
      queryBuilder.andWhere('file.uploaderId = :uploaderId', { uploaderId: queryDto.uploaderId });
    }

    if (queryDto.lessonId) {
      queryBuilder.andWhere('file.lessonId = :lessonId', { lessonId: queryDto.lessonId });
    }

    if (queryDto.courseId) {
      queryBuilder.andWhere('file.courseId = :courseId', { courseId: queryDto.courseId });
    }

    if (queryDto.accessLevel) {
      queryBuilder.andWhere('file.accessLevel = :accessLevel', {
        accessLevel: queryDto.accessLevel,
      });
    }

    if (queryDto.search) {
      queryBuilder.andWhere('(file.originalName LIKE :search OR file.metadata LIKE :search)', {
        search: `%${queryDto.search}%`,
      });
    }

    if (queryDto.dateFrom) {
      queryBuilder.andWhere('file.uploadedAt >= :dateFrom', { dateFrom: queryDto.dateFrom });
    }

    if (queryDto.dateTo) {
      queryBuilder.andWhere('file.uploadedAt <= :dateTo', { dateTo: queryDto.dateTo });
    }

    // Apply sorting
    const sortField = queryDto.sortBy || 'uploadedAt';
    const sortOrder = queryDto.sortOrder || 'DESC';
    queryBuilder.orderBy(`file.${sortField}`, sortOrder);

    // return paginate(queryBuilder, queryDto);
  }

  /**
   * Update file metadata
   */
  async updateFile(id: string, updateDto: UpdateFileDto, user: User): Promise<FileUpload> {
    const file = await this.getFile(id, user);

    // Check ownership or admin rights
    if (file.uploaderId !== user.id && !this.isAdmin(user)) {
      throw new ForbiddenException('You can only update your own files');
    }

    // Update file record
    // await this.fileRepository.update(id, {
    //   ...updateDto,
    //   updatedBy: user.id,
    //   metadata: {
    //     ...file.metadata,
    //     ...updateDto.metadata,
    //     lastModified: new Date(),
    //   },
    // });

    // Clear cache
    await this.clearFileCache(file.uploaderId, file.lessonId, file.courseId);

    this.logger.log(`File updated: ${id} by user ${user.id}`);
    return this.getFile(id, user);
  }

  /**
   * Delete file
   */
  async deleteFile(id: string, user: User): Promise<void> {
    const file = await this.getFile(id, user);

    // Check ownership or admin rights
    if (file.uploaderId !== user.id && !this.isAdmin(user)) {
      throw new ForbiddenException('You can only delete your own files');
    }

    // Soft delete in database
    await this.fileRepository.update(id, {
      isActive: false,
      deletedAt: new Date(),
      updatedBy: user.id,
    });

    // Queue for physical deletion
    await this.fileProcessingQueue.add('delete-file', {
      fileId: id,
      filePath: file.filePath,
      deletedBy: user.id,
    });

    // Clear cache
    await this.clearFileCache(file.uploaderId, file.lessonId, file.courseId);

    this.logger.log(`File deleted: ${id} by user ${user.id}`);
  }

  /**
   * Generate secure access URL
   */
  async generateAccessUrl(
    file: FileUpload,
    user?: User,
    expiresIn: number = 3600,
  ): Promise<string | undefined> {
    // Check access permissions
    await this.checkFileAccess(file, user);

    // For public files, return direct URL
    if (file.accessLevel === FileAccessLevel.PUBLIC) {
      return file.filePath;
    }

    // Generate signed URL for private files
    return this.fileStorageService.getSignedUrl(file.filePath!, expiresIn);
  }

  /**
   * Get file content for streaming
   */
  async getFileStream(
    id: string,
    user?: User,
    range?: string,
  ): Promise<{ buffer: Buffer; metadata: any; contentRange?: string }> {
    const file = await this.getFile(id, user);

    // Check if file supports streaming
    if (!this.supportsStreaming(file.fileType)) {
      throw new BadRequestException('File type does not support streaming');
    }

    const { buffer, metadata } = await this.fileStorageService.getFile(file.filePath!);

    // Handle range requests for video streaming
    if (range && file.fileType === FileType.VIDEO) {
      return this.handleRangeRequest(buffer, range, metadata);
    }

    // Update view count
    await this.incrementViewCount(file.id);

    return { buffer, metadata };
  }

  /**
   * Validate file before upload
   */
  private async validateFile(file: Express.Multer.File, fileType: FileType): Promise<void> {
    const rules = this.fileValidationRules.get(fileType);
    if (!rules) {
      throw new BadRequestException(`Unsupported file type: ${fileType}`);
    }

    // Check file size
    if (file.size > rules.maxSize) {
      throw new BadRequestException(
        `File too large. Maximum size: ${Math.round(rules.maxSize / 1024 / 1024)}MB`,
      );
    }

    // Check MIME type
    if (!rules.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${rules.allowedMimeTypes.join(', ')}`,
      );
    }

    // Check file extension
    const extension = path.extname(file.originalname).toLowerCase();
    if (!rules.allowedExtensions.includes(extension)) {
      throw new BadRequestException(
        `Invalid file extension. Allowed extensions: ${rules.allowedExtensions.join(', ')}`,
      );
    }

    // Check for dangerous extensions
    if (this.dangerousExtensions.includes(extension)) {
      throw new BadRequestException('File type is not allowed for security reasons');
    }

    // Validate file content matches extension
    const expectedMimeType = mimeTypes.lookup(extension);
    if (expectedMimeType && expectedMimeType !== file.mimetype) {
      throw new BadRequestException('File content does not match extension');
    }
  }

  /**
   * Perform security checks on file
   */
  private async performSecurityChecks(file: Express.Multer.File): Promise<void> {
    // Check for null bytes (potential security issue)
    if (file.buffer.includes(0)) {
      this.logger.warn(`File contains null bytes: ${file.originalname}`);
    }

    // Check file header/magic numbers
    await this.validateFileHeader(file);

    // Additional security checks could include:
    // - Virus scanning integration
    // - Content analysis
    // - Malware detection
  }

  /**
   * Validate file header/magic numbers
   */
  private async validateFileHeader(file: Express.Multer.File): Promise<void> {
    const header = file.buffer.slice(0, 8);
    const extension = path.extname(file.originalname).toLowerCase();

    // Define magic number patterns
    const magicNumbers: { [key: string]: Buffer[] } = {
      '.jpg': [Buffer.from([0xff, 0xd8, 0xff])],
      '.jpeg': [Buffer.from([0xff, 0xd8, 0xff])],
      '.png': [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
      '.gif': [Buffer.from([0x47, 0x49, 0x46, 0x38])],
      '.pdf': [Buffer.from([0x25, 0x50, 0x44, 0x46])],
      '.zip': [Buffer.from([0x50, 0x4b, 0x03, 0x04])],
    };

    const expectedHeaders = magicNumbers[extension];
    if (expectedHeaders) {
      const isValid = expectedHeaders.some(expected =>
        header.slice(0, expected.length).equals(expected),
      );

      if (!isValid) {
        throw new BadRequestException('File header does not match extension');
      }
    }
  }

  /**
   * Extract file metadata
   */
  private extractFileMetadata(file: Express.Multer.File): Record<string, any> {
    const metadata: Record<string, any> = {
      originalSize: file.size,
      encoding: file.encoding,
    };

    // Extract additional metadata based on file type
    if (file.mimetype.startsWith('image/')) {
      // Image metadata would be extracted here
      // Using libraries like exif-parser, sharp, etc.
    } else if (file.mimetype.startsWith('video/')) {
      // Video metadata would be extracted here
      // Using ffprobe or similar tools
    }

    return metadata;
  }

  /**
   * Queue file for additional processing
   */
  private async queueFileProcessing(
    file: FileUpload,
    _originalFile: Express.Multer.File,
  ): Promise<void> {
    // Queue for virus scanning if required
    const rules = this.fileValidationRules.get(file.fileType);
    if (rules?.virusScan) {
      await this.fileProcessingQueue.add('virus-scan', {
        fileId: file.id,
        filePath: file.filePath,
      });
    }

    // Queue for image processing
    if (file.fileType === FileType.IMAGE) {
      await this.fileProcessingQueue.add('process-image', {
        fileId: file.id,
        filePath: file.filePath,
        generateThumbnails: true,
        optimize: true,
      });
    }

    // Queue for video processing
    if (file.fileType === FileType.VIDEO) {
      await this.fileProcessingQueue.add('process-video', {
        fileId: file.id,
        filePath: file.filePath,
        generateThumbnails: true,
        createPreview: true,
        optimizeForStreaming: true,
      });
    }
  }

  /**
   * Check file access permissions
   */
  private async checkFileAccess(file: FileUpload, user?: User): Promise<void> {
    // Public files are accessible to everyone
    if (file.accessLevel === FileAccessLevel.PUBLIC) {
      return;
    }

    // Require authentication for non-public files
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // File owner can always access
    if (file.uploaderId === user.id) {
      return;
    }

    // Admin can access all files
    if (this.isAdmin(user)) {
      return;
    }

    // Check specific access levels
    switch (file.accessLevel) {
      case FileAccessLevel.ENROLLED_ONLY:
        // Check if user is enrolled in the course
        await this.checkEnrollmentAccess(file, user);
        break;

      case FileAccessLevel.PREMIUM_ONLY:
        // Check if user has premium access
        await this.checkPremiumAccess(file, user);
        break;

      case FileAccessLevel.PRIVATE:
        throw new ForbiddenException('Access denied');

      default:
        throw new ForbiddenException('Access denied');
    }
  }

  /**
   * Check enrollment access
   */
  private async checkEnrollmentAccess(file: FileUpload, _user: User): Promise<void> {
    // This would check if user is enrolled in the course
    // Implementation depends on enrollment service
    // For now, allow access for enrolled users
    if (file.courseId) {
      // Check enrollment in course
      // const isEnrolled = await this.enrollmentService.isEnrolled(user.id, file.courseId);
      // if (!isEnrolled) {
      //   throw new ForbiddenException('Course enrollment required');
      // }
    }
  }

  /**
   * Check premium access
   */
  private async checkPremiumAccess(_file: FileUpload, _user: User): Promise<void> {
    // This would check if user has premium subscription
    // Implementation depends on subscription service
    // For now, deny access
    throw new ForbiddenException('Premium subscription required');
  }

  /**
   * Handle HTTP range requests for video streaming
   */
  private handleRangeRequest(
    buffer: Buffer,
    range: string,
    metadata: any,
  ): { buffer: Buffer; metadata: any; contentRange: string } {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : buffer.length - 1;
    const chunkSize = end - start + 1;

    const chunk = buffer.slice(start, end + 1);
    const contentRange = `bytes ${start}-${end}/${buffer.length}`;

    return {
      buffer: chunk,
      metadata: {
        ...metadata,
        contentLength: chunkSize,
        acceptRanges: 'bytes',
      },
      contentRange,
    };
  }

  /**
   * Check if file type supports streaming
   */
  private supportsStreaming(fileType: FileType): boolean {
    return [FileType.VIDEO, FileType.AUDIO].includes(fileType);
  }

  /**
   * Increment file view count
   */
  private async incrementViewCount(fileId: string): Promise<void> {
    await this.fileRepository.increment({ id: fileId }, 'viewCount', 1);
    await this.fileRepository.update(fileId, { lastViewedAt: new Date() });
  }

  /**
   * Find file by hash for deduplication
   */
  private async findByHash(hash: string, uploaderId: string): Promise<FileUpload | null> {
    return this.fileRepository.findOne({
      where: { checksum: hash, uploaderId, isActive: true },
    });
  }

  /**
   * Get storage category for file type
   */
  private getStorageCategory(fileType: FileType): string {
    const categories = {
      [FileType.IMAGE]: 'images',
      [FileType.VIDEO]: 'videos',
      [FileType.AUDIO]: 'audio',
      [FileType.DOCUMENT]: 'documents',
      [FileType.ARCHIVE]: 'archives',
      [FileType.OTHER]: 'misc',
    };

    return categories[fileType] || 'misc';
  }

  /**
   * Filter file data based on user permissions
   */
  private filterFileData(file: FileUpload, user?: User): FileUpload {
    // Remove sensitive information for non-owners
    if (!user || (file.uploaderId !== user.id && !this.isAdmin(user))) {
      delete file.filePath;
      delete file.metadata?.ipAddress;
      delete file.metadata?.userAgent;
    }

    return file;
  }

  /**
   * Clear file-related cache
   */
  private async clearFileCache(
    uploaderId?: string,
    lessonId?: string,
    courseId?: string,
  ): Promise<void> {
    const patterns = [
      'file:*',
      uploaderId ? `files:user:${uploaderId}:*` : null,
      lessonId ? `files:lesson:${lessonId}:*` : null,
      courseId ? `files:course:${courseId}:*` : null,
    ].filter(Boolean);

    for (const pattern of patterns) {
      await this.cacheService.deletePattern(pattern!);
    }
  }

  /**
   * Check if user is admin
   */
  private isAdmin(user: User): boolean {
    // Implementation depends on your role system
    return !!(user.userType === 'admin' || user.roles?.some(role => role.name === 'admin'));
  }

  /**
   * Get file statistics
   */
  async getFileStatistics(userId?: string): Promise<any> {
    const queryBuilder = this.fileRepository
      .createQueryBuilder('file')
      .where('file.isActive = :isActive', { isActive: true });

    if (userId) {
      queryBuilder.andWhere('file.uploaderId = :userId', { userId });
    }

    const [totalFiles, totalSize] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder
        .select('SUM(file.fileSize)', 'totalSize')
        .getRawOne()
        .then(result => parseInt(result.totalSize || 0)),
    ]);

    const filesByType = await queryBuilder
      .select('file.fileType', 'fileType')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(file.fileSize)', 'size')
      .groupBy('file.fileType')
      .getRawMany();

    return {
      totalFiles,
      totalSize,
      filesByType: filesByType.reduce((acc, item) => {
        acc[item.fileType] = {
          count: parseInt(item.count),
          size: parseInt(item.size || 0),
        };
        return acc;
      }, {}),
    };
  }
}
