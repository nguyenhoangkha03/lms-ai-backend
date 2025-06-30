import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateUserManagementTables1234567890000 implements MigrationInterface {
  name = 'CreateUserManagementTables1234567890000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users table
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid()',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'username',
            type: 'varchar',
            length: '50',
            isUnique: true,
          },
          {
            name: 'password_hash',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'first_name',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'last_name',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'display_name',
            type: 'varchar',
            length: '150',
            isNullable: true,
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'user_type',
            type: 'enum',
            enum: ['student', 'teacher', 'admin'],
            default: "'student'",
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'active', 'inactive', 'suspended', 'banned'],
            default: "'pending'",
          },
          {
            name: 'avatar_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'cover_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'email_verified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'email_verification_token',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'email_verification_expiry',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'two_factor_enabled',
            type: 'boolean',
            default: false,
          },
          {
            name: 'two_factor_secret',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'backup_codes',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'password_reset_token',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'password_reset_expiry',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'password_changed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'last_login_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'last_login_ip',
            type: 'varchar',
            length: '45',
            isNullable: true,
          },
          {
            name: 'failed_login_attempts',
            type: 'int',
            default: 0,
          },
          {
            name: 'locked_until',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'refresh_tokens',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'preferred_language',
            type: 'varchar',
            length: '10',
            isNullable: true,
          },
          {
            name: 'timezone',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'preferences',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_by',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'updated_by',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
        ],
      }),
    );

    // Create user_profiles table
    await queryRunner.createTable(
      new Table({
        name: 'user_profiles',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid()',
          },
          {
            name: 'user_id',
            type: 'varchar',
            length: '36',
            isUnique: true,
          },
          {
            name: 'bio',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'date_of_birth',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'gender',
            type: 'enum',
            enum: ['male', 'female', 'other', 'prefer_not_to_say'],
            isNullable: true,
          },
          {
            name: 'address',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'country_code',
            type: 'varchar',
            length: '3',
            isNullable: true,
          },
          {
            name: 'country',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'state',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'city',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'city_code',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'postal_code',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'timezone',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'language_preference',
            type: 'varchar',
            length: '10',
            isNullable: true,
          },
          {
            name: 'organization',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'job_title',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'department',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'website',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'interests',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'skills',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'hobbies',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'is_public',
            type: 'boolean',
            default: true,
          },
          {
            name: 'is_searchable',
            type: 'boolean',
            default: true,
          },
          {
            name: 'is_verified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'verified_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'verified_by',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_by',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'updated_by',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
        ],
      }),
    );

    // Create student_profiles table
    await queryRunner.createTable(
      new Table({
        name: 'student_profiles',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid()',
          },
          {
            name: 'user_id',
            type: 'varchar',
            length: '36',
            isUnique: true,
          },
          {
            name: 'student_code',
            type: 'varchar',
            length: '20',
            isUnique: true,
          },
          {
            name: 'education_level',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'field_of_study',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'institution',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'graduation_year',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'gpa',
            type: 'decimal',
            precision: 3,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'learning_goals',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'preferred_learning_style',
            type: 'enum',
            enum: ['visual', 'auditory', 'reading', 'kinesthetic'],
            isNullable: true,
          },
          {
            name: 'study_time_preference',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'difficulty_preference',
            type: 'enum',
            enum: ['beginner', 'intermediate', 'advanced'],
            default: "'beginner'",
          },
          {
            name: 'motivation_factors',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'total_courses_enrolled',
            type: 'int',
            default: 0,
          },
          {
            name: 'total_courses_completed',
            type: 'int',
            default: 0,
          },
          {
            name: 'total_certificates',
            type: 'int',
            default: 0,
          },
          {
            name: 'total_study_hours',
            type: 'int',
            default: 0,
          },
          {
            name: 'average_grade',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0,
          },
          {
            name: 'achievement_points',
            type: 'int',
            default: 0,
          },
          {
            name: 'achievement_level',
            type: 'varchar',
            length: '50',
            default: "'Bronze'",
          },
          {
            name: 'badges',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'learning_preferences',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'study_schedule',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'analytics_data',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'enable_ai_recommendations',
            type: 'boolean',
            default: true,
          },
          {
            name: 'enable_progress_tracking',
            type: 'boolean',
            default: true,
          },
          {
            name: 'parental_consent',
            type: 'boolean',
            default: false,
          },
          {
            name: 'parent_contact',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'enrollment_date',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'last_activity_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_by',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'updated_by',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
        ],
      }),
    );

    // Create teacher_profiles table
    await queryRunner.createTable(
      new Table({
        name: 'teacher_profiles',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid()',
          },
          {
            name: 'user_id',
            type: 'varchar',
            length: '36',
            isUnique: true,
          },
          {
            name: 'teacher_code',
            type: 'varchar',
            length: '20',
            isUnique: true,
          },
          {
            name: 'specializations',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'qualifications',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'years_experience',
            type: 'int',
            default: 0,
          },
          {
            name: 'teaching_style',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'office_hours',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'rating',
            type: 'decimal',
            precision: 3,
            scale: 2,
            default: 0,
          },
          {
            name: 'total_ratings',
            type: 'int',
            default: 0,
          },
          {
            name: 'total_students',
            type: 'int',
            default: 0,
          },
          {
            name: 'total_courses',
            type: 'int',
            default: 0,
          },
          {
            name: 'total_lessons',
            type: 'int',
            default: 0,
          },
          {
            name: 'total_teaching_hours',
            type: 'int',
            default: 0,
          },
          {
            name: 'total_earnings',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'is_approved',
            type: 'boolean',
            default: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'is_featured',
            type: 'boolean',
            default: false,
          },
          {
            name: 'is_verified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'approved_by',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'approved_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'approval_notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'license_number',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'affiliations',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'subjects',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'teaching_languages',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'availability',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'hourly_rate',
            type: 'decimal',
            precision: 8,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '3',
            default: "'USD'",
          },
          {
            name: 'awards',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'publications',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'professional_summary',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'resume_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'portfolio_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'accepting_students',
            type: 'boolean',
            default: false,
          },
          {
            name: 'max_students_per_class',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'allow_reviews',
            type: 'boolean',
            default: true,
          },
          {
            name: 'email_notifications',
            type: 'boolean',
            default: true,
          },
          {
            name: 'application_date',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'last_teaching_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_by',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'updated_by',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
        ],
      }),
    );

    // Create user_socials table
    await queryRunner.createTable(
      new Table({
        name: 'user_socials',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid()',
          },
          {
            name: 'user_id',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'platform',
            type: 'enum',
            enum: [
              'facebook',
              'twitter',
              'linkedin',
              'instagram',
              'youtube',
              'github',
              'personal_website',
            ],
          },
          {
            name: 'url',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'handle',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'display_name',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'is_public',
            type: 'boolean',
            default: true,
          },
          {
            name: 'is_verified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'display_order',
            type: 'int',
            default: 0,
          },
          {
            name: 'custom_label',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_by',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'updated_by',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
        ],
      }),
    );

    // Create roles table
    await queryRunner.createTable(
      new Table({
        name: 'roles',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isUnique: true,
          },
          {
            name: 'description',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'display_name',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'is_system_role',
            type: 'boolean',
            default: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'level',
            type: 'int',
            default: 0,
          },
          {
            name: 'color',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'icon',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'settings',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_by',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'updated_by',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
        ],
      }),
    );

    // Create permissions table
    await queryRunner.createTable(
      new Table({
        name: 'permissions',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'description',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'resource',
            type: 'enum',
            enum: ['user', 'course', 'lesson', 'assessment', 'grade', 'analytics', 'system', '*'],
          },
          {
            name: 'action',
            type: 'enum',
            enum: ['create', 'read', 'update', 'delete', 'manage'],
          },
          {
            name: 'conditions',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'is_system_permission',
            type: 'boolean',
            default: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'category',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'priority',
            type: 'int',
            default: 0,
          },
          {
            name: 'settings',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_by',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'updated_by',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
        ],
      }),
    );

    // Create user_roles junction table
    await queryRunner.createTable(
      new Table({
        name: 'user_roles',
        columns: [
          {
            name: 'user_id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'role_id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
        ],
      }),
    );

    // Create user_permissions junction table
    await queryRunner.createTable(
      new Table({
        name: 'user_permissions',
        columns: [
          {
            name: 'user_id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'permission_id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
        ],
      }),
    );

    // Create role_permissions junction table
    await queryRunner.createTable(
      new Table({
        name: 'role_permissions',
        columns: [
          {
            name: 'role_id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'permission_id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
        ],
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_users_email',
        columnNames: ['email'],
      }),
    );
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_users_username',
        columnNames: ['username'],
      }),
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_users_user_type_status',
        columnNames: ['user_type', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_users_created_at',
        columnNames: ['created_at'],
      }),
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_users_last_login_at',
        columnNames: ['last_login_at'],
      }),
    );

    await queryRunner.createIndex(
      'user_profiles',
      new TableIndex({
        name: 'IDX_user_profiles_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'user_profiles',
      new TableIndex({
        name: 'IDX_user_profiles_country_city',
        columnNames: ['country_code', 'city_code'],
      }),
    );

    await queryRunner.createIndex(
      'student_profiles',
      new TableIndex({
        name: 'IDX_student_profiles_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'student_profiles',
      new TableIndex({
        name: 'IDX_student_profiles_student_code',
        columnNames: ['student_code'],
      }),
    );

    await queryRunner.createIndex(
      'student_profiles',
      new TableIndex({
        name: 'IDX_student_profiles_education',
        columnNames: ['education_level', 'field_of_study'],
      }),
    );

    await queryRunner.createIndex(
      'student_profiles',
      new TableIndex({
        name: 'IDX_student_profiles_enrollment_date',
        columnNames: ['enrollment_date'],
      }),
    );

    await queryRunner.createIndex(
      'teacher_profiles',
      new TableIndex({
        name: 'IDX_teacher_profiles_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'teacher_profiles',
      new TableIndex({
        name: 'IDX_teacher_profiles_teacher_code',
        columnNames: ['teacher_code'],
      }),
    );

    await queryRunner.createIndex(
      'teacher_profiles',
      new TableIndex({
        name: 'IDX_teacher_profiles_approved_active',
        columnNames: ['is_approved', 'is_active'],
      }),
    );

    await queryRunner.createIndex(
      'teacher_profiles',
      new TableIndex({
        name: 'IDX_teacher_profiles_rating',
        columnNames: ['rating'],
      }),
    );

    await queryRunner.createIndex(
      'user_socials',
      new TableIndex({
        name: 'IDX_user_socials_user_platform',
        columnNames: ['user_id', 'platform'],
      }),
    );

    await queryRunner.createIndex(
      'user_socials',
      new TableIndex({
        name: 'IDX_user_socials_platform',
        columnNames: ['platform'],
      }),
    );

    await queryRunner.createIndex(
      'user_socials',
      new TableIndex({
        name: 'IDX_user_socials_is_public',
        columnNames: ['is_public'],
      }),
    );

    await queryRunner.createIndex(
      'roles',
      new TableIndex({
        name: 'IDX_roles_name',
        columnNames: ['name'],
      }),
    );

    await queryRunner.createIndex(
      'roles',
      new TableIndex({
        name: 'IDX_roles_is_system_role',
        columnNames: ['is_system_role'],
      }),
    );

    await queryRunner.createIndex(
      'roles',
      new TableIndex({
        name: 'IDX_roles_is_active',
        columnNames: ['is_active'],
      }),
    );

    // ===== PERMISSIONS =====
    await queryRunner.createIndex(
      'permissions',
      new TableIndex({
        name: 'IDX_permissions_resource_action',
        columnNames: ['resource', 'action'],
      }),
    );

    await queryRunner.createIndex(
      'permissions',
      new TableIndex({
        name: 'IDX_permissions_resource',
        columnNames: ['resource'],
      }),
    );

    await queryRunner.createIndex(
      'permissions',
      new TableIndex({
        name: 'IDX_permissions_action',
        columnNames: ['action'],
      }),
    );

    await queryRunner.createIndex(
      'permissions',
      new TableIndex({
        name: 'IDX_permissions_is_system_permission',
        columnNames: ['is_system_permission'],
      }),
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'user_profiles',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'student_profiles',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // teacher_profiles → users
    await queryRunner.createForeignKey(
      'teacher_profiles',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // user_socials → users
    await queryRunner.createForeignKey(
      'user_socials',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // user_roles → users
    await queryRunner.createForeignKey(
      'user_roles',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'user_roles',
      new TableForeignKey({
        columnNames: ['role_id'],
        referencedTableName: 'roles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // user_permissions → users
    await queryRunner.createForeignKey(
      'user_permissions',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // user_permissions → permissions
    await queryRunner.createForeignKey(
      'user_permissions',
      new TableForeignKey({
        columnNames: ['permission_id'],
        referencedTableName: 'permissions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // role_permissions → roles
    await queryRunner.createForeignKey(
      'role_permissions',
      new TableForeignKey({
        columnNames: ['role_id'],
        referencedTableName: 'roles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'role_permissions',
      new TableForeignKey({
        columnNames: ['permission_id'],
        referencedTableName: 'permissions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    const userProfileTable = await queryRunner.getTable('user_profiles');
    const studentProfileTable = await queryRunner.getTable('student_profiles');
    const teacherProfileTable = await queryRunner.getTable('teacher_profiles');
    const userSocialsTable = await queryRunner.getTable('user_socials');
    const userRolesTable = await queryRunner.getTable('user_roles');
    const userPermissionsTable = await queryRunner.getTable('user_permissions');
    const rolePermissionsTable = await queryRunner.getTable('role_permissions');
    if (userProfileTable) {
      const foreignKeys = userProfileTable.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('user_profiles', foreignKey);
      }
    }

    if (studentProfileTable) {
      const foreignKeys = studentProfileTable.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('student_profiles', foreignKey);
      }
    }

    if (teacherProfileTable) {
      const foreignKeys = teacherProfileTable.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('teacher_profiles', foreignKey);
      }
    }

    if (userSocialsTable) {
      const foreignKeys = userSocialsTable.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('user_socials', foreignKey);
      }
    }

    if (userRolesTable) {
      const foreignKeys = userRolesTable.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('user_roles', foreignKey);
      }
    }

    if (userPermissionsTable) {
      const foreignKeys = userPermissionsTable.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('user_permissions', foreignKey);
      }
    }

    if (rolePermissionsTable) {
      const foreignKeys = rolePermissionsTable.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('role_permissions', foreignKey);
      }
    }

    // Drop tables
    await queryRunner.dropTable('role_permissions');
    await queryRunner.dropTable('user_permissions');
    await queryRunner.dropTable('user_roles');
    await queryRunner.dropTable('permissions');
    await queryRunner.dropTable('roles');
    await queryRunner.dropTable('user_socials');
    await queryRunner.dropTable('teacher_profiles');
    await queryRunner.dropTable('student_profiles');
    await queryRunner.dropTable('user_profiles');
    await queryRunner.dropTable('users');
  }
}
