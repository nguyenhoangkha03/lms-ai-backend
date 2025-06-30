import { Module } from '@nestjs/common';
import { UserService } from './services/user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserProfile } from './entities/user-profile.entity';
import { StudentProfile } from './entities/student-profile.entity';
import { TeacherProfile } from './entities/teacher-profile.entity';
import { UserSocial } from './entities/user-social.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { CustomCacheModule } from '@/cache/cache.module';

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
  ],
  controllers: [
    UserController,
    // ProfileController, RoleController
  ],
  providers: [
    UserService,
    // UserProfileService,
    // StudentProfileService,
    // TeacherProfileService,
    // RoleService,
    // PermissionService,
  ],
  exports: [
    UserService,
    // UserProfileService,
    // StudentProfileService,
    // TeacherProfileService,
    // RoleService,
    // PermissionService,
  ],
})
export class UserModule {}
