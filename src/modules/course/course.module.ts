import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Service
import { CourseService } from './services/course.service';

// Controller
import { CourseController } from './course.controller';

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
    ]),
    MulterModule.registerAsync({
      useFactory: () => ({
        dest: './uploads/courses',
      }),
    }),
    CustomCacheModule,
    forwardRef(() => UserModule),
    forwardRef(() => AuthModule),
    WinstonModule,
    SystemModule,
  ],
  controllers: [
    CourseController,
    // CategoryController, EnrollmentController, FileUploadController
  ],
  providers: [
    CourseService,
    CategoryService,
    // CourseSectionService,
    // LessonService,
  ],
  exports: [
    CourseService,
    CategoryService,
    // CourseSectionService,
    // LessonService,
    TypeOrmModule,
  ],
})
export class CourseModule {}
