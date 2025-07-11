import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';

// Service
import { CourseService } from './services/course.service';

// Controller
import { CourseController } from './controllers/course.controller';

// Entities
import { Category } from './entities/category.entity';
import { Course } from './entities/course.entity';
import { CourseSection } from './entities/course-section.entity';
import { Lesson } from './entities/lesson.entity';
import { FileUpload } from './entities/file-upload.entity';
import { Enrollment } from './entities/enrollment.entity';
import { LessonProgress } from './entities/lesson-progress.entity';

// Modules
import { CustomCacheModule } from '@/cache/cache.module';
import { UserModule } from '../user/user.module';
import { WinstonModule } from '@/logger/winston.module';
import { SystemModule } from '../system/system.module';
import { MulterModule } from '@nestjs/platform-express';
import { AuthModule } from '../auth/auth.module';
import { CategoryService } from './services/category.service';
import { ContentVersion } from './entities/content-version.entity';
import { LessonController } from './controllers/lesson.controller';
import { FileUploadService } from './services/file-upload.service';
import { LessonService } from './services/lesson.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Category,
      Course,
      CourseSection,
      Lesson,
      FileUpload,
      Enrollment,
      LessonProgress,
      ContentVersion,
    ]),
    // Multer for file uploads
    MulterModule.registerAsync({
      useFactory: () => ({
        dest: './uploads/temp',
        limits: {
          fileSize: 2 * 1024 * 1024 * 1024, // 2GB for videos
          files: 10, // Max 10 files per request
        },
        fileFilter: (req, file, cb) => {
          // File type validation
          const allowedMimes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'video/mp4',
            'video/webm',
            'video/ogg',
            'video/avi',
            'audio/mp3',
            'audio/wav',
            'audio/ogg',
            'audio/m4a',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain',
            'text/csv',
          ];

          if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
          } else {
            cb(new Error(`File type ${file.mimetype} is not allowed`), false);
          }
        },
      }),
    }),
    // Bull Queue for background processing
    BullModule.registerQueue(
      {
        name: 'video-processing',
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
          db: parseInt(process.env.REDIS_DB || '0'),
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
      },
      {
        name: 'content-moderation',
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
          db: parseInt(process.env.REDIS_DB || '0'),
        },
        defaultJobOptions: {
          removeOnComplete: 50,
          removeOnFail: 10,
          attempts: 2,
        },
      },
    ),
    CustomCacheModule,
    forwardRef(() => UserModule),
    forwardRef(() => AuthModule),
    WinstonModule,
    SystemModule,
  ],
  controllers: [
    CourseController,
    LessonController,
    // CategoryController,
    // CourseSectionController,
    // FileUploadController,
  ],
  providers: [
    // Core services
    CourseService,
    CategoryService,
    LessonService,
    FileUploadService,
    // CourseSectionService,
    // ContentModerationService,
    // VideoProcessingService,

    // Background processors
    // VideoProcessingProcessor,
    // ContentModerationProcessor,
  ],
  exports: [
    CourseService,
    CategoryService,
    LessonService,
    // CourseSectionService,
    FileUploadService,
    // ContentModerationService,
    // VideoProcessingService,
    TypeOrmModule,
  ],
})
export class CourseModule {}
