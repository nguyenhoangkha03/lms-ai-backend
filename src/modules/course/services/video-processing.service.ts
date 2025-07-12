import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Repository } from 'typeorm';
import { Queue } from 'bull';
import { WinstonService } from '@/logger/winston.service';
import { FileUpload } from '../entities/file-upload.entity';
import { ProcessingStatus, FileType } from '@/common/enums/file.enums';
import * as ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface VideoProcessingJob {
  fileId: string;
  inputPath: string;
  outputDir: string;
  options?: VideoProcessingOptions;
}

export interface VideoProcessingOptions {
  generateThumbnails?: boolean;
  createPreview?: boolean;
  adaptiveBitrate?: boolean;
  qualities?: VideoQuality[];
  watermark?: WatermarkOptions;
}

export interface VideoQuality {
  name: string;
  width: number;
  height: number;
  bitrate: string;
  audioBitrate?: string;
  fps?: number;
}

export interface WatermarkOptions {
  enabled: boolean;
  imagePath?: string;
  text?: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity?: number;
}

@Injectable()
export class VideoProcessingService {
  private readonly uploadPath = process.env.UPLOAD_PATH || './uploads';
  private readonly defaultQualities: VideoQuality[] = [
    { name: '1080p', width: 1920, height: 1080, bitrate: '4000k', audioBitrate: '192k', fps: 30 },
    { name: '720p', width: 1280, height: 720, bitrate: '2500k', audioBitrate: '128k', fps: 30 },
    { name: '480p', width: 854, height: 480, bitrate: '1000k', audioBitrate: '96k', fps: 30 },
    { name: '360p', width: 640, height: 360, bitrate: '600k', audioBitrate: '64k', fps: 24 },
  ];

  constructor(
    @InjectRepository(FileUpload)
    private readonly fileRepository: Repository<FileUpload>,
    @InjectQueue('video-processing')
    private readonly videoQueue: Queue<VideoProcessingJob>,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(VideoProcessingService.name);
  }

  /**
   * Queue video for processing
   */
  async queueVideoProcessing(fileId: string, options: VideoProcessingOptions = {}): Promise<void> {
    const file = await this.fileRepository.findOne({
      where: { id: fileId, fileType: FileType.VIDEO },
    });

    if (!file) {
      throw new BadRequestException('Video file not found');
    }

    const inputPath = path.join(this.uploadPath, file.filePath!);
    const outputDir = path.join(this.uploadPath, 'processed', file.id);

    // Create output directory
    await fs.mkdir(outputDir, { recursive: true });

    // Update processing status
    await this.fileRepository.update(fileId, {
      processingStatus: ProcessingStatus.PROCESSING,
      processingStartedAt: new Date(),
    });

    // Add job to queue
    await this.videoQueue.add('process-video', {
      fileId,
      inputPath,
      outputDir,
      options: {
        generateThumbnails: true,
        createPreview: true,
        adaptiveBitrate: true,
        qualities: this.defaultQualities,
        ...options,
      },
    });

    this.logger.log(`Queued video processing for file ${fileId}`);
  }

  /**
   * Process video file
   */
  async processVideo(job: VideoProcessingJob): Promise<void> {
    const { fileId, inputPath, outputDir } = job;

    try {
      this.logger.log(`Starting video processing for file ${fileId}`);

      // Get video information
      const _videoInfo = await this.getVideoInfo(inputPath);

      // Store original video info
      //   await this.fileRepository.update(fileId, {
      //     duration: Math.floor(videoInfo.duration),
      //     resolution: `${videoInfo.width}x${videoInfo.height}`,
      //     bitrate: videoInfo.bitrate,
      //     metadata: {
      //       ...((await this.fileRepository.findOne({ where: { id: fileId } }))?.metadata || {}),
      //       videoInfo,
      //     },
      //   });

      const processedFiles: string[] = [];

      // Generate multiple quality versions
      //   if (options.adaptiveBitrate && options.qualities) {
      //     for (const quality of options.qualities) {
      //       // Skip if original resolution is lower than target
      //       if (videoInfo.width < quality.width || videoInfo.height < quality.height) {
      //         continue;
      //       }

      //       const outputFile = await this.processVideoQuality(
      //         inputPath,
      //         outputDir,
      //         quality,
      //         options.watermark,
      //       );
      //       processedFiles.push(outputFile);
      //     }
      //   }

      // Generate thumbnails
      //   if (options.generateThumbnails) {
      //     const thumbnails = await this.generateThumbnails(inputPath, outputDir);
      //     await this.fileRepository.update(fileId, {
      //       thumbnailPath: thumbnails[0], // Use first thumbnail as main
      //     });
      //   }

      //   // Create preview video (first 30 seconds)
      //   if (options.createPreview) {
      //     const previewFile = await this.createPreview(inputPath, outputDir);
      //     processedFiles.push(previewFile);
      //   }

      // Generate HLS playlist for adaptive streaming
      if (processedFiles.length > 0) {
        await this.generateHLSPlaylist(outputDir, processedFiles);
      }

      // Update file record with processing results
      await this.fileRepository.update(fileId, {
        processingStatus: ProcessingStatus.COMPLETED,
        processingCompletedAt: new Date(),
        processedVersions: processedFiles,
      });

      this.logger.log(`Video processing completed for file ${fileId}`);
    } catch (error) {
      this.logger.error(`Video processing failed for file ${fileId}:`, error.message);

      await this.fileRepository.update(fileId, {
        processingStatus: ProcessingStatus.FAILED,
        processingError: error.message,
        processingCompletedAt: new Date(),
      });

      throw error;
    }
  }

  /**
   * Get video information
   */
  private async getVideoInfo(filePath: string): Promise<any> {
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

        // resolve({
        //   duration: metadata.format.duration || 0,
        //   width: videoStream.width || 0,
        //   height: videoStream.height || 0,
        //   bitrate: parseInt(metadata.format.bit_rate || '0'),
        //   fps: this.evaluateFPS(videoStream.r_frame_rate),
        //   codec: videoStream.codec_name,
        //   format: metadata.format.format_name,
        //   size: metadata.format.size || 0,
        // });
      });
    });
  }

  /**
   * Process video for specific quality
   */
  private async processVideoQuality(
    inputPath: string,
    outputDir: string,
    quality: VideoQuality,
    watermark?: WatermarkOptions,
  ): Promise<string> {
    const outputFile = `${quality.name}.mp4`;
    const outputPath = path.join(outputDir, outputFile);

    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .videoBitrate(quality.bitrate)
        .audioBitrate(quality.audioBitrate || '128k')
        .size(`${quality.width}x${quality.height}`)
        .fps(quality.fps || 30)
        .format('mp4')
        .outputOptions([
          '-preset medium',
          '-crf 23',
          '-movflags +faststart',
          '-profile:v high',
          '-level 4.0',
        ]);

      // Add watermark if specified
      if (watermark?.enabled) {
        if (watermark.imagePath) {
          command = command.complexFilter(
            [
              {
                filter: 'overlay',
                options: this.getWatermarkPosition(watermark.position || 'bottom-right'),
                inputs: ['0:v', '1:v'],
                outputs: 'v',
              },
            ],
            'v',
          );
          command = command.input(watermark.imagePath);
        } else if (watermark.text) {
          const textFilter = `drawtext=text='${watermark.text}':fontcolor=white:fontsize=24:alpha=${watermark.opacity || 0.5}:${this.getTextPosition(watermark.position || 'bottom-right')}`;
          command = command.videoFilters(textFilter);
        }
      }

      command
        .output(outputPath)
        .on('start', commandLine => {
          this.logger.debug(`FFmpeg command: ${commandLine}`);
        })
        .on('progress', progress => {
          this.logger.debug(`Processing ${quality.name}: ${progress.percent}%`);
        })
        .on('end', () => {
          this.logger.log(`Quality ${quality.name} processed successfully`);
          resolve(outputFile);
        })
        .on('error', err => {
          this.logger.error(`Error processing ${quality.name}:`, err.message);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Generate video thumbnails
   */
  private async generateThumbnails(
    inputPath: string,
    outputDir: string,
    count: number = 5,
  ): Promise<string[]> {
    const thumbnails: string[] = [];

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .screenshots({
          count,
          folder: outputDir,
          filename: 'thumb-%03d.jpg',
          size: '320x180',
        })
        .on('end', () => {
          // Generate thumbnail file names
          for (let i = 1; i <= count; i++) {
            thumbnails.push(`thumb-${i.toString().padStart(3, '0')}.jpg`);
          }
          this.logger.log(`Generated ${count} thumbnails`);
          resolve(thumbnails);
        })
        .on('error', err => {
          this.logger.error('Error generating thumbnails:', err.message);
          reject(err);
        });
    });
  }

  /**
   * Create preview video (first 30 seconds)
   */
  private async createPreview(inputPath: string, outputDir: string): Promise<string> {
    const previewFile = 'preview.mp4';
    const outputPath = path.join(outputDir, previewFile);

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .seekInput(0)
        .duration(30)
        .videoCodec('libx264')
        .audioCodec('aac')
        .videoBitrate('1000k')
        .audioBitrate('128k')
        .size('854x480')
        .format('mp4')
        .outputOptions(['-preset fast', '-crf 28', '-movflags +faststart'])
        .output(outputPath)
        .on('end', () => {
          this.logger.log('Preview video created successfully');
          resolve(previewFile);
        })
        .on('error', err => {
          this.logger.error('Error creating preview:', err.message);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Generate HLS playlist for adaptive streaming
   */
  private async generateHLSPlaylist(outputDir: string, processedFiles: string[]): Promise<void> {
    const playlistContent = this.createM3U8Playlist(processedFiles);
    const playlistPath = path.join(outputDir, 'playlist.m3u8');

    await fs.writeFile(playlistPath, playlistContent);
    this.logger.log('HLS playlist generated');
  }

  /**
   * Create M3U8 playlist content
   */
  private createM3U8Playlist(files: string[]): string {
    let playlist = '#EXTM3U\n#EXT-X-VERSION:3\n\n';

    const qualities = [
      { file: '1080p.mp4', bandwidth: 4000000, resolution: '1920x1080' },
      { file: '720p.mp4', bandwidth: 2500000, resolution: '1280x720' },
      { file: '480p.mp4', bandwidth: 1000000, resolution: '854x480' },
      { file: '360p.mp4', bandwidth: 600000, resolution: '640x360' },
    ];

    for (const quality of qualities) {
      if (files.includes(quality.file)) {
        playlist += `#EXT-X-STREAM-INF:BANDWIDTH=${quality.bandwidth},RESOLUTION=${quality.resolution}\n`;
        playlist += `${quality.file}\n`;
      }
    }

    return playlist;
  }

  /**
   * Get watermark position for overlay filter
   */
  private getWatermarkPosition(position: string): string {
    const positions = {
      'top-left': '10:10',
      'top-right': 'W-w-10:10',
      'bottom-left': '10:H-h-10',
      'bottom-right': 'W-w-10:H-h-10',
      center: '(W-w)/2:(H-h)/2',
    };

    return positions[position] || positions['bottom-right'];
  }

  /**
   * Get text position for drawtext filter
   */
  private getTextPosition(position: string): string {
    const positions = {
      'top-left': 'x=10:y=10',
      'top-right': 'x=w-tw-10:y=10',
      'bottom-left': 'x=10:y=h-th-10',
      'bottom-right': 'x=w-tw-10:y=h-th-10',
      center: 'x=(w-tw)/2:y=(h-th)/2',
    };

    return positions[position] || positions['bottom-right'];
  }

  /**
   * Evaluate frame rate from FFmpeg string
   */
  private evaluateFPS(frameRate: string): number {
    if (!frameRate) return 30;

    if (frameRate.includes('/')) {
      const [numerator, denominator] = frameRate.split('/');
      return Math.round(parseInt(numerator) / parseInt(denominator));
    }

    return parseInt(frameRate) || 30;
  }

  /**
   * Get processing status for a file
   */
  async getProcessingStatus(fileId: string): Promise<{
    status: ProcessingStatus;
    progress?: number;
    error?: string;
  }> {
    const file = await this.fileRepository.findOne({
      where: { id: fileId },
    });

    if (!file) {
      throw new BadRequestException('File not found');
    }

    // Check if job is in queue
    const job = await this.videoQueue.getJob(fileId);

    return {
      status: file.processingStatus,
      progress: job?.progress() || 0,
      error: file.processingError,
    };
  }

  /**
   * Cancel video processing
   */
  async cancelProcessing(fileId: string): Promise<void> {
    const job = await this.videoQueue.getJob(fileId);

    if (job) {
      await job.remove();
      this.logger.log(`Cancelled video processing for file ${fileId}`);
    }

    await this.fileRepository.update(fileId, {
      processingStatus: ProcessingStatus.FAILED,
      processingError: 'Processing cancelled by user',
    });
  }

  /**
   * Generate streaming URL for video
   */
  async getStreamingUrl(fileId: string, quality?: string): Promise<string> {
    const file = await this.fileRepository.findOne({
      where: { id: fileId, fileType: FileType.VIDEO },
    });

    if (!file) {
      throw new BadRequestException('Video file not found');
    }

    if (file.processingStatus !== ProcessingStatus.COMPLETED) {
      // Return original file if processing not completed
      return `/api/v1/stream/${fileId}/original`;
    }

    // Return processed version URL
    const qualityFile = quality || 'playlist.m3u8';
    return `/api/v1/stream/${fileId}/${qualityFile}`;
  }

  /**
   * Clean up old processed files
   */
  async cleanupOldFiles(days: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const oldFiles = await this.fileRepository.find({
      where: {
        processingStatus: ProcessingStatus.COMPLETED,
        processingCompletedAt: new Date(`< ${cutoffDate.toISOString()}`),
      },
    });

    for (const file of oldFiles) {
      try {
        const outputDir = path.join(this.uploadPath, 'processed', file.id);
        await fs.rmdir(outputDir, { recursive: true });

        await this.fileRepository.update(file.id, {
          processedVersions: [],
          processingStatus: ProcessingStatus.PENDING,
        });

        this.logger.log(`Cleaned up processed files for ${file.id}`);
      } catch (error) {
        this.logger.error(`Failed to cleanup files for ${file.id}:`, error.message);
      }
    }
  }
}
