import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { WinstonService } from '@/logger/winston.service';
import * as path from 'path';

@Injectable()
export class FileValidationPipe implements PipeTransform {
  constructor(private readonly logger: WinstonService) {
    this.logger.setContext(FileValidationPipe.name);
  }

  transform(file: Express.Multer.File): Express.Multer.File {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file name
    this.validateFileName(file.originalname);

    // Validate file size
    this.validateFileSize(file);

    // Additional security checks
    this.performSecurityChecks(file);

    return file;
  }

  private validateFileName(fileName: string): void {
    // Check for null bytes
    if (fileName.includes('\0')) {
      throw new BadRequestException('Invalid file name');
    }

    // Check for path traversal attempts
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      throw new BadRequestException('Invalid file name');
    }

    // Check file name length
    if (fileName.length > 255) {
      throw new BadRequestException('File name too long');
    }

    // Check for valid extension
    const extension = path.extname(fileName).toLowerCase();
    if (!extension || extension.length > 10) {
      throw new BadRequestException('Invalid or missing file extension');
    }
  }

  private validateFileSize(file: Express.Multer.File): void {
    if (file.size === 0) {
      throw new BadRequestException('Empty file not allowed');
    }

    // Additional size validation based on file type
    const maxSizes = {
      'image/': 10 * 1024 * 1024, // 10MB for images
      'video/': 2 * 1024 * 1024 * 1024, // 2GB for videos
      'audio/': 100 * 1024 * 1024, // 100MB for audio
      'application/pdf': 50 * 1024 * 1024, // 50MB for PDFs
    };

    for (const [mimePrefix, maxSize] of Object.entries(maxSizes)) {
      if (file.mimetype.startsWith(mimePrefix) && file.size > maxSize) {
        throw new BadRequestException(
          `File too large for ${mimePrefix} type. Maximum: ${Math.round(maxSize / 1024 / 1024)}MB`,
        );
      }
    }
  }

  private performSecurityChecks(file: Express.Multer.File): void {
    // Check for suspicious file content
    if (file.buffer.length > 0) {
      // Check for script tags in file content
      const content = file.buffer.toString('utf8', 0, Math.min(1024, file.buffer.length));
      const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /vbscript:/i,
        /data:text\/html/i,
        /<?php/i,
        /<%/i,
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(content)) {
          this.logger.warn(`Suspicious content detected in file: ${file.originalname}`);
          throw new BadRequestException('File contains potentially malicious content');
        }
      }
    }
  }
}
