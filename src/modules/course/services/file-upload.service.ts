import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WinstonService } from '@/logger/winston.service';
import { CacheService } from '@/cache/cache.service';
import { FileUpload } from '../entities/file-upload.entity';
import { Lesson } from '../entities/lesson.entity';
import { Course } from '../entities/course.entity';
import { User } from '../../user/entities/user.entity';
import { FileType, FileAccessLevel } from '@/common/enums/file.enums';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';
import * as ffmpeg from 'fluent-ffmpeg';
import * as sharp from 'sharp';

@Injectable()
export class FileUploadService {
  private readonly uploadPath = process.env.UPLOAD_PATH || './uploads';
  private readonly maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '104857600'); // 100MB
  private readonly maxVideoSize = parseInt(process.env.MAX_VIDEO_SIZE || '2147483648'); // 2GB
  private readonly allowedFileTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/ogg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
  ];

  constructor(
    @InjectRepository(FileUpload)
    private readonly fileRepository: Repository<FileUpload>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    private readonly logger: WinstonService,
    private readonly cacheService: CacheService,
  ) {
    this.logger.setContext(FileUploadService.name);
    this.ensureUploadDirectories();
  }

  /**
   * Upload multiple files for a lesson
   */
  async uploadLessonFiles(
    lessonId: string,
    files: Express.Multer.File[],
    uploaderId: string,
  ): Promise<FileUpload[]> {
    this.logger.log(`Uploading ${files.length} files for lesson ${lessonId}`);

    // Verify lesson exists and user has permission
    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId },
      relations: ['course'],
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    if (lesson.course.teacherId !== uploaderId && !this.isAdmin(uploaderId)) {
      throw new ForbiddenException('You can only upload files to your own lessons');
    }

    const uploadedFiles: FileUpload[] = [];

    for (const file of files) {
      try {
        const uploadedFile = await this.processAndSaveFile(
          file,
          lessonId,
          uploaderId,
          FileType.DOCUMENT,
        );
        uploadedFiles.push(uploadedFile);
      } catch (error) {
        this.logger.error(`Failed to upload file ${file.originalname}:`, error.message);
        // Continue with other files, but log the error
      }
    }

    this.logger.log(`Successfully uploaded ${uploadedFiles.length}/${files.length} files`);
    return uploadedFiles;
  }

  /**
   * Upload video file for a lesson
   */
  async uploadLessonVideo(
    lessonId: string,
    videoFile: Express.Multer.File,
    uploaderId: string,
  ): Promise<FileUpload> {
    this.logger.log(`Uploading video for lesson ${lessonId}`);

    // Verify lesson exists and user has permission
    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId },
      relations: ['course'],
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    if (lesson.course.teacherId !== uploaderId && !this.isAdmin(uploaderId)) {
      throw new ForbiddenException('You can only upload videos to your own lessons');
    }

    // Validate video file
    if (!videoFile.mimetype.startsWith('video/')) {
      throw new BadRequestException('Only video files are allowed');
    }

    if (videoFile.size > this.maxVideoSize) {
      throw new BadRequestException(
        `Video file too large. Maximum size: ${this.maxVideoSize / 1024 / 1024}MB`,
      );
    }

    // Process and save video
    const uploadedVideo = await this.processAndSaveFile(
      videoFile,
      lessonId,
      uploaderId,
      FileType.VIDEO,
    );

    // Update lesson with video information
    await this.lessonRepository.update(lessonId, {
      videoUrl: uploadedVideo.filePath,
      videoDuration: uploadedVideo.duration || 0,
    });

    // Process video asynchronously for optimization
    this.processVideoAsync(uploadedVideo.id, uploadedVideo.filePath!);

    this.logger.log(`Video uploaded successfully for lesson ${lessonId}`);
    return uploadedVideo;
  }

  //   async getLessonFiles(lessonId: string, user?: User): Promise<FileUpload[]> {
  //     const cacheKey = `lesson:${lessonId}:files:${user?.id || 'public'}`;
  //     const cached = await this.cacheService.get<FileUpload[]>(cacheKey);
  //     if (cached) return cached;

  //     const lesson = await this.lessonRepository.findOne({
  //       where: { id: lessonId },
  //       relations: ['course'],
  //     });

  //     if (!lesson) {
  //       throw new NotFoundException('Lesson not found');
  //     }

  //     const queryBuilder = this.fileRepository
  //       .createQueryBuilder('file')
  //       .where('file.lessonId = :lessonId', { lessonId })
  //       .andWhere('file.isActive = :isActive', { isActive: true });

  //     // Apply access control
  //     if (!user) {
  //       // Public access - only public files
  //       queryBuilder.andWhere('file.accessLevel = :accessLevel', {
  //         accessLevel: FileAccessLevel.PUBLIC,
  //       });
  //     } else if (lesson.course.teacherId === user.id || this.isAdmin(user.id)) {
  //       // Owner/Admin - all files
  //       // No additional filter needed
  //     } else {
  //       // Student - check enrollment and file access level
  //       queryBuilder.andWhere(
  //         '(file.accessLevel = :publicAccess OR file.accessLevel = :enrolledAccess)',
  //         {
  //           publicAccess: FileAccessLevel.PUBLIC,
  //           enrolledAccess: FileAccessLevel.ENROLLED_ONLY,
  //         },
  //       );
  //     }

  //     const files = await queryBuilder.orderBy('file.uploadedAt', 'DESC').getMany();

  //     // Generate secure URLs for files
  //     const filesWithUrls = await Promise.all(
  //       files.map(async file => ({
  //         ...file,
  //         downloadUrl: await this.generateSecureDownloadUrl(file, user),
  //         streamUrl:
  //           file.fileType === FileType.VIDEO ? await this.generateStreamUrl(file, user) : null,
  //       })),
  //     );

  //     await this.cacheService.set(cacheKey, filesWithUrls, 300); // Cache 5 minutes
  //     return filesWithUrls;
  //   }

  /**
   * Get video stream URL for a lesson
   */
  async getVideoStreamUrl(
    lessonId: string,
    user?: User,
  ): Promise<{ streamUrl: string; duration?: number }> {
    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId },
      relations: ['course'],
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    // Check access permissions
    await this.checkVideoAccess(lesson, user);

    // Find video file
    const videoFile = await this.fileRepository.findOne({
      where: {
        lessonId,
        fileType: FileType.VIDEO,
        isActive: true,
      },
    });

    if (!videoFile) {
      throw new NotFoundException('Video not found for this lesson');
    }

    const streamUrl = await this.generateStreamUrl(videoFile, user);

    return {
      streamUrl,
      duration: videoFile.duration,
    };
  }

  /**
   * Delete a file
   */
  async deleteFile(fileId: string, userId: string): Promise<void> {
    const file = await this.fileRepository.findOne({
      where: { id: fileId },
      relations: ['lesson', 'lesson.course'],
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Check ownership
    if (file?.lesson?.course.teacherId !== userId && !this.isAdmin(userId)) {
      throw new ForbiddenException('You can only delete files from your own lessons');
    }

    // Soft delete
    await this.fileRepository.update(fileId, {
      isActive: false,
      deletedAt: new Date(),
    });

    // Delete physical file asynchronously
    this.deletePhysicalFileAsync(file.filePath!);

    // Clear cache
    await this.clearFileCache(file.lessonId!);

    this.logger.log(`File deleted: ${fileId}`);
  }

  async getLessonFiles(_lessonId: string, _user: User) {}

  // === PRIVATE METHODS === //

  private async processAndSaveFile(
    file: Express.Multer.File,
    lessonId: string,
    uploaderId: string,
    fileType: FileType,
  ): Promise<FileUpload> {
    // Validate file
    this.validateFile(file);

    // Generate file info
    const fileExtension = path.extname(file.originalname);
    const fileName = `${crypto.randomUUID()}${fileExtension}`;
    const relativePath = path.join(fileType === FileType.VIDEO ? 'videos' : 'documents', fileName);
    const fullPath = path.join(this.uploadPath, relativePath);

    // Ensure directory exists
    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    // Save file to disk
    await fs.writeFile(fullPath, file.buffer);

    // Get file metadata
    const metadata = await this.extractFileMetadata(fullPath, file.mimetype);

    // Create database record
    const fileUpload = this.fileRepository.create({
      originalName: file.originalname,
      storedName: fileName,
      filePath: relativePath,
      fileSize: file.size,
      mimeType: file.mimetype,
      fileType,
      lessonId,
      uploaderId,
      accessLevel: FileAccessLevel.ENROLLED_ONLY, // Default access level
      isActive: true,
      ...metadata,
    });

    const savedFile = await this.fileRepository.save(fileUpload);

    // Process file for optimization if needed
    if (fileType === FileType.IMAGE) {
      this.optimizeImageAsync(savedFile.id, fullPath);
    }

    return savedFile;
  }

  private validateFile(file: Express.Multer.File): void {
    if (!this.allowedFileTypes.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} is not allowed`);
    }

    const maxSize = file.mimetype.startsWith('video/') ? this.maxVideoSize : this.maxFileSize;
    if (file.size > maxSize) {
      throw new BadRequestException(`File too large. Maximum size: ${maxSize / 1024 / 1024}MB`);
    }
  }

  private async extractFileMetadata(
    filePath: string,
    mimeType: string,
  ): Promise<Partial<FileUpload>> {
    const metadata: Partial<FileUpload> = {};

    try {
      if (mimeType.startsWith('video/')) {
        const videoInfo = await this.getVideoInfo(filePath);
        metadata.duration = videoInfo.duration;
        metadata.resolution = videoInfo.resolution;
        metadata.bitrate = videoInfo.bitrate;
      } else if (mimeType.startsWith('image/')) {
        const imageInfo = await this.getImageInfo(filePath);
        metadata.resolution = imageInfo.resolution;
      }
    } catch (error) {
      this.logger.warn(`Failed to extract metadata for ${filePath}:`, error.message);
    }

    return metadata;
  }

  private async getVideoInfo(filePath: string): Promise<{
    duration: number;
    resolution: string;
    bitrate: number;
  }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        if (!videoStream) {
          reject(new Error('No video stream found'));
          return;
        }

        resolve({
          duration: Math.floor(metadata.format.duration || 0),
          resolution: `${videoStream.width}x${videoStream.height}`,
          bitrate: parseInt((metadata.format.bit_rate ?? 0).toString()),
        });
      });
    });
  }

  private async getImageInfo(filePath: string): Promise<{ resolution: string }> {
    const metadata = await sharp(filePath).metadata();
    return {
      resolution: `${metadata.width}x${metadata.height}`,
    };
  }

  private async generateSecureDownloadUrl(file: FileUpload, user?: User): Promise<string> {
    // Generate temporary signed URL for file download
    const token = this.generateFileToken(file.id, user?.id);
    return `/api/v1/files/${file.id}/download?token=${token}`;
  }

  private async generateStreamUrl(file: FileUpload, user?: User): Promise<string> {
    // Generate streaming URL for video files
    const token = this.generateFileToken(file.id, user?.id);
    return `/api/v1/files/${file.id}/stream?token=${token}`;
  }

  private generateFileToken(fileId: string, userId?: string): string {
    const payload = {
      fileId,
      userId: userId || 'anonymous',
      exp: Date.now() + 60 * 60 * 1000, // 1 hour expiry
    };

    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  private async checkVideoAccess(lesson: Lesson, user?: User): Promise<void> {
    // Public preview lessons
    if (lesson.isPreview && lesson.status === 'published') {
      return;
    }

    // Require authentication for non-preview content
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Teachers can access their own content
    if (lesson.course.teacherId === user.id) {
      return;
    }

    // Admins can access all content
    if (this.isAdmin(user.id)) {
      return;
    }

    // Students need enrollment (implement with enrollment service)
    if (lesson.status !== 'published') {
      throw new ForbiddenException('Content not available');
    }
  }

  private async ensureUploadDirectories(): Promise<void> {
    const directories = [
      path.join(this.uploadPath, 'videos'),
      path.join(this.uploadPath, 'documents'),
      path.join(this.uploadPath, 'images'),
      path.join(this.uploadPath, 'temp'),
    ];

    for (const dir of directories) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  private async processVideoAsync(fileId: string, filePath: string): Promise<void> {
    try {
      this.logger.log(`Starting video processing for file ${fileId}`);

      // Generate multiple quality versions
      const qualities = [
        { name: '720p', height: 720, bitrate: '2000k' },
        { name: '480p', height: 480, bitrate: '1000k' },
        { name: '360p', height: 360, bitrate: '500k' },
      ];

      const processedFiles: string[] = [];

      for (const quality of qualities) {
        const outputPath = filePath.replace('.', `_${quality.name}.`);

        await new Promise<void>((resolve, reject) => {
          ffmpeg(path.join(this.uploadPath, filePath))
            .videoCodec('libx264')
            .audioCodec('aac')
            .size(`?x${quality.height}`)
            .videoBitrate(quality.bitrate)
            .format('mp4')
            .output(path.join(this.uploadPath, outputPath))
            .on('end', () => {
              processedFiles.push(outputPath);
              resolve();
            })
            .on('error', reject)
            .run();
        });
      }

      // Update file record with processed versions
      //   await this.fileRepository.update(fileId, {
      //     processedVersions: processedFiles,
      //     processingStatus: 'completed',
      //   });

      this.logger.log(`Video processing completed for file ${fileId}`);
    } catch (error) {
      this.logger.error(`Video processing failed for file ${fileId}:`, error.message);

      //   await this.fileRepository.update(fileId, {
      //     processingStatus: 'failed',
      //     processingError: error.message,
      //   });
    }
  }

  private async optimizeImageAsync(fileId: string, filePath: string): Promise<void> {
    try {
      this.logger.log(`Starting image optimization for file ${fileId}`);

      const optimizedPath = filePath.replace(/(\.[^.]+)$/, '_optimized$1');

      await sharp(filePath)
        .resize(1920, 1080, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toFile(optimizedPath);

      // Generate thumbnail
      const thumbnailPath = filePath.replace(/(\.[^.]+)$/, '_thumb$1');
      await sharp(filePath)
        .resize(300, 200, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);

      // Update file record
      //   await this.fileRepository.update(fileId, {
      //     optimizedPath: optimizedPath.replace(this.uploadPath, ''),
      //     thumbnailPath: thumbnailPath.replace(this.uploadPath, ''),
      //     processingStatus: 'completed',
      //   });

      this.logger.log(`Image optimization completed for file ${fileId}`);
    } catch (error) {
      this.logger.error(`Image optimization failed for file ${fileId}:`, error.message);
    }
  }

  private async deletePhysicalFileAsync(filePath: string): Promise<void> {
    try {
      const fullPath = path.join(this.uploadPath, filePath);
      await fs.unlink(fullPath);

      // Delete processed versions if they exist
      const file = await this.fileRepository.findOne({
        where: { filePath },
      });

      if (file?.processedVersions) {
        for (const version of file.processedVersions) {
          try {
            await fs.unlink(path.join(this.uploadPath, version));
          } catch (error) {
            // Ignore errors for individual file deletions
          }
        }
      }

      this.logger.log(`Physical file deleted: ${filePath}`);
    } catch (error) {
      this.logger.error(`Failed to delete physical file ${filePath}:`, error.message);
    }
  }

  private async clearFileCache(lessonId: string): Promise<void> {
    const _patterns = [`lesson:${lessonId}:files:*`, `file:*:${lessonId}`];

    // for (const pattern of patterns) {
    //   await this.cacheService.deletePattern(pattern);
    // }
  }

  private isAdmin(_userId: string): boolean {
    // Implement based on your role system
    return false;
  }
}
