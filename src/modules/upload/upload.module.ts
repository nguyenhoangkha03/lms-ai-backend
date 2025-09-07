import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UploadController } from './upload.controller';
import { DocumentUploadService } from './services/document-upload.service';
import { UserModule } from '../user/user.module';
import { SystemModule } from '../system/system.module';
import { AuthModule } from '../auth/auth.module';
import { FileManagementModule } from '../file-management/file-management.module';
import { FileUpload } from '../course/entities/file-upload.entity';
import { WinstonModule } from '@/logger/winston.module';
import * as multer from 'multer';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([FileUpload]),
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        limits: {
          fileSize: configService.get<number>('upload.maxFileSize', 10 * 1024 * 1024), // 10MB
        },
        storage: multer.memoryStorage(),
        fileFilter: (req, file, cb) => {
          const allowedMimeTypes = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/jpg',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ];

          if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
          } else {
            cb(new Error(`File type ${file.mimetype} not allowed`), false);
          }
        },
      }),
      inject: [ConfigService],
    }),
    UserModule,
    SystemModule,
    AuthModule,
    FileManagementModule,
    WinstonModule,
  ],
  controllers: [UploadController],
  providers: [DocumentUploadService],
  exports: [DocumentUploadService],
})
export class UploadModule {}