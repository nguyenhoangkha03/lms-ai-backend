import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateCourseManagementTables1234567890001 implements MigrationInterface {
  name = 'CreateCourseManagementTables1234567890001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create categories table
    await queryRunner.createTable(
      new Table({
        name: 'categories',
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
            length: '255',
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'icon_url',
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
            name: 'color',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'order_index',
            type: 'int',
            default: 0,
          },
          {
            name: 'level',
            type: 'int',
            default: 0,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'show_in_menu',
            type: 'boolean',
            default: true,
          },
          {
            name: 'is_featured',
            type: 'boolean',
            default: false,
          },
          {
            name: 'course_count',
            type: 'int',
            default: 0,
          },
          {
            name: 'parent_id',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'seo_meta',
            type: 'json',
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

    // Create courses table
    await queryRunner.createTable(
      new Table({
        name: 'courses',
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
            name: 'title',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'short_description',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'thumbnail_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'trailer_video_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'teacher_id',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'category_id',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'level',
            type: 'enum',
            enum: ['beginner', 'intermediate', 'advanced', 'expert', 'all_levels'],
            default: "'beginner'",
          },
          {
            name: 'language',
            type: 'enum',
            enum: ['en', 'vi', 'es', 'fr', 'de', 'zh', 'ja', 'ko'],
            default: "'en'",
          },
          {
            name: 'duration_hours',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'duration_minutes',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'price',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '3',
            default: "'USD'",
          },
          {
            name: 'original_price',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'is_free',
            type: 'boolean',
            default: false,
          },
          {
            name: 'pricing_model',
            type: 'enum',
            enum: ['free', 'paid', 'subscription', 'freemium'],
            default: "'free'",
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['draft', 'under_review', 'published', 'archived', 'suspended'],
            default: "'draft'",
          },
          {
            name: 'enrollment_limit',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'tags',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'requirements',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'what_you_will_learn',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'target_audience',
            type: 'json',
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
            name: 'total_enrollments',
            type: 'int',
            default: 0,
          },
          {
            name: 'total_completions',
            type: 'int',
            default: 0,
          },
          {
            name: 'total_reviews',
            type: 'int',
            default: 0,
          },
          {
            name: 'total_sections',
            type: 'int',
            default: 0,
          },
          {
            name: 'total_lessons',
            type: 'int',
            default: 0,
          },
          {
            name: 'total_video_duration',
            type: 'int',
            default: 0,
          },
          {
            name: 'featured',
            type: 'boolean',
            default: false,
          },
          {
            name: 'bestseller',
            type: 'boolean',
            default: false,
          },
          {
            name: 'is_new',
            type: 'boolean',
            default: false,
          },
          {
            name: 'allow_reviews',
            type: 'boolean',
            default: true,
          },
          {
            name: 'allow_discussions',
            type: 'boolean',
            default: true,
          },
          {
            name: 'has_certificate',
            type: 'boolean',
            default: false,
          },
          {
            name: 'lifetime_access',
            type: 'boolean',
            default: false,
          },
          {
            name: 'access_duration',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'published_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'last_updated_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'seo_meta',
            type: 'json',
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

    // Create course_sections table
    await queryRunner.createTable(
      new Table({
        name: 'course_sections',
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
            name: 'course_id',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'order_index',
            type: 'int',
            default: 0,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'is_required',
            type: 'boolean',
            default: false,
          },
          {
            name: 'total_lessons',
            type: 'int',
            default: 0,
          },
          {
            name: 'total_duration',
            type: 'int',
            default: 0,
          },
          {
            name: 'available_from',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'available_until',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'objectives',
            type: 'json',
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

    // Create lessons table
    await queryRunner.createTable(
      new Table({
        name: 'lessons',
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
            name: 'course_id',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'section_id',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'content',
            type: 'longtext',
            isNullable: true,
          },
          {
            name: 'video_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'video_duration',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'audio_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'attachments',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'lesson_type',
            type: 'enum',
            enum: [
              'video',
              'text',
              'audio',
              'interactive',
              'quiz',
              'assignment',
              'live_session',
              'download',
            ],
            default: "'text'",
          },
          {
            name: 'order_index',
            type: 'int',
            default: 0,
          },
          {
            name: 'is_preview',
            type: 'boolean',
            default: false,
          },
          {
            name: 'is_mandatory',
            type: 'boolean',
            default: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'estimated_duration',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'points',
            type: 'int',
            default: 0,
          },
          {
            name: 'available_from',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'available_until',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'objectives',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'prerequisites',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'interactive_elements',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'thumbnail_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'transcript',
            type: 'json',
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

    // Create file_uploads table
    await queryRunner.createTable(
      new Table({
        name: 'file_uploads',
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
            name: 'uploader_id',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'original_name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'stored_name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'file_path',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'file_url',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'file_size',
            type: 'bigint',
          },
          {
            name: 'mime_type',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'file_type',
            type: 'enum',
            enum: ['image', 'video', 'audio', 'document', 'archive', 'other'],
          },
          {
            name: 'related_type',
            type: 'enum',
            enum: [
              'course_thumbnail',
              'course_trailer',
              'lesson_video',
              'lesson_attachment',
              'user_avatar',
              'user_cover',
              'assignment_submission',
              'certificate',
            ],
          },
          {
            name: 'related_id',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'is_public',
            type: 'boolean',
            default: false,
          },
          {
            name: 'is_temporary',
            type: 'boolean',
            default: false,
          },
          {
            name: 'extension',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'file_hash',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'download_count',
            type: 'int',
            default: 0,
          },
          {
            name: 'last_accessed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'expires_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'alt_text',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'tags',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'uploaded_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'additional_metadata',
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

    // Create enrollments table
    await queryRunner.createTable(
      new Table({
        name: 'enrollments',
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
            name: 'student_id',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'course_id',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'enrollment_date',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'completion_date',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['enrolled', 'in_progress', 'completed', 'dropped', 'paused'],
            default: "'enrolled'",
          },
          {
            name: 'progress_percentage',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0,
          },
          {
            name: 'last_accessed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'payment_status',
            type: 'enum',
            enum: ['pending', 'paid', 'failed', 'refunded', 'cancelled'],
            default: "'pending'",
          },
          {
            name: 'payment_amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'payment_currency',
            type: 'varchar',
            length: '3',
            default: "'USD'",
          },
          {
            name: 'payment_transaction_id',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'payment_date',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'certificate_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'certificate_issued_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'rating',
            type: 'decimal',
            precision: 3,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'review',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'review_date',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'total_time_spent',
            type: 'int',
            default: 0,
          },
          {
            name: 'lessons_completed',
            type: 'int',
            default: 0,
          },
          {
            name: 'total_lessons',
            type: 'int',
            default: 0,
          },
          {
            name: 'access_expires_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'source',
            type: 'json',
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

    // Create lesson_progress table
    await queryRunner.createTable(
      new Table({
        name: 'lesson_progress',
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
            name: 'student_id',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'lesson_id',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'enrollment_id',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['not_started', 'in_progress', 'completed', 'skipped'],
            default: "'not_started'",
          },
          {
            name: 'completion_date',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'time_spent',
            type: 'int',
            default: 0,
          },
          {
            name: 'last_position',
            type: 'int',
            default: 0,
          },
          {
            name: 'attempts',
            type: 'int',
            default: 0,
          },
          {
            name: 'score',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'max_score',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'progress_percentage',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0,
          },
          {
            name: 'first_accessed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'last_accessed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'answers',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'bookmarks',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'interaction_data',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'is_skipped',
            type: 'boolean',
            default: false,
          },
          {
            name: 'feedback',
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

    // Create indexes
    await queryRunner.createIndex(
      'categories',
      new TableIndex({
        name: 'IDX_categories_slug',
        columnNames: ['slug'],
      }),
    );
    await queryRunner.createIndex(
      'categories',
      new TableIndex({
        name: 'IDX_categories_parent_id',
        columnNames: ['parent_id'],
      }),
    );
    await queryRunner.createIndex(
      'categories',
      new TableIndex({
        name: 'IDX_categories_active_order',
        columnNames: ['is_active', 'order_index'],
      }),
    );
    await queryRunner.createIndex(
      'categories',
      new TableIndex({
        name: 'IDX_categories_level',
        columnNames: ['level'],
      }),
    );

    await queryRunner.createIndex(
      'courses',
      new TableIndex({
        name: 'IDX_courses_slug',
        columnNames: ['slug'],
      }),
    );
    await queryRunner.createIndex(
      'courses',
      new TableIndex({
        name: 'IDX_courses_teacher_id',
        columnNames: ['teacher_id'],
      }),
    );
    await queryRunner.createIndex(
      'courses',
      new TableIndex({
        name: 'IDX_courses_category_id',
        columnNames: ['category_id'],
      }),
    );
    await queryRunner.createIndex(
      'courses',
      new TableIndex({
        name: 'IDX_courses_level_status',
        columnNames: ['level', 'status'],
      }),
    );
    await queryRunner.createIndex(
      'courses',
      new TableIndex({
        name: 'IDX_courses_price_free',
        columnNames: ['price', 'is_free'],
      }),
    );
    await queryRunner.createIndex(
      'courses',
      new TableIndex({
        name: 'IDX_courses_rating_enrollments',
        columnNames: ['rating', 'total_enrollments'],
      }),
    );
    await queryRunner.createIndex(
      'courses',
      new TableIndex({
        name: 'IDX_courses_published_at',
        columnNames: ['published_at'],
      }),
    );
    await queryRunner.createIndex(
      'courses',
      new TableIndex({
        name: 'IDX_courses_featured_status',
        columnNames: ['featured', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'course_sections',
      new TableIndex({
        name: 'IDX_course_sections_course_id',
        columnNames: ['course_id'],
      }),
    );
    await queryRunner.createIndex(
      'course_sections',
      new TableIndex({
        name: 'IDX_course_sections_order_index',
        columnNames: ['order_index'],
      }),
    );
    await queryRunner.createIndex(
      'course_sections',
      new TableIndex({
        name: 'IDX_course_sections_is_active',
        columnNames: ['is_active'],
      }),
    );

    await queryRunner.createIndex(
      'lessons',
      new TableIndex({
        name: 'IDX_lessons_course_id',
        columnNames: ['course_id'],
      }),
    );
    await queryRunner.createIndex(
      'lessons',
      new TableIndex({
        name: 'IDX_lessons_section_id',
        columnNames: ['section_id'],
      }),
    );
    await queryRunner.createIndex(
      'lessons',
      new TableIndex({
        name: 'IDX_lessons_slug',
        columnNames: ['slug'],
      }),
    );
    await queryRunner.createIndex(
      'lessons',
      new TableIndex({
        name: 'IDX_lessons_order_index',
        columnNames: ['order_index'],
      }),
    );
    await queryRunner.createIndex(
      'lessons',
      new TableIndex({
        name: 'IDX_lessons_lesson_type',
        columnNames: ['lesson_type'],
      }),
    );
    await queryRunner.createIndex(
      'lessons',
      new TableIndex({
        name: 'IDX_lessons_is_preview',
        columnNames: ['is_preview'],
      }),
    );

    await queryRunner.createIndex(
      'file_uploads',
      new TableIndex({
        name: 'IDX_file_uploads_uploader_id',
        columnNames: ['uploader_id'],
      }),
    );
    await queryRunner.createIndex(
      'file_uploads',
      new TableIndex({
        name: 'IDX_file_uploads_file_type',
        columnNames: ['file_type'],
      }),
    );
    await queryRunner.createIndex(
      'file_uploads',
      new TableIndex({
        name: 'IDX_file_uploads_related_type',
        columnNames: ['related_type'],
      }),
    );
    await queryRunner.createIndex(
      'file_uploads',
      new TableIndex({
        name: 'IDX_file_uploads_related_id',
        columnNames: ['related_id'],
      }),
    );
    await queryRunner.createIndex(
      'file_uploads',
      new TableIndex({
        name: 'IDX_file_uploads_is_public',
        columnNames: ['is_public'],
      }),
    );
    await queryRunner.createIndex(
      'file_uploads',
      new TableIndex({
        name: 'IDX_file_uploads_uploaded_at',
        columnNames: ['uploaded_at'],
      }),
    );

    await queryRunner.createIndex(
      'enrollments',
      new TableIndex({
        name: 'IDX_enrollments_student_course',
        columnNames: ['student_id', 'course_id'],
      }),
    );
    await queryRunner.createIndex(
      'enrollments',
      new TableIndex({
        name: 'IDX_enrollments_student_id',
        columnNames: ['student_id'],
      }),
    );
    await queryRunner.createIndex(
      'enrollments',
      new TableIndex({
        name: 'IDX_enrollments_course_id',
        columnNames: ['course_id'],
      }),
    );
    await queryRunner.createIndex(
      'enrollments',
      new TableIndex({
        name: 'IDX_enrollments_status',
        columnNames: ['status'],
      }),
    );
    await queryRunner.createIndex(
      'enrollments',
      new TableIndex({
        name: 'IDX_enrollments_enrollment_date',
        columnNames: ['enrollment_date'],
      }),
    );
    await queryRunner.createIndex(
      'enrollments',
      new TableIndex({
        name: 'IDX_enrollments_payment_status',
        columnNames: ['payment_status'],
      }),
    );

    await queryRunner.createIndex(
      'lesson_progress',
      new TableIndex({
        name: 'IDX_lesson_progress_student_lesson',
        columnNames: ['student_id', 'lesson_id'],
      }),
    );
    await queryRunner.createIndex(
      'lesson_progress',
      new TableIndex({
        name: 'IDX_lesson_progress_student_id',
        columnNames: ['student_id'],
      }),
    );
    await queryRunner.createIndex(
      'lesson_progress',
      new TableIndex({
        name: 'IDX_lesson_progress_lesson_id',
        columnNames: ['lesson_id'],
      }),
    );
    await queryRunner.createIndex(
      'lesson_progress',
      new TableIndex({
        name: 'IDX_lesson_progress_enrollment_id',
        columnNames: ['enrollment_id'],
      }),
    );
    await queryRunner.createIndex(
      'lesson_progress',
      new TableIndex({
        name: 'IDX_lesson_progress_status',
        columnNames: ['status'],
      }),
    );
    await queryRunner.createIndex(
      'lesson_progress',
      new TableIndex({
        name: 'IDX_lesson_progress_completion_date',
        columnNames: ['completion_date'],
      }),
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'categories',
      new TableForeignKey({
        columnNames: ['parent_id'],
        referencedTableName: 'categories',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'courses',
      new TableForeignKey({
        columnNames: ['teacher_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'courses',
      new TableForeignKey({
        columnNames: ['category_id'],
        referencedTableName: 'categories',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'course_sections',
      new TableForeignKey({
        columnNames: ['course_id'],
        referencedTableName: 'courses',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'lessons',
      new TableForeignKey({
        columnNames: ['course_id'],
        referencedTableName: 'courses',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'lessons',
      new TableForeignKey({
        columnNames: ['section_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'course_sections',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'file_uploads',
      new TableForeignKey({
        columnNames: ['uploader_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'enrollments',
      new TableForeignKey({
        columnNames: ['student_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'enrollments',
      new TableForeignKey({
        columnNames: ['course_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'courses',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'lesson_progress',
      new TableForeignKey({
        columnNames: ['student_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'lesson_progress',
      new TableForeignKey({
        columnNames: ['lesson_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'lessons',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'lesson_progress',
      new TableForeignKey({
        columnNames: ['enrollment_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'enrollments',
        onDelete: 'CASCADE',
      }),
    );

    // Create unique constraints
    await queryRunner.query(
      'ALTER TABLE enrollments ADD CONSTRAINT UQ_enrollments_student_course UNIQUE (student_id, course_id)',
    );
    await queryRunner.query(
      'ALTER TABLE lesson_progress ADD CONSTRAINT UQ_lesson_progress_student_lesson UNIQUE (student_id, lesson_id)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    const tables = [
      'lesson_progress',
      'enrollments',
      'file_uploads',
      'lessons',
      'course_sections',
      'courses',
      'categories',
    ];
    for (const tableName of tables) {
      const table = await queryRunner.getTable(tableName);
      if (table) {
        const foreignKeys = table.foreignKeys;
        for (const foreignKey of foreignKeys) {
          await queryRunner.dropForeignKey(tableName, foreignKey);
        }
      }
    }

    // Drop tables in reverse order
    await queryRunner.dropTable('lesson_progress');
    await queryRunner.dropTable('enrollments');
    await queryRunner.dropTable('file_uploads');
    await queryRunner.dropTable('lessons');
    await queryRunner.dropTable('course_sections');
    await queryRunner.dropTable('courses');
    await queryRunner.dropTable('categories');
  }
}
