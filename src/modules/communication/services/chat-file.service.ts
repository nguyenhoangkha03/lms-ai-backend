import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatFile } from '../entities/chat-file.entity';
import { FileManagementService } from '../../file-management/services/file-management.service';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as sharp from 'sharp';
import { FileType, FileRelatedType } from '@/common/enums/course.enums';
import { UploadFileDto } from '@/modules/file-management/dto/upload-file.dto';
import { FileAccessLevel } from '@/common/enums/file.enums';
import { User } from '@/modules/user/entities/user.entity';

@Injectable()
export class ChatFileService {
  private readonly allowedTypes: Set<string>;
  private readonly maxFileSize: number;

  constructor(
    @InjectRepository(ChatFile)
    private readonly fileRepository: Repository<ChatFile>,
    private readonly fileManagementService: FileManagementService,
    private readonly configService: ConfigService,
  ) {
    this.allowedTypes = new Set(
      this.configService
        .get('CHAT_ALLOWED_FILE_TYPES', 'jpg,jpeg,png,gif,pdf,doc,docx,mp4')
        .split(','),
    );
    this.maxFileSize = parseInt(this.configService.get('CHAT_FILE_UPLOAD_MAX_SIZE', '52428800'));
  }

  async processFileUpload(
    file: Express.Multer.File,
    roomId: string,
    userId: string,
  ): Promise<ChatFile | null> {
    this.validateFile(file);

    const category = this.determineFileCategory(file.mimetype);

    const chatFile = this.fileRepository.create({
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      fileExtension: path.extname(file.originalname).toLowerCase(),
      fileCategory: category,
      uploadedBy: userId,
      status: 'uploading',
    });

    const savedFile = await this.fileRepository.save(chatFile);

    try {
      const uploaded = await this.fileManagementService.uploadFile(
        file,
        {
          fileType: category === 'image' ? FileType.IMAGE : FileType.DOCUMENT,
          relatedType: FileRelatedType.CHAT_ATTACHMENT,
          relatedId: roomId,
          accessLevel: FileAccessLevel.PRIVATE,
          metadata: { roomId },
        },
        savedFile.id,
      );

      let thumbnailUrl: string | undefined;
      if (category === 'image') {
        thumbnailUrl = await this.generateImageThumbnail(file, savedFile.id, userId);
      }

      const metadata = await this.extractFileMetadata(file, category);

      await this.fileRepository.update(savedFile.id, {
        filePath: uploaded.filePath,
        thumbnailUrl,
        metadata,
        status: 'ready',
      });

      return this.fileRepository.findOne({ where: { id: savedFile.id } });
    } catch (error) {
      await this.fileRepository.update(savedFile.id, {
        status: 'failed',
        errorMessage: error.message,
      });
      throw error;
    }
  }

  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`,
      );
    }

    const extension = path.extname(file.originalname).toLowerCase().substring(1);
    if (!this.allowedTypes.has(extension)) {
      throw new BadRequestException(
        `File type .${extension} is not allowed. Allowed types: ${Array.from(this.allowedTypes).join(', ')}`,
      );
    }
  }

  private determineFileCategory(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) {
      return 'document';
    }
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive')) {
      return 'archive';
    }
    return 'other';
  }

  private async generateImageThumbnail(
    file: Express.Multer.File,
    fileId: string,
    uploaderId: string,
  ): Promise<string | undefined> {
    try {
      const thumbnailBuffer = await sharp(file.buffer)
        .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      const thumbnailFile = {
        ...file,
        buffer: thumbnailBuffer,
        originalname: `thumb_${file.originalname}`,
        mimetype: 'image/jpeg',
        size: thumbnailBuffer.length,
      };

      const uploadDto: UploadFileDto = {
        fileType: FileType.IMAGE,
        relatedType: FileRelatedType.CHAT_ATTACHMENT,
        relatedId: fileId,
        accessLevel: FileAccessLevel.PRIVATE,
        description: 'Thumbnail for chat image',
        metadata: {
          isThumbnail: true,
          originalFileId: fileId,
        },
      };

      const uploaded = await this.fileManagementService.uploadFile(
        thumbnailFile,
        uploadDto,
        uploaderId,
      );

      return uploaded.filePath;
    } catch (error) {
      // Thumbnail generation failed, but file upload should continue
      return undefined;
    }
  }

  private async extractFileMetadata(file: Express.Multer.File, category: string): Promise<any> {
    const metadata: any = {};

    try {
      if (category === 'image') {
        const imageInfo = await sharp(file.buffer).metadata();
        metadata.width = imageInfo.width;
        metadata.height = imageInfo.height;
        metadata.format = imageInfo.format;
        metadata.density = imageInfo.density;
      }

      // Add more metadata extraction for other file types as needed
    } catch (error) {
      // Metadata extraction failed, continue without metadata
    }

    return metadata;
  }

  async getFileById(fileId: string): Promise<ChatFile> {
    const file = await this.fileRepository.findOne({
      where: { id: fileId },
      relations: ['uploader'],
    });

    if (!file) {
      throw new BadRequestException('File not found');
    }

    return file;
  }

  async deleteFile(fileId: string, user: User): Promise<void> {
    const file = await this.getFileById(fileId);

    if (file.uploadedBy !== user.id) {
      throw new BadRequestException('Cannot delete file uploaded by another user');
    }

    // Delete from storage
    await this.fileManagementService.deleteFile(file.filePath, user);

    if (file.thumbnailUrl) {
      await this.fileManagementService.deleteFile(file.thumbnailUrl, user);
    }

    // Soft delete from database
    await this.fileRepository.softDelete(fileId);
  }

  async incrementDownloadCount(fileId: string): Promise<void> {
    await this.fileRepository.increment({ id: fileId }, 'downloadCount', 1);
  }

  async getFilesByMessage(messageId: string): Promise<ChatFile[]> {
    return this.fileRepository.find({
      where: { messageId },
      relations: ['uploader'],
      order: { createdAt: 'ASC' },
    });
  }

  async getRoomFiles(
    roomId: string,
    category?: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ files: ChatFile[]; total: number }> {
    const queryBuilder = this.fileRepository
      .createQueryBuilder('file')
      .leftJoinAndSelect('file.uploader', 'uploader')
      .leftJoinAndSelect('file.message', 'message')
      .where('message.roomId = :roomId', { roomId })
      .andWhere('file.deletedAt IS NULL')
      .orderBy('file.createdAt', 'DESC')
      .limit(limit)
      .offset(offset);

    if (category) {
      queryBuilder.andWhere('file.fileCategory = :category', { category });
    }

    const [files, total] = await queryBuilder.getManyAndCount();

    return { files, total };
  }
}
