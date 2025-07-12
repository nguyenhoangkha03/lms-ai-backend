import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WinstonService } from '@/logger/winston.service';
import { FileStorageService } from './file-storage.service';
import { FileUpload } from '../../course/entities/file-upload.entity';
import { ProcessingStatus } from '@/common/enums/file.enums';
import * as sharp from 'sharp';
import * as path from 'path';

export interface ImageResizeOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  position?: string;
  background?: string;
  withoutEnlargement?: boolean;
}

export interface ThumbnailConfig {
  name: string;
  width: number;
  height: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

@Injectable()
export class ImageProcessingService {
  private readonly thumbnailConfigs: ThumbnailConfig[] = [
    { name: 'thumb_small', width: 150, height: 150, quality: 80, format: 'jpeg' },
    { name: 'thumb_medium', width: 300, height: 300, quality: 85, format: 'jpeg' },
    { name: 'thumb_large', width: 600, height: 600, quality: 85, format: 'jpeg' },
  ];

  private readonly responsiveConfigs: ThumbnailConfig[] = [
    { name: 'mobile', width: 480, height: 320, quality: 80, format: 'webp' },
    { name: 'tablet', width: 768, height: 512, quality: 85, format: 'webp' },
    { name: 'desktop', width: 1200, height: 800, quality: 90, format: 'webp' },
    { name: 'hd', width: 1920, height: 1280, quality: 85, format: 'webp' },
  ];

  constructor(
    @InjectRepository(FileUpload)
    private readonly fileRepository: Repository<FileUpload>,
    private readonly fileStorageService: FileStorageService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(ImageProcessingService.name);
  }

  /**
   * Process image with thumbnails and optimization
   */
  async processImage(fileId: string): Promise<void> {
    this.logger.log(`Starting image processing for file ${fileId}`);

    try {
      const file = await this.fileRepository.findOne({
        where: { id: fileId },
      });

      if (!file) {
        throw new BadRequestException('File not found');
      }

      // Update processing status
      await this.fileRepository.update(fileId, {
        processingStatus: ProcessingStatus.PROCESSING,
        processingStartedAt: new Date(),
      });

      if (!file.filePath) {
        throw new BadRequestException('File path not found');
      }

      // Get original image from storage
      const { buffer } = await this.fileStorageService.getFile(file.filePath);

      // Extract image metadata
      const _metadata = await this.extractImageMetadata(buffer);

      // Generate thumbnails
      const _thumbnails = await this.generateThumbnails(buffer, file.filePath);

      // Generate responsive images
      const _responsiveImages = await this.generateResponsiveImages(buffer, file.filePath);

      // Optimize original image
      const _optimizedImage = await this.optimizeImage(buffer, file.filePath);

      // Create WebP version
      const _webpImage = await this.createWebPVersion(buffer, file.filePath);

      // Update file record with processing results
      //   await this.fileRepository.update(fileId, {
      //     processingStatus: ProcessingStatus.COMPLETED,
      //     processingCompletedAt: new Date(),
      //     resolution: `${metadata.width}x${metadata.height}`,
      //     metadata: {
      //       ...file.metadata,
      //       imageMetadata: metadata,
      //       thumbnails,
      //       responsiveImages,
      //       optimizedImage,
      //       webpImage,
      //       processingDate: new Date().toISOString(),
      //     },
      //   });

      this.logger.log(`Image processing completed for file ${fileId}`);
    } catch (error) {
      this.logger.error(`Image processing failed for file ${fileId}:`, error.message);

      await this.fileRepository.update(fileId, {
        processingStatus: ProcessingStatus.FAILED,
        processingError: error.message,
        processingCompletedAt: new Date(),
      });

      throw error;
    }
  }

  /**
   * Resize image with options
   */
  async resizeImage(inputBuffer: Buffer, options: ImageResizeOptions): Promise<Buffer> {
    let pipeline = sharp(inputBuffer);

    // Apply resize options
    if (options.width || options.height) {
      pipeline = pipeline.resize({
        width: options.width,
        height: options.height,
        fit: options.fit || 'cover',
        position: options.position as any,
        background: options.background || { r: 255, g: 255, b: 255, alpha: 1 },
        withoutEnlargement: options.withoutEnlargement !== false,
      });
    }

    // Apply format and quality
    switch (options.format) {
      case 'jpeg':
        pipeline = pipeline.jpeg({
          quality: options.quality || 85,
          progressive: true,
          mozjpeg: true,
        });
        break;
      case 'png':
        pipeline = pipeline.png({
          quality: options.quality || 90,
          compressionLevel: 9,
          progressive: true,
        });
        break;
      case 'webp':
        pipeline = pipeline.webp({
          quality: options.quality || 85,
          effort: 6,
        });
        break;
      case 'avif':
        pipeline = pipeline.avif({
          quality: options.quality || 85,
          effort: 9,
        });
        break;
      default:
        pipeline = pipeline.jpeg({ quality: options.quality || 85 });
    }

    return pipeline.toBuffer();
  }

  /**
   * Extract comprehensive image metadata
   */
  async extractImageMetadata(buffer: Buffer): Promise<any> {
    const image = sharp(buffer);
    const metadata = await image.metadata();
    const stats = await image.stats();

    return {
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      channels: metadata.channels,
      density: metadata.density,
      hasProfile: metadata.hasProfile,
      hasAlpha: metadata.hasAlpha,
      orientation: metadata.orientation,
      exif: metadata.exif,
      icc: metadata.icc,
      colorspace: metadata.space,
      stats: {
        entropy: stats.entropy,
        channels: stats.channels,
        isOpaque: stats.isOpaque,
        dominant: stats.dominant,
      },
      aspectRatio:
        metadata.width && metadata.height ? (metadata.width / metadata.height).toFixed(2) : null,
    };
  }

  /**
   * Generate multiple thumbnail sizes
   */
  private async generateThumbnails(
    originalBuffer: Buffer,
    originalPath: string,
  ): Promise<string[]> {
    const thumbnails: string[] = [];
    const basePath = this.getBasePathWithoutExtension(originalPath);

    for (const config of this.thumbnailConfigs) {
      try {
        const resizedBuffer = await this.resizeImage(originalBuffer, {
          width: config.width,
          height: config.height,
          quality: config.quality,
          format: config.format,
          fit: 'cover',
        });

        const thumbnailPath = `${basePath}_${config.name}.${config.format}`;

        await this.fileStorageService.uploadFile(resizedBuffer, thumbnailPath, {
          contentType: `image/${config.format}`,
          metadata: {
            type: 'thumbnail',
            size: config.name,
            originalFile: originalPath,
          },
        });

        thumbnails.push(thumbnailPath);
        this.logger.log(`Generated thumbnail: ${config.name}`);
      } catch (error) {
        this.logger.error(`Failed to generate thumbnail ${config.name}:`, error.message);
      }
    }

    return thumbnails;
  }

  /**
   * Generate responsive images for different screen sizes
   */
  private async generateResponsiveImages(
    originalBuffer: Buffer,
    originalPath: string,
  ): Promise<string[]> {
    const responsiveImages: string[] = [];
    const basePath = this.getBasePathWithoutExtension(originalPath);

    for (const config of this.responsiveConfigs) {
      try {
        const resizedBuffer = await this.resizeImage(originalBuffer, {
          width: config.width,
          height: config.height,
          quality: config.quality,
          format: config.format,
          fit: 'inside',
          withoutEnlargement: true,
        });

        const responsivePath = `${basePath}_${config.name}.${config.format}`;

        await this.fileStorageService.uploadFile(resizedBuffer, responsivePath, {
          contentType: `image/${config.format}`,
          metadata: {
            type: 'responsive',
            breakpoint: config.name,
            originalFile: originalPath,
          },
        });

        responsiveImages.push(responsivePath);
        this.logger.log(`Generated responsive image: ${config.name}`);
      } catch (error) {
        this.logger.error(`Failed to generate responsive image ${config.name}:`, error.message);
      }
    }

    return responsiveImages;
  }

  /**
   * Optimize original image
   */
  private async optimizeImage(originalBuffer: Buffer, originalPath: string): Promise<string> {
    const basePath = this.getBasePathWithoutExtension(originalPath);
    const extension = path.extname(originalPath).slice(1);

    let optimizedBuffer: Buffer;

    if (extension === 'jpg' || extension === 'jpeg') {
      optimizedBuffer = await sharp(originalBuffer)
        .jpeg({
          quality: 85,
          progressive: true,
          mozjpeg: true,
        })
        .toBuffer();
    } else if (extension === 'png') {
      optimizedBuffer = await sharp(originalBuffer)
        .png({
          quality: 90,
          compressionLevel: 9,
          progressive: true,
        })
        .toBuffer();
    } else {
      // For other formats, convert to JPEG
      optimizedBuffer = await sharp(originalBuffer)
        .jpeg({
          quality: 85,
          progressive: true,
        })
        .toBuffer();
    }

    const optimizedPath = `${basePath}_optimized.${extension === 'png' ? 'png' : 'jpg'}`;

    await this.fileStorageService.uploadFile(optimizedBuffer, optimizedPath, {
      contentType: `image/${extension === 'png' ? 'png' : 'jpeg'}`,
      metadata: {
        type: 'optimized',
        originalFile: originalPath,
        compressionRatio: (
          ((originalBuffer.length - optimizedBuffer.length) / originalBuffer.length) *
          100
        ).toFixed(2),
      },
    });

    this.logger.log(
      `Generated optimized image with ${((1 - optimizedBuffer.length / originalBuffer.length) * 100).toFixed(1)}% size reduction`,
    );

    return optimizedPath;
  }

  /**
   * Create WebP version for modern browsers
   */
  private async createWebPVersion(originalBuffer: Buffer, originalPath: string): Promise<string> {
    const basePath = this.getBasePathWithoutExtension(originalPath);

    const webpBuffer = await sharp(originalBuffer)
      .webp({
        quality: 85,
        effort: 6,
      })
      .toBuffer();

    const webpPath = `${basePath}.webp`;

    await this.fileStorageService.uploadFile(webpBuffer, webpPath, {
      contentType: 'image/webp',
      metadata: {
        type: 'webp',
        originalFile: originalPath,
        compressionRatio: (
          ((originalBuffer.length - webpBuffer.length) / originalBuffer.length) *
          100
        ).toFixed(2),
      },
    });

    this.logger.log(
      `Generated WebP version with ${((1 - webpBuffer.length / originalBuffer.length) * 100).toFixed(1)}% size reduction`,
    );

    return webpPath;
  }

  /**
   * Create image from text (for generating placeholders, watermarks, etc.)
   */
  async createTextImage(
    text: string,
    options: {
      width: number;
      height: number;
      fontSize?: number;
      fontFamily?: string;
      color?: string;
      background?: string;
      format?: 'jpeg' | 'png' | 'webp';
    },
  ): Promise<Buffer> {
    const svg = `
      <svg width="${options.width}" height="${options.height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${options.background || '#f0f0f0'}"/>
        <text 
          x="50%" 
          y="50%" 
          text-anchor="middle" 
          dominant-baseline="middle"
          font-family="${options.fontFamily || 'Arial, sans-serif'}"
          font-size="${options.fontSize || 24}"
          fill="${options.color || '#333333'}"
        >${text}</text>
      </svg>
    `;

    let pipeline = sharp(Buffer.from(svg));

    switch (options.format) {
      case 'png':
        pipeline = pipeline.png();
        break;
      case 'webp':
        pipeline = pipeline.webp();
        break;
      default:
        pipeline = pipeline.jpeg({ quality: 90 });
    }

    return pipeline.toBuffer();
  }

  /**
   * Add watermark to image
   */
  async addWatermark(
    imageBuffer: Buffer,
    watermarkText: string,
    options: {
      position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
      fontSize?: number;
      opacity?: number;
      color?: string;
    } = {},
  ): Promise<Buffer> {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    const fontSize = options.fontSize || Math.max(24, Math.min(metadata.width! / 20, 48));
    const opacity = options.opacity || 0.5;
    const color = options.color || '#ffffff';

    // Calculate position
    let x = 20;
    let y = 20;

    switch (options.position) {
      case 'top-right':
        x = metadata.width! - 20;
        y = 20;
        break;
      case 'bottom-left':
        x = 20;
        y = metadata.height! - 20;
        break;
      case 'bottom-right':
        x = metadata.width! - 20;
        y = metadata.height! - 20;
        break;
      case 'center':
        x = metadata.width! / 2;
        y = metadata.height! / 2;
        break;
    }

    const watermarkSvg = `
      <svg width="${metadata.width}" height="${metadata.height}" xmlns="http://www.w3.org/2000/svg">
        <text 
          x="${x}" 
          y="${y}" 
          text-anchor="${options.position?.includes('right') ? 'end' : options.position === 'center' ? 'middle' : 'start'}"
          dominant-baseline="${options.position?.includes('bottom') ? 'text-after-edge' : options.position === 'center' ? 'middle' : 'text-before-edge'}"
          font-family="Arial, sans-serif"
          font-size="${fontSize}"
          fill="${color}"
          opacity="${opacity}"
          font-weight="bold"
        >${watermarkText}</text>
      </svg>
    `;

    const watermarkBuffer = Buffer.from(watermarkSvg);

    return image.composite([{ input: watermarkBuffer, blend: 'over' }]).toBuffer();
  }

  /**
   * Convert image format
   */
  async convertFormat(
    inputBuffer: Buffer,
    targetFormat: 'jpeg' | 'png' | 'webp' | 'avif' | 'tiff',
    quality: number = 85,
  ): Promise<Buffer> {
    let pipeline = sharp(inputBuffer);

    switch (targetFormat) {
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality, progressive: true, mozjpeg: true });
        break;
      case 'png':
        pipeline = pipeline.png({ quality, compressionLevel: 9 });
        break;
      case 'webp':
        pipeline = pipeline.webp({ quality, effort: 6 });
        break;
      case 'avif':
        pipeline = pipeline.avif({ quality, effort: 9 });
        break;
      case 'tiff':
        pipeline = pipeline.tiff({ quality, compression: 'lzw' });
        break;
    }

    return pipeline.toBuffer();
  }

  /**
   * Apply image filters and effects
   */
  async applyFilter(
    inputBuffer: Buffer,
    filter: 'blur' | 'sharpen' | 'grayscale' | 'sepia' | 'negative',
    intensity: number = 1,
  ): Promise<Buffer> {
    let pipeline = sharp(inputBuffer);

    switch (filter) {
      case 'blur':
        pipeline = pipeline.blur(intensity * 2);
        break;
      case 'sharpen':
        pipeline = pipeline.sharpen({ sigma: intensity });
        break;
      case 'grayscale':
        pipeline = pipeline.grayscale();
        break;
      case 'sepia':
        pipeline = pipeline.tint({ r: 255, g: 240, b: 196 });
        break;
      case 'negative':
        pipeline = pipeline.negate();
        break;
    }

    return pipeline.toBuffer();
  }

  /**
   * Create image collage
   */
  async createCollage(
    images: Buffer[],
    options: {
      columns: number;
      rows: number;
      width: number;
      height: number;
      spacing?: number;
      background?: string;
    },
  ): Promise<Buffer> {
    const spacing = options.spacing || 10;
    const cellWidth = (options.width - (options.columns + 1) * spacing) / options.columns;
    const cellHeight = (options.height - (options.rows + 1) * spacing) / options.rows;

    // Create base canvas
    const canvas = sharp({
      create: {
        width: options.width,
        height: options.height,
        channels: 4,
        background: options.background || { r: 255, g: 255, b: 255, alpha: 1 },
      },
    });

    const compositeImages = [];

    for (let i = 0; i < Math.min(images.length, options.columns * options.rows); i++) {
      const row = Math.floor(i / options.columns);
      const col = i % options.columns;

      const _x = spacing + col * (cellWidth + spacing);
      const _y = spacing + row * (cellHeight + spacing);

      // Resize image to fit cell
      const _resizedImage = await sharp(images[i])
        .resize({
          width: Math.round(cellWidth),
          height: Math.round(cellHeight),
          fit: 'cover',
        })
        .toBuffer();

      //   compositeImages.push({
      //     input: resizedImage,
      //     left: Math.round(x),
      //     top: Math.round(y),
      //   });
    }

    return canvas.composite(compositeImages).jpeg({ quality: 90 }).toBuffer();
  }

  /**
   * Extract colors from image
   */
  async extractColors(inputBuffer: Buffer, colorCount: number = 5): Promise<string[]> {
    const stats = await sharp(inputBuffer)
      .resize(100, 100, { fit: 'cover' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Simple color extraction (in production, use a proper color quantization algorithm)
    const colors: string[] = [];
    const pixels = stats.data;
    const pixelCount = pixels.length / 3;

    // Sample colors from the image
    for (let i = 0; i < colorCount; i++) {
      const offset = Math.floor((pixelCount / colorCount) * i) * 3;
      const r = pixels[offset];
      const g = pixels[offset + 1];
      const b = pixels[offset + 2];

      colors.push(
        `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`,
      );
    }

    return colors;
  }

  /**
   * Detect faces in image (placeholder - would use external service)
   */
  async detectFaces(_inputBuffer: Buffer): Promise<any[]> {
    // This would integrate with a face detection service like AWS Rekognition
    // or Google Vision API. For now, return empty array.
    this.logger.log('Face detection not implemented - returning empty result');
    return [];
  }

  /**
   * Generate image placeholder
   */
  async generatePlaceholder(
    width: number,
    height: number,
    text?: string,
    color?: string,
  ): Promise<Buffer> {
    const backgroundColor = color || '#e0e0e0';
    const textColor = this.getContrastColor(backgroundColor);
    const displayText = text || `${width}x${height}`;

    return this.createTextImage(displayText, {
      width,
      height,
      fontSize: Math.min(width, height) / 10,
      color: textColor,
      background: backgroundColor,
      format: 'jpeg',
    });
  }

  /**
   * Batch process multiple images
   */
  async batchProcess(
    files: { id: string; buffer: Buffer }[],
    operations: {
      resize?: ImageResizeOptions;
      format?: 'jpeg' | 'png' | 'webp';
      watermark?: string;
      filter?: 'blur' | 'sharpen' | 'grayscale' | 'sepia' | 'negative';
    },
  ): Promise<{ id: string; buffer: Buffer }[]> {
    const results = [];

    for (const file of files) {
      try {
        let processedBuffer = file.buffer;

        // Apply resize
        if (operations.resize) {
          processedBuffer = await this.resizeImage(processedBuffer, operations.resize);
        }

        // Apply filter
        if (operations.filter) {
          processedBuffer = await this.applyFilter(processedBuffer, operations.filter);
        }

        // Add watermark
        if (operations.watermark) {
          processedBuffer = await this.addWatermark(processedBuffer, operations.watermark);
        }

        // Convert format
        if (operations.format) {
          processedBuffer = await this.convertFormat(processedBuffer, operations.format);
        }

        // results.push({
        //   id: file.id,
        //   buffer: processedBuffer,
        // });
      } catch (error) {
        this.logger.error(`Failed to process image ${file.id}:`, error.message);
      }
    }

    return results;
  }

  // === UTILITY METHODS === //

  private getBasePathWithoutExtension(filePath: string): string {
    const parsedPath = path.parse(filePath);
    return path.join(parsedPath.dir, parsedPath.name);
  }

  private getContrastColor(hexColor: string): string {
    // Remove # if present
    const color = hexColor.replace('#', '');

    // Convert to RGB
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);

    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Return black or white based on luminance
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }

  /**
   * Get processing status for image
   */
  async getProcessingStatus(fileId: string): Promise<{
    status: ProcessingStatus;
    progress?: number;
    error?: string;
    results?: any;
  }> {
    const file = await this.fileRepository.findOne({
      where: { id: fileId },
    });

    if (!file) {
      throw new BadRequestException('File not found');
    }

    return {
      status: file.processingStatus,
      error: file.processingError,
      results: file.metadata?.imageMetadata,
    };
  }

  /**
   * Clean up processed images
   */
  async cleanupProcessedImages(fileId: string): Promise<void> {
    const file = await this.fileRepository.findOne({
      where: { id: fileId },
    });

    if (!file || !file.metadata?.thumbnails) {
      return;
    }

    // Delete all processed versions
    const filesToDelete = [
      ...(file.metadata.thumbnails || []),
      ...(file.metadata.responsiveImages || []),
      file.metadata.optimizedImage,
      file.metadata.webpImage,
    ].filter(Boolean);

    for (const filePath of filesToDelete) {
      try {
        await this.fileStorageService.deleteFile(filePath);
      } catch (error) {
        this.logger.warn(`Failed to delete processed image: ${filePath}`, error.message);
      }
    }

    this.logger.log(`Cleaned up processed images for file ${fileId}`);
  }
}
