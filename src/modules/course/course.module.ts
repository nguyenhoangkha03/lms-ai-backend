import { Module } from '@nestjs/common';
import { CourseService } from './services/course.service';
import { CourseController } from './course.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { Course } from './entities/course.entity';
import { CourseSection } from './entities/course-section.entity';
import { Lesson } from './entities/lesson.entity';
import { FileUpload } from './entities/file-upload.entity';
import { Enrollment } from './entities/enrollment.entity';
import { LessonProgress } from './entities/lesson-progress.entity';
import { CustomCacheModule } from '@/cache/cache.module';
import { UserModule } from '../user/user.module';
import { LoggerModule } from '@/logger/logger.module';

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
    CustomCacheModule,
    UserModule,
    LoggerModule,
  ],
  controllers: [
    CourseController,
    // CategoryController, EnrollmentController, FileUploadController
  ],
  providers: [
    CourseService,
    // CategoryService,
    // CourseSectionService,
    // LessonService,
    // FileUploadService,
    // EnrollmentService,
    // LessonProgressService,
  ],
  exports: [
    CourseService,
    // CategoryService,
    // CourseSectionService,
    // LessonService,
    // FileUploadService,
    // EnrollmentService,
    // LessonProgressService,
  ],
})
export class CourseModule {}
