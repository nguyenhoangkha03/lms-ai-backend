import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { TeacherApprovalService } from './services/teacher-approval.service';
import { UserManagementService } from './services/user-management.service';
import { UserModule } from '../user/user.module';
import { SystemModule } from '../system/system.module';
import { AuthModule } from '../auth/auth.module';
import { CourseModule } from '../course/course.module';
import { FileManagementModule } from '../file-management/file-management.module';
import { WinstonModule } from '@/logger/winston.module';

@Module({
  imports: [
    UserModule,
    SystemModule,
    AuthModule,
    CourseModule,
    FileManagementModule,
    WinstonModule,
  ],
  controllers: [AdminController],
  providers: [
    TeacherApprovalService, 
    UserManagementService,
    // Note: RoleService should be provided by UserModule
  ],
  exports: [TeacherApprovalService, UserManagementService],
})
export class AdminModule {}