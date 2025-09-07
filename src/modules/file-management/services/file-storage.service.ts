import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WinstonService } from '@/logger/winston.service';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import * as mimeTypes from 'mime-types';

export enum StorageProvider {
  LOCAL = 'local',
  S3 = 'S3',
  MINIO = 'minio',
}

export interface UploadOptions {
  acl?: 'public-read' | 'private' | 'public-read-write';
  metadata?: Record<string, string>;
  contentType?: string;
  cacheControl?: string;
  expires?: Date;
  tags?: Record<string, string>;
}

export interface StorageFile {
  key: string;
  url: string;
  signedUrl?: string;
  contentType: string;
  size: number;
  etag?: string;
  lastModified?: Date;
  metadata?: Record<string, string>;
}

@Injectable()
export class FileStorageService {
  private readonly provider: StorageProvider;
  private s3Client?: S3Client;
  private readonly localPath: string;
  private readonly bucketName: string;
  private readonly cdnUrl?: string;
  private readonly region: string;
  private useLocalFallback: boolean = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(FileStorageService.name);

    this.provider = this.configService.get('STORAGE_TYPE', StorageProvider.LOCAL);
    this.localPath = this.configService.get('UPLOAD_PATH', './uploads');
    this.bucketName = this.configService.get('AWS_S3_BUCKET', 'lms-files');
    this.cdnUrl = this.configService.get('CDN_URL');
    this.region = this.configService.get('AWS_REGION', 'us-east-1');

    // Debug logging
    const accessKeyId = this.configService.get('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get('AWS_SECRET_ACCESS_KEY');
    this.logger.log(`Storage provider: ${this.provider}`);
    this.logger.log(`S3 bucket: ${this.bucketName}`);
    this.logger.log(`AWS region: ${this.region}`);
    this.logger.log(
      `AWS_ACCESS_KEY_ID: ${accessKeyId ? `${accessKeyId.substring(0, 8)}...` : 'MISSING'}`,
    );
    this.logger.log(
      `AWS_SECRET_ACCESS_KEY: ${secretAccessKey ? `${secretAccessKey.substring(0, 8)}...` : 'MISSING'}`,
    );

    this.logger.log(
      `Initializinggggggggggggggggggggggggggggggggggg S3 client for ${this.provider}`,
    );
    if (this.provider === StorageProvider.S3 || this.provider === StorageProvider.MINIO) {
      this.initializeS3Client();
    } else {
      this.ensureLocalDirectories();
    }
  }

  /**
   * Initialize S3/MinIO client
   */
  private initializeS3Client(): void {
    const accessKeyId = this.configService.get('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get('AWS_SECRET_ACCESS_KEY');
    const endpoint = this.configService.get('MINIO_ENDPOINT'); // For MinIO

    this.logger.log(`Initializing S3 client for ${this.provider}`);
    this.logger.log(`Access Key ID length: ${accessKeyId?.length || 0}`);
    this.logger.log(`Secret Access Key length: ${secretAccessKey?.length || 0}`);

    if (!accessKeyId || !secretAccessKey) {
      this.logger.warn('AWS credentials not configured, falling back to local storage');
      this.logger.warn(
        `Missing: ${!accessKeyId ? 'AWS_ACCESS_KEY_ID' : ''} ${!secretAccessKey ? 'AWS_SECRET_ACCESS_KEY' : ''}`,
      );
      this.useLocalFallback = true;
      this.ensureLocalDirectories();
      return;
    }

    const clientConfig: any = {
      region: this.region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    };

    // MinIO specific configuration
    if (this.provider === StorageProvider.MINIO && endpoint) {
      clientConfig.endpoint = endpoint;
      clientConfig.forcePathStyle = true; // Required for MinIO
      clientConfig.region = 'us-east-1'; // MinIO default
    }

    this.s3Client = new S3Client(clientConfig);
    this.logger.log(`Initialized ${this.provider.toUpperCase()} storage client`);
  }

  /**
   * Ensure local directories exist
   */
  private async ensureLocalDirectories(): Promise<void> {
    const directories = [
      'avatars',
      'covers',
      'courses',
      'lessons',
      'documents',
      'videos',
      'images',
      'temp',
      'thumbnails',
      'processed',
    ];

    for (const dir of directories) {
      const dirPath = path.join(this.localPath, dir);
      await fs.mkdir(dirPath, { recursive: true });
    }

    this.logger.log('Local storage directories initialized');
  }

  /**
   * Upload file to storage
   */
  async uploadFile(
    file: Buffer | Express.Multer.File,
    key: string,
    options: UploadOptions = {},
  ): Promise<StorageFile> {
    // Get buffer and ensure it's a proper Buffer
    let buffer: Buffer;
    const rawBuffer = Buffer.isBuffer(file) ? file : file.buffer;

    // Convert array-like object to proper Buffer if needed
    if (Buffer.isBuffer(rawBuffer)) {
      buffer = rawBuffer;
    } else if (
      rawBuffer &&
      typeof rawBuffer === 'object' &&
      (rawBuffer as any).constructor?.name === 'Object'
    ) {
      // Handle array-like object
      const keys = Object.keys(rawBuffer as any);
      const isArrayLike = keys.every(key => /^\d+$/.test(key));
      if (isArrayLike) {
        const values = keys.map(key => (rawBuffer as any)[key]);
        buffer = Buffer.from(values);
        this.logger.log(
          `FileStorageService: Converted array-like object to Buffer, size: ${buffer.length}`,
        );
      } else {
        throw new Error(`Invalid buffer object structure`);
      }
    } else {
      buffer = Buffer.from(rawBuffer as any);
    }

    const contentType =
      options.contentType ||
      (Buffer.isBuffer(file) ? 'application/octet-stream' : file.mimetype) ||
      mimeTypes.lookup(key) ||
      'application/octet-stream';

    this.logger.log(
      `Upload file with provider: ${this.provider}, S3 client initialized: ${!!this.s3Client}, useLocalFallback: ${this.useLocalFallback}`,
    );

    this.logger.log(
      `Buffer ready for upload: isBuffer: ${Buffer.isBuffer(buffer)}, size: ${buffer.length}`,
    );

    if (this.provider === StorageProvider.LOCAL || this.useLocalFallback) {
      return this.uploadToLocal(buffer, key, contentType, options);
    } else {
      return this.uploadToS3(buffer, key, contentType, options);
    }
  }

  /**
   * Upload to local storage
   */
  private async uploadToLocal(
    buffer: Buffer,
    key: string,
    contentType: string,
    _options: UploadOptions,
  ): Promise<StorageFile> {
    const filePath = path.join(this.localPath, key);

    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Ensure buffer is proper Buffer
    let properBuffer: Buffer;
    if (Buffer.isBuffer(buffer)) {
      properBuffer = buffer;
    } else if (
      buffer &&
      typeof buffer === 'object' &&
      (buffer as any).constructor?.name === 'Object'
    ) {
      // Handle array-like object (same logic as in FileManagementService)
      const keys = Object.keys(buffer as any);
      const isArrayLike = keys.every(key => /^\d+$/.test(key));
      if (isArrayLike) {
        const values = keys.map(key => (buffer as any)[key]);
        properBuffer = Buffer.from(values);
        this.logger.debug(
          `Local: Converted array-like object to Buffer, size: ${properBuffer.length}`,
        );
      } else {
        this.logger.error(`Local: Cannot convert object to buffer - not array-like`);
        throw new Error(`Invalid buffer object structure for local upload`);
      }
    } else {
      this.logger.debug(
        `Local: Converting buffer type: ${typeof buffer}, constructor: ${(buffer as any)?.constructor?.name}`,
      );
      properBuffer = Buffer.from(buffer as any);
    }

    // Write file
    await fs.writeFile(filePath, properBuffer);

    const stats = await fs.stat(filePath);
    const url = this.cdnUrl ? `${this.cdnUrl}/${key}` : `/uploads/${key}`;

    this.logger.log(`File uploaded to local storage: ${key}`);

    return {
      key,
      url,
      contentType,
      size: stats.size,
      lastModified: stats.mtime,
    };
  }

  /**
   * Upload to S3/MinIO
   */
  private async uploadToS3(
    buffer: Buffer,
    key: string,
    contentType: string,
    options: UploadOptions,
  ): Promise<StorageFile> {
    if (!this.s3Client) {
      this.logger.warn('S3 client not initialized, falling back to local storage');
      this.useLocalFallback = true;
      this.ensureLocalDirectories();
      return this.uploadToLocal(buffer, key, contentType, options);
    }

    // Buffer is already ensured to be proper Buffer from uploadFile()
    this.logger.log(`S3: Uploading buffer size: ${buffer.length} bytes`);

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      // ACL removed - bucket doesn't support ACLs (Object Ownership enforced)
      Metadata: options.metadata,
      CacheControl: options.cacheControl,
      Expires: options.expires,
      Tagging: options.tags ? this.formatTags(options.tags) : undefined,
    });

    try {
      const response = await this.s3Client.send(command);

      const url = this.cdnUrl
        ? `${this.cdnUrl}/${key}`
        : `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;

      this.logger.log(`File uploaded to ${this.provider.toUpperCase()}: ${key}`);

      this.logger.log(`Successfully uploaded ${key} to S3, size: ${buffer.length} bytes`);

      return {
        key,
        url,
        contentType,
        size: buffer.length,
        etag: response.ETag,
      };
    } catch (error) {
      this.logger.error(`Failed to upload to ${this.provider.toUpperCase()}:`, error);
      this.logger.error(
        `Error details: Key=${key}, Size=${buffer?.length || 'unknown'}, ContentType=${contentType}`,
      );
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }
  }

  /**
   * Get file from storage
   */
  async getFile(key: string): Promise<{ buffer: Buffer; metadata: any }> {
    if (this.provider === StorageProvider.LOCAL) {
      return this.getFromLocal(key);
    } else {
      return this.getFromS3(key);
    }
  }

  /**
   * Get file from local storage
   */
  private async getFromLocal(key: string): Promise<{ buffer: Buffer; metadata: any }> {
    const filePath = path.join(this.localPath, key);

    try {
      const buffer = await fs.readFile(filePath);
      const stats = await fs.stat(filePath);

      return {
        buffer,
        metadata: {
          size: stats.size,
          lastModified: stats.mtime,
          contentType: mimeTypes.lookup(key) || 'application/octet-stream',
        },
      };
    } catch (error) {
      throw new BadRequestException(`File not found: ${key}`);
    }
  }

  /**
   * Get file from S3/MinIO
   */
  private async getFromS3(key: string): Promise<{ buffer: Buffer; metadata: any }> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      const buffer = Buffer.from(await response.Body!.transformToByteArray());

      return {
        buffer,
        metadata: {
          size: response.ContentLength,
          lastModified: response.LastModified,
          contentType: response.ContentType,
          etag: response.ETag,
        },
      };
    } catch (error) {
      throw new BadRequestException(`File not found: ${key}`);
    }
  }

  /**
   * Delete file from storage
   */
  async deleteFile(key: string): Promise<void> {
    if (this.provider === StorageProvider.LOCAL) {
      await this.deleteFromLocal(key);
    } else {
      await this.deleteFromS3(key);
    }
  }

  /**
   * Delete from local storage
   */
  private async deleteFromLocal(key: string): Promise<void> {
    const filePath = path.join(this.localPath, key);

    try {
      await fs.unlink(filePath);
      this.logger.log(`File deleted from local storage: ${key}`);
    } catch (error) {
      this.logger.warn(`Failed to delete local file: ${key}`, error.message);
    }
  }

  /**
   * Delete from S3/MinIO
   */
  private async deleteFromS3(key: string): Promise<void> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`File deleted from ${this.provider.toUpperCase()}: ${key}`);
    } catch (error) {
      this.logger.warn(`Failed to delete ${this.provider} file: ${key}`, error.message);
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(key: string): Promise<boolean> {
    if (this.provider === StorageProvider.LOCAL) {
      return this.existsInLocal(key);
    } else {
      return this.existsInS3(key);
    }
  }

  /**
   * Check if file exists in local storage
   */
  private async existsInLocal(key: string): Promise<boolean> {
    const filePath = path.join(this.localPath, key);

    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if file exists in S3/MinIO
   */
  private async existsInS3(key: string): Promise<boolean> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate signed URL for private files
   */
  async getSignedUrl(
    key: string,
    expiresIn: number = 3600,
    operation: 'getObject' | 'putObject' = 'getObject',
  ): Promise<string> {
    if (this.provider === StorageProvider.LOCAL) {
      // For local storage, return direct URL with token
      return this.generateLocalSignedUrl(key, expiresIn);
    } else {
      return this.generateS3SignedUrl(key, expiresIn, operation);
    }
  }

  /**
   * Generate signed URL for local storage (token-based)
   */
  private generateLocalSignedUrl(key: string, expiresIn: number): string {
    const payload = {
      key,
      exp: Date.now() + expiresIn * 1000,
    };

    const token = Buffer.from(JSON.stringify(payload)).toString('base64');
    return `/api/v1/files/download/${encodeURIComponent(key)}?token=${token}`;
  }

  /**
   * Generate S3/MinIO signed URL
   */
  private async generateS3SignedUrl(
    key: string,
    expiresIn: number,
    operation: 'getObject' | 'putObject',
  ): Promise<string> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }

    try {
      const CommandClass = (
        operation === 'getObject' ? GetObjectCommand : PutObjectCommand
      ) as new (args: { Bucket: string; Key: string }) => any;

      const command = new CommandClass({
        Bucket: this.bucketName,
        Key: key,
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      this.logger.error(`Failed to generate signed URL for ${key}:`, error);
      throw new BadRequestException('Failed to generate signed URL');
    }
  }

  /**
   * Generate unique file key
   */
  generateFileKey(category: string, fileName: string, userId?: string): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(fileName);
    const baseName = path.basename(fileName, extension);

    // Sanitize filename
    const sanitizedName = baseName
      .toLowerCase()
      .replace(/[^a-z0-9\-_]/g, '-')
      .replace(/-+/g, '-')
      .trim();

    if (userId) {
      return `${category}/${userId}/${timestamp}-${random}-${sanitizedName}${extension}`;
    } else {
      return `${category}/${timestamp}-${random}-${sanitizedName}${extension}`;
    }
  }

  /**
   * Calculate file hash
   */
  calculateFileHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Format tags for S3
   */
  private formatTags(tags: Record<string, string>): string {
    return Object.entries(tags)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
  }

  /**
   * Copy file within storage
   */
  async copyFile(sourceKey: string, destinationKey: string): Promise<StorageFile> {
    if (this.provider === StorageProvider.LOCAL) {
      return this.copyLocalFile(sourceKey, destinationKey);
    } else {
      return this.copyS3File(sourceKey, destinationKey);
    }
  }

  /**
   * Copy file in local storage
   */
  private async copyLocalFile(sourceKey: string, destinationKey: string): Promise<StorageFile> {
    const sourcePath = path.join(this.localPath, sourceKey);
    const destPath = path.join(this.localPath, destinationKey);

    // Ensure destination directory exists
    await fs.mkdir(path.dirname(destPath), { recursive: true });

    await fs.copyFile(sourcePath, destPath);

    const stats = await fs.stat(destPath);
    const url = this.cdnUrl ? `${this.cdnUrl}/${destinationKey}` : `/uploads/${destinationKey}`;

    return {
      key: destinationKey,
      url,
      contentType: mimeTypes.lookup(destinationKey) || 'application/octet-stream',
      size: stats.size,
      lastModified: stats.mtime,
    };
  }

  /**
   * Copy file in S3/MinIO
   */
  private async copyS3File(_sourceKey: string, _destinationKey: string): Promise<StorageFile> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }

    // Implementation would use CopyObjectCommand
    // For brevity, showing placeholder
    throw new Error('S3 copy operation not implemented in this example');
  }

  /**
   * Get storage provider info
   */
  getProviderInfo(): {
    provider: StorageProvider;
    bucket?: string;
    region?: string;
    cdnUrl?: string;
  } {
    return {
      provider: this.provider,
      bucket: this.bucketName,
      region: this.region,
      cdnUrl: this.cdnUrl,
    };
  }
}
