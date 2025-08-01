import { Module, forwardRef } from '@nestjs/common';
import { UserService } from './services/user.service';
import { UserController } from './controllers/user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserProfile } from './entities/user-profile.entity';
import { StudentProfile } from './entities/student-profile.entity';
import { TeacherProfile } from './entities/teacher-profile.entity';
import { UserSocial } from './entities/user-social.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { CustomCacheModule } from '@/cache/cache.module';
import { MulterModule } from '@nestjs/platform-express';
import { RoleService } from './services/role.service';
import { PermissionService } from './services/permission.service';
import { FileUploadService } from './services/file-upload.service';
import { WinstonModule } from '@/logger/winston.module';
import { AuthModule } from '../auth/auth.module';
import { SystemModule } from '../system/system.module';
import { RoleController } from './controllers/role.controller';
import { PermissionController } from './controllers/permission.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserProfile,
      StudentProfile,
      TeacherProfile,
      UserSocial,
      Role,
      Permission,
    ]),
    CustomCacheModule,
    forwardRef(() => AuthModule),
    WinstonModule,
    SystemModule,
    MulterModule.registerAsync({
      useFactory: () => ({
        dest: './uploads',
      }),
    }),
  ],
  controllers: [
    UserController,
    RoleController,
    PermissionController,
    // ProfileController, RoleController
  ],
  providers: [
    UserService,
    RoleService,
    PermissionService,
    FileUploadService,
    // UserProfileService,
    // StudentProfileService,
    // TeacherProfileService,
    // RoleService,
    // PermissionService,
  ],
  exports: [
    UserService,
    RoleService,
    PermissionService,
    FileUploadService,
    TypeOrmModule,
    // UserProfileService,
    // StudentProfileService,
    // TeacherProfileService,
    // RoleService,
    // PermissionService,
  ],
})
export class UserModule {}
