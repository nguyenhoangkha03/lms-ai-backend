import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as multer from 'multer';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as sharp from 'sharp';

@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);
  private readonly uploadPath: string;
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB
  private readonly allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

  constructor(private readonly configService: ConfigService) {
    this.uploadPath = this.configService.get('UPLOAD_PATH', './uploads');
    this.ensureUploadDirectory();
  }

  private async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.access(this.uploadPath);
    } catch {
      await fs.mkdir(this.uploadPath, { recursive: true });
    }
  }

  getMulterConfig(): multer.Options {
    return {
      storage: multer.memoryStorage(),
      limits: {
        fileSize: this.maxFileSize,
      },
      fileFilter: (req, file, callback) => {
        if (!this.allowedMimeTypes.includes(file.mimetype)) {
          return callback(null, false);
        }
        callback(null, true);
      },
    };
  }

  async uploadAvatar(userId: string, file: Express.Multer.File): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const fileExtension = path.extname(file.originalname);
    const fileName = `avatar-${userId}-${Date.now()}${fileExtension}`;
    const filePath = path.join(this.uploadPath, 'avatars', fileName);

    // Ensure avatars directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    try {
      // Process image with sharp
      const processedImage = await sharp(file.buffer)
        .resize(300, 300, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 90 })
        .toBuffer();

      await fs.writeFile(filePath, processedImage);

      const fileUrl = `/uploads/avatars/${fileName}`;
      this.logger.log(`Avatar uploaded for user ${userId}: ${fileUrl}`);

      return fileUrl;
    } catch (error) {
      this.logger.error(`Failed to upload avatar for user ${userId}:`, error);
      throw new BadRequestException('Failed to process image file');
    }
  }

  async uploadCoverImage(userId: string, file: Express.Multer.File): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const fileExtension = path.extname(file.originalname);
    const fileName = `cover-${userId}-${Date.now()}${fileExtension}`;
    const filePath = path.join(this.uploadPath, 'covers', fileName);

    // Ensure covers directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    try {
      // Process image with sharp
      const processedImage = await sharp(file.buffer)
        .resize(1200, 400, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      await fs.writeFile(filePath, processedImage);

      const fileUrl = `/uploads/covers/${fileName}`;
      this.logger.log(`Cover image uploaded for user ${userId}: ${fileUrl}`);

      return fileUrl;
    } catch (error) {
      this.logger.error(`Failed to upload cover image for user ${userId}:`, error);
      throw new BadRequestException('Failed to process image file');
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      const fullPath = path.join(this.uploadPath, filePath.replace('/uploads/', ''));
      await fs.unlink(fullPath);
      this.logger.log(`File deleted: ${filePath}`);
    } catch (error) {
      this.logger.warn(`Failed to delete file ${filePath}:`, error);
    }
  }
}
