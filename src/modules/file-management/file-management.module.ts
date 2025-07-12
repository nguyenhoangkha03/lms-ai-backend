import { forwardRef, Module } from '@nestjs/common';
import { memoryStorage } from 'multer';
import path from 'path';

// Services
import { FileManagementService } from './services/file-management.service';
import { FileStorageService } from './services/file-storage.service';
import { ImageProcessingService } from './services/image-processing.service';
import { CDNIntegrationService } from './services/cdn-integration.service';

// Controllers
import { FileManagementController } from './controllers/file-management.controller';

// Entities
import { FileUpload } from '../course/entities/file-upload.entity';

// Processors
// import { FileProcessingProcessor } from './processors/file-processing.processor';
// import { ImageProcessingProcessor } from './processors/image-processing.processor';

// Modules
import { CustomCacheModule } from '@/cache/cache.module';
import { WinstonModule } from '@/logger/winston.module';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { SystemModule } from '../system/system.module';

// Guards and Interceptors
// import { FileValidationPipe } from './pipes/file-validation.pipe';
// import { FileUploadInterceptor } from './interceptors/file-upload.interceptor';

@Module({
  imports: [
    // TypeORM entities
    TypeOrmModule.forFeature([FileUpload]),

    // Multer configuration for file uploads
    MulterModule.registerAsync({
      useFactory: async (configService: ConfigService) => ({
        storage: memoryStorage(),
        limits: {
          fileSize: parseInt(configService.get('MAX_FILE_SIZE', '104857600')), // 100MB default
          files: parseInt(configService.get('MAX_FILES_PER_UPLOAD', '10')),
        },
        fileFilter: (_req, file, callback) => {
          // Enhanced file filtering logic
          const allowedMimeTypes = [
            // Images
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/svg+xml',
            'image/bmp',
            'image/tiff',
            // Videos
            'video/mp4',
            'video/webm',
            'video/ogg',
            'video/avi',
            'video/mov',
            'video/wmv',
            'video/flv',
            'video/mkv',
            // Audio
            'audio/mpeg',
            'audio/wav',
            'audio/ogg',
            'audio/aac',
            'audio/flac',
            'audio/m4a',
            'audio/wma',
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
            'text/rtf',
            // Archives
            'application/zip',
            'application/x-rar-compressed',
            'application/x-7z-compressed',
            'application/x-tar',
            'application/gzip',
          ];

          const dangerousExtensions = [
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

          // Check dangerous extensions
          const extension = path.extname(file.originalname).toLowerCase();
          if (dangerousExtensions.includes(extension)) {
            return callback(new Error('File type not allowed for security reasons'), false);
          }

          // Check MIME type
          if (allowedMimeTypes.includes(file.mimetype)) {
            callback(null, true);
          } else {
            callback(new Error(`File type ${file.mimetype} is not allowed`), false);
          }
        },
      }),
      inject: [ConfigService],
    }),

    // Bull Queue for background processing
    BullModule.registerQueueAsync(
      {
        name: 'file-processing',
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          redis: {
            host: configService.get('REDIS_HOST', 'localhost'),
            port: parseInt(configService.get('REDIS_PORT', '6379')),
            password: configService.get('REDIS_PASSWORD'),
            db: parseInt(configService.get('REDIS_DB', '0')),
          },
          defaultJobOptions: {
            removeOnComplete: 10,
            removeOnFail: 5,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          },
        }),
        inject: [ConfigService],
      },
      {
        name: 'image-processing',
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          redis: {
            host: configService.get('REDIS_HOST', 'localhost'),
            port: parseInt(configService.get('REDIS_PORT', '6379')),
            password: configService.get('REDIS_PASSWORD'),
            db: parseInt(configService.get('REDIS_DB', '0')),
          },
          defaultJobOptions: {
            removeOnComplete: 20,
            removeOnFail: 10,
            attempts: 2,
            backoff: {
              type: 'fixed',
              delay: 5000,
            },
          },
        }),
        inject: [ConfigService],
      },
    ),
    CustomCacheModule,
    WinstonModule,
    SystemModule,
    forwardRef(() => AuthModule),
    forwardRef(() => UserModule),
  ],
  controllers: [FileManagementController],
  providers: [
    // Core services
    FileManagementService,
    FileStorageService,
    ImageProcessingService,
    CDNIntegrationService,

    // Background processors
    // FileProcessingProcessor,
    // ImageProcessingProcessor,

    // Validation and interceptors
    // FileValidationPipe,
    // FileUploadInterceptor,
  ],
  exports: [
    FileManagementService,
    FileStorageService,
    ImageProcessingService,
    CDNIntegrationService,
    TypeOrmModule,
  ],
})
export class FileManagementModule {}
