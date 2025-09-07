import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  HeadObjectCommandOutput,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { WinstonService } from '@/logger/winston.service';

interface PresignedUrlOptions {
  expiresIn: number;
  contentType: string;
  contentLength: number;
  metadata?: Record<string, string>;
}

interface UploadUrlResponse {
  uploadId: string;
  presignedUrl: string;
  s3Key: string;
  expiresIn: number;
  bucketName: string;
}

@Injectable()
export class S3UploadService {
  private s3Client: S3Client;
  public readonly bucketName: string;
  public readonly region: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(S3UploadService.name);

    // Initialize S3 configuration
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET') || 'lms-ai-uploads';
    this.region = this.configService.get<string>('AWS_REGION') || 'ap-southeast-1';

    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');

    if (!accessKeyId || !secretAccessKey) {
      this.logger.warn('AWS credentials not found, S3 upload will not work');
    }

    this.s3Client = new S3Client({
      region: this.region,
      credentials:
        accessKeyId && secretAccessKey
          ? {
              accessKeyId,
              secretAccessKey,
            }
          : undefined,
    });

    this.logger.log(
      `S3 Upload Service initialized with bucket: ${this.bucketName}, region: ${this.region}`,
    );
  }

  /**
   * Generate presigned URL for direct upload to S3
   */
  async generatePresignedUploadUrl(key: string, options: PresignedUrlOptions): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: options.contentType,
        ContentLength: options.contentLength,
        Metadata: options.metadata,
        // ACL removed - bucket uses bucket policy for public access instead of ACLs
      });

      const presignedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: options.expiresIn,
      });

      this.logger.log(`Generated presigned URL for key: ${key}, expires in: ${options.expiresIn}s`);
      return presignedUrl;
    } catch (error) {
      this.logger.error(`Failed to generate presigned URL for key ${key}:`, error);
      throw new BadRequestException('Failed to generate upload URL');
    }
  }

  /**
   * Check if object exists in S3 and get metadata
   */
  async headObject(key: string): Promise<HeadObjectCommandOutput | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const result = await this.s3Client.send(command);
      this.logger.log(`Object exists in S3: ${key}, size: ${result.ContentLength}`);
      return result;
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        this.logger.warn(`Object not found in S3: ${key}`);
        return null;
      }
      this.logger.error(`Error checking S3 object ${key}:`, error);
      throw error;
    }
  }

  /**
   * Generate public URL for S3 object
   */
  getPublicUrl(key: string): string {
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
  }

  /**
   * Generate presigned download URL (for private objects)
   */
  async generatePresignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const presignedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      this.logger.log(`Generated presigned download URL for key: ${key}`);
      return presignedUrl;
    } catch (error) {
      this.logger.error(`Failed to generate presigned download URL for key ${key}:`, error);
      throw new BadRequestException('Failed to generate download URL');
    }
  }

  /**
   * Generate S3 key for file uploads
   */
  generateS3Key(courseId: string, uploadType: string, fileName: string, uploadId: string): string {
    // Sanitize filename
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestamp = Date.now();

    return `courses/${courseId}/${uploadType}/${timestamp}_${uploadId}_${sanitizedFileName}`;
  }

  /**
   * Validate upload parameters
   */
  validateUploadParams(fileSize: number, mimeType: string, uploadType: string): void {
    // File size limits based on upload type
    const maxSizes = {
      trailer: 500 * 1024 * 1024, // 500MB
      lesson: 1 * 1024 * 1024 * 1024, // 1GB
      promotional: 200 * 1024 * 1024, // 200MB
    };

    const maxSize = maxSizes[uploadType] || 500 * 1024 * 1024;

    if (fileSize > maxSize) {
      throw new BadRequestException(
        `File size ${Math.round(fileSize / 1024 / 1024)}MB exceeds limit of ${Math.round(maxSize / 1024 / 1024)}MB for ${uploadType} uploads`,
      );
    }

    // Validate MIME type
    const allowedMimeTypes = [
      // Video formats
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/avi',
      'video/mov',
      'video/wmv',
      // Image formats for thumbnails/promotional images
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      // Audio formats
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/aac',
      'audio/ogg',
      'audio/flac',
      'audio/webm',
      'audio/mp4',
      'audio/m4a',
      'audio/x-m4a',
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'application/rtf',
      'application/zip',
      'application/x-rar-compressed',
    ];

    if (!allowedMimeTypes.includes(mimeType)) {
      throw new BadRequestException(`Unsupported MIME type: ${mimeType}`);
    }
  }

  /**
   * Get service configuration info
   */
  getServiceInfo(): {
    bucketName: string;
    region: string;
    provider: string;
    maxFileSize: number;
  } {
    return {
      bucketName: this.bucketName,
      region: this.region,
      provider: 'AWS S3',
      maxFileSize: 500 * 1024 * 1024, // 500MB default
    };
  }
}
