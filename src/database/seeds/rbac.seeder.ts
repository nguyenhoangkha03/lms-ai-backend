import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseSeeder } from './base.seeder';
import { Role } from '@/modules/user/entities/role.entity';
import { Permission } from '@/modules/user/entities/permission.entity';
import { PermissionAction, PermissionResource } from '@/common/enums/user.enums';
import { WinstonLoggerService } from '@/logger/winston-logger.service';

@Injectable()
export class RBACSeeder extends BaseSeeder {
  constructor(dataSource: DataSource, logger: WinstonLoggerService) {
    super(dataSource, logger);
  }

  async run(): Promise<void> {
    this.logger.log('🔐 Running RBAC Seeder...');

    await this.seedPermissions();
    await this.seedRoles();
    await this.assignPermissionsToRoles();

    this.logger.log('✅ RBAC Seeder completed');
  }

  private async seedPermissions(): Promise<void> {
    const permissionRepository = await this.getRepository<Permission>(Permission);

    const permissions = [
      // User permissions
      {
        name: 'Create User',
        description: 'Create new users',
        resource: PermissionResource.USER,
        action: PermissionAction.CREATE,
        category: 'User Management',
        isSystemPermission: true,
      },
      {
        name: 'Read User',
        description: 'View user information',
        resource: PermissionResource.USER,
        action: PermissionAction.READ,
        category: 'User Management',
        isSystemPermission: true,
      },
      {
        name: 'Update User',
        description: 'Update user information',
        resource: PermissionResource.USER,
        action: PermissionAction.UPDATE,
        category: 'User Management',
        isSystemPermission: true,
      },
      {
        name: 'Delete User',
        description: 'Delete users',
        resource: PermissionResource.USER,
        action: PermissionAction.DELETE,
        category: 'User Management',
        isSystemPermission: true,
      },
      {
        name: 'Manage Users',
        description: 'Full user management access',
        resource: PermissionResource.USER,
        action: PermissionAction.MANAGE,
        category: 'User Management',
        isSystemPermission: true,
      },

      // Course permissions
      {
        name: 'Create Course',
        description: 'Create new courses',
        resource: PermissionResource.COURSE,
        action: PermissionAction.CREATE,
        category: 'Course Management',
        isSystemPermission: true,
      },
      {
        name: 'Read Course',
        description: 'View course information',
        resource: PermissionResource.COURSE,
        action: PermissionAction.READ,
        category: 'Course Management',
        isSystemPermission: true,
      },
      {
        name: 'Update Course',
        description: 'Update course information',
        resource: PermissionResource.COURSE,
        action: PermissionAction.UPDATE,
        category: 'Course Management',
        isSystemPermission: true,
      },
      {
        name: 'Delete Course',
        description: 'Delete courses',
        resource: PermissionResource.COURSE,
        action: PermissionAction.DELETE,
        category: 'Course Management',
        isSystemPermission: true,
      },
      {
        name: 'Manage Courses',
        description: 'Full course management access',
        resource: PermissionResource.COURSE,
        action: PermissionAction.MANAGE,
        category: 'Course Management',
        isSystemPermission: true,
      },

      // Lesson permissions
      {
        name: 'Create Lesson',
        description: 'Create new lessons',
        resource: PermissionResource.LESSON,
        action: PermissionAction.CREATE,
        category: 'Content Management',
        isSystemPermission: true,
      },
      {
        name: 'Read Lesson',
        description: 'View lesson content',
        resource: PermissionResource.LESSON,
        action: PermissionAction.READ,
        category: 'Content Management',
        isSystemPermission: true,
      },
      {
        name: 'Update Lesson',
        description: 'Update lesson content',
        resource: PermissionResource.LESSON,
        action: PermissionAction.UPDATE,
        category: 'Content Management',
        isSystemPermission: true,
      },
      {
        name: 'Delete Lesson',
        description: 'Delete lessons',
        resource: PermissionResource.LESSON,
        action: PermissionAction.DELETE,
        category: 'Content Management',
        isSystemPermission: true,
      },

      // Assessment permissions
      {
        name: 'Create Assessment',
        description: 'Create new assessments',
        resource: PermissionResource.ASSESSMENT,
        action: PermissionAction.CREATE,
        category: 'Assessment Management',
        isSystemPermission: true,
      },
      {
        name: 'Read Assessment',
        description: 'View assessment information',
        resource: PermissionResource.ASSESSMENT,
        action: PermissionAction.READ,
        category: 'Assessment Management',
        isSystemPermission: true,
      },
      {
        name: 'Update Assessment',
        description: 'Update assessment information',
        resource: PermissionResource.ASSESSMENT,
        action: PermissionAction.UPDATE,
        category: 'Assessment Management',
        isSystemPermission: true,
      },
      {
        name: 'Delete Assessment',
        description: 'Delete assessments',
        resource: PermissionResource.ASSESSMENT,
        action: PermissionAction.DELETE,
        category: 'Assessment Management',
        isSystemPermission: true,
      },

      // Grade permissions
      {
        name: 'Read Grade',
        description: 'View grades',
        resource: PermissionResource.GRADE,
        action: PermissionAction.READ,
        category: 'Grade Management',
        isSystemPermission: true,
      },
      {
        name: 'Update Grade',
        description: 'Update grades',
        resource: PermissionResource.GRADE,
        action: PermissionAction.UPDATE,
        category: 'Grade Management',
        isSystemPermission: true,
      },
      {
        name: 'Manage Grades',
        description: 'Full grade management access',
        resource: PermissionResource.GRADE,
        action: PermissionAction.MANAGE,
        category: 'Grade Management',
        isSystemPermission: true,
      },

      // Analytics permissions
      {
        name: 'Read Analytics',
        description: 'View analytics and reports',
        resource: PermissionResource.ANALYTICS,
        action: PermissionAction.READ,
        category: 'Analytics',
        isSystemPermission: true,
      },
      {
        name: 'Manage Analytics',
        description: 'Full analytics access',
        resource: PermissionResource.ANALYTICS,
        action: PermissionAction.MANAGE,
        category: 'Analytics',
        isSystemPermission: true,
      },

      // System permissions
      {
        name: 'Manage System',
        description: 'Full system administration access',
        resource: PermissionResource.SYSTEM,
        action: PermissionAction.MANAGE,
        category: 'System Administration',
        isSystemPermission: true,
      },
      {
        name: 'Super Admin',
        description: 'Complete access to all resources',
        resource: PermissionResource.ALL,
        action: PermissionAction.MANAGE,
        category: 'Super Administration',
        isSystemPermission: true,
      },
    ];

    await this.insertBatch(permissionRepository, permissions);
    this.logger.log(`📝 Created ${permissions.length} permissions`);
  }

  private async seedRoles(): Promise<void> {
    const roleRepository = await this.getRepository<Role>(Role);

    const roles = [
      {
        name: 'super_admin',
        displayName: 'Super Administrator',
        description: 'Complete access to all system features',
        isSystemRole: true,
        level: 0,
        color: '#dc2626',
        icon: 'crown',
      },
      {
        name: 'admin',
        displayName: 'Administrator',
        description: 'Administrative access to most system features',
        isSystemRole: true,
        level: 1,
        color: '#dc2626',
        icon: 'shield',
      },
      {
        name: 'teacher',
        displayName: 'Teacher',
        description: 'Course creation and student management access',
        isSystemRole: true,
        level: 2,
        color: '#2563eb',
        icon: 'academic-cap',
      },
      {
        name: 'student',
        displayName: 'Student',
        description: 'Course enrollment and learning access',
        isSystemRole: true,
        level: 3,
        color: '#16a34a',
        icon: 'user',
      },
      {
        name: 'moderator',
        displayName: 'Moderator',
        description: 'Content moderation and user support access',
        isSystemRole: true,
        level: 2,
        color: '#ca8a04',
        icon: 'eye',
      },
    ];

    await this.insertBatch(roleRepository, roles);
    this.logger.log(`👥 Created ${roles.length} roles`);
  }

  private async assignPermissionsToRoles(): Promise<void> {
    const roleRepository = await this.getRepository<Role>(Role);
    const permissionRepository = await this.getRepository<Permission>(Permission);

    // Get all roles and permissions
    const roles = await roleRepository.find();
    const permissions = await permissionRepository.find();

    // Helper function to find role and permissions
    const findRole = (name: string) => roles.find(role => role.name === name);
    const findPermissions = (criteria: Partial<Permission>) =>
      permissions.filter(permission =>
        Object.entries(criteria).every(([key, value]) => permission[key] === value),
      );

    // Super Admin - All permissions
    const superAdmin = findRole('super_admin');
    if (superAdmin) {
      superAdmin.permissions = permissions;
      await roleRepository.save(superAdmin);
    }

    // Admin - Most permissions except super admin
    const admin = findRole('admin');
    if (admin) {
      admin.permissions = permissions.filter(
        p => p.resource !== PermissionResource.ALL || p.action !== PermissionAction.MANAGE,
      );
      await roleRepository.save(admin);
    }

    // Teacher - Course, lesson, assessment, grade permissions
    const teacher = findRole('teacher');
    if (teacher) {
      teacher.permissions = [
        ...findPermissions({ resource: PermissionResource.COURSE }),
        ...findPermissions({ resource: PermissionResource.LESSON }),
        ...findPermissions({ resource: PermissionResource.ASSESSMENT }),
        ...findPermissions({ resource: PermissionResource.GRADE }),
        ...findPermissions({
          resource: PermissionResource.ANALYTICS,
          action: PermissionAction.READ,
        }),
        ...findPermissions({ resource: PermissionResource.USER, action: PermissionAction.READ }),
      ];
      await roleRepository.save(teacher);
    }

    // Student - Read permissions only
    const student = findRole('student');
    if (student) {
      student.permissions = [
        ...findPermissions({ resource: PermissionResource.COURSE, action: PermissionAction.READ }),
        ...findPermissions({ resource: PermissionResource.LESSON, action: PermissionAction.READ }),
        ...findPermissions({
          resource: PermissionResource.ASSESSMENT,
          action: PermissionAction.READ,
        }),
        ...findPermissions({ resource: PermissionResource.GRADE, action: PermissionAction.READ }),
      ];
      await roleRepository.save(student);
    }

    // Moderator - User and content management
    const moderator = findRole('moderator');
    if (moderator) {
      moderator.permissions = [
        ...findPermissions({ resource: PermissionResource.USER }),
        ...findPermissions({ resource: PermissionResource.COURSE, action: PermissionAction.READ }),
        ...findPermissions({
          resource: PermissionResource.COURSE,
          action: PermissionAction.UPDATE,
        }),
        ...findPermissions({ resource: PermissionResource.LESSON, action: PermissionAction.READ }),
        ...findPermissions({
          resource: PermissionResource.LESSON,
          action: PermissionAction.UPDATE,
        }),
      ];
      await roleRepository.save(moderator);
    }

    this.logger.log('🔗 Assigned permissions to roles');
  }
}
