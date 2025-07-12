import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import { ImageProcessingService } from '../services/image-processing.service';
import { WinstonService } from '@/logger/winston.service';

@Injectable()
@Processor('image-processing')
export class ImageProcessingProcessor {
  constructor(
    private readonly imageProcessingService: ImageProcessingService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(ImageProcessingProcessor.name);
  }

  @Process('process-image')
  async handleImageProcessing(
    job: Job<{
      fileId: string;
      filePath: string;
      generateThumbnails?: boolean;
      optimize?: boolean;
    }>,
  ) {
    const { fileId, generateThumbnails, optimize } = job.data;

    this.logger.log(`Starting image processing for file ${fileId}`);

    try {
      // Update job progress
      await job.progress(10);

      // Process the image
      await this.imageProcessingService.processImage(fileId);

      await job.progress(100);
      this.logger.log(`Image processing completed for file ${fileId}`);

      return {
        status: 'completed',
        processedAt: new Date(),
        thumbnails: generateThumbnails,
        optimized: optimize,
      };
    } catch (error) {
      this.logger.error(`Image processing failed for file ${fileId}:`, error.message);
      throw error;
    }
  }

  @Process('batch-resize')
  async handleBatchResize(
    job: Job<{
      files: Array<{ id: string; buffer: Buffer }>;
      options: any;
    }>,
  ) {
    const { files, options } = job.data;

    this.logger.log(`Starting batch resize for ${files.length} images`);

    try {
      const results = await this.imageProcessingService.batchProcess(files, {
        resize: options,
      });

      this.logger.log(`Batch resize completed: ${results.length} images processed`);
      return { results, processedAt: new Date() };
    } catch (error) {
      this.logger.error('Batch resize failed:', error.message);
      throw error;
    }
  }

  @Process('generate-placeholder')
  async handlePlaceholderGeneration(
    job: Job<{
      width: number;
      height: number;
      text?: string;
      color?: string;
    }>,
  ) {
    const { width, height, text, color } = job.data;

    try {
      const placeholder = await this.imageProcessingService.generatePlaceholder(
        width,
        height,
        text,
        color,
      );

      return { placeholder: placeholder.toString('base64') };
    } catch (error) {
      this.logger.error('Placeholder generation failed:', error.message);
      throw error;
    }
  }
}
