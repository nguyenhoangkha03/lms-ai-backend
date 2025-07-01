import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateAssessmentAnalyticsTables1234567890003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create assessments table
    await queryRunner.createTable(
      new Table({
        name: 'assessments',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'courseId',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'lessonId',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'teacherId',
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
            type: 'varchar',
            length: '500',
          },
          {
            name: 'instructions',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'assessmentType',
            type: 'enum',
            enum: [
              'quiz',
              'exam',
              'assignment',
              'survey',
              'practice',
              'final_exam',
              'midterm',
              'project',
            ],
            default: "'quiz'",
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['draft', 'published', 'archived', 'suspended'],
            default: "'draft'",
          },
          {
            name: 'timeLimit',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'maxAttempts',
            type: 'int',
            default: 1,
          },
          {
            name: 'passingScore',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 70.0,
          },
          {
            name: 'totalPoints',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'randomizeQuestions',
            type: 'boolean',
            default: false,
          },
          {
            name: 'randomizeAnswers',
            type: 'boolean',
            default: false,
          },
          {
            name: 'showResults',
            type: 'boolean',
            default: true,
          },
          {
            name: 'showCorrectAnswers',
            type: 'boolean',
            default: false,
          },
          {
            name: 'isMandatory',
            type: 'boolean',
            default: false,
          },
          {
            name: 'isProctored',
            type: 'boolean',
            default: false,
          },
          {
            name: 'availableFrom',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'availableUntil',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'gradingMethod',
            type: 'enum',
            enum: ['automatic', 'manual', 'hybrid', 'peer_review'],
            default: "'automatic'",
          },
          {
            name: 'weight',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 1.0,
          },
          {
            name: 'settings',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'antiCheatSettings',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          new TableIndex({
            name: 'IDX_attempts_studentId',
            columnNames: ['studentId'],
          }),
          new TableIndex({
            name: 'IDX_attempts_assessmentId',
            columnNames: ['assessmentId'],
          }),
          new TableIndex({
            name: 'IDX_attempts_number',
            columnNames: ['attemptNumber'],
          }),
          new TableIndex({
            name: 'IDX_attempts_status',
            columnNames: ['status'],
          }),
          new TableIndex({
            name: 'IDX_attempts_grading',
            columnNames: ['gradingStatus'],
          }),
          new TableIndex({
            name: 'IDX_attempts_submitted',
            columnNames: ['submittedAt'],
          }),
        ],
      }),
      true,
    );

    // Create learning_activities table
    await queryRunner.createTable(
      new Table({
        name: 'learning_activities',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'studentId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'courseId',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'lessonId',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'assessmentId',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'activityType',
            type: 'enum',
            enum: [
              'login',
              'logout',
              'course_view',
              'lesson_start',
              'lesson_complete',
              'lesson_progress',
              'video_play',
              'video_pause',
              'video_seek',
              'video_complete',
              'quiz_start',
              'quiz_submit',
              'quiz_complete',
              'assignment_start',
              'assignment_submit',
              'discussion_post',
              'chat_message',
              'file_download',
              'search',
              'bookmark_add',
              'note_create',
              'help_request',
              'course_complete',
              'certificate_earn',
            ],
          },
          {
            name: 'sessionId',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'timestamp',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'duration',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'ipAddress',
            type: 'varchar',
            length: '45',
            isNullable: true,
          },
          {
            name: 'userAgent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'deviceType',
            type: 'enum',
            enum: ['desktop', 'tablet', 'mobile', 'unknown'],
            isNullable: true,
          },
          {
            name: 'browser',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'operatingSystem',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'screenResolution',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'timezone',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'location',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'trackingData',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          new TableIndex({
            name: 'IDX_activities_studentId',
            columnNames: ['studentId'],
          }),
          new TableIndex({
            name: 'IDX_activities_courseId',
            columnNames: ['courseId'],
          }),
          new TableIndex({
            name: 'IDX_activities_lessonId',
            columnNames: ['lessonId'],
          }),
          new TableIndex({
            name: 'IDX_activities_type',
            columnNames: ['activityType'],
          }),
          new TableIndex({
            name: 'IDX_activities_session',
            columnNames: ['sessionId'],
          }),
          new TableIndex({
            name: 'IDX_activities_timestamp',
            columnNames: ['timestamp'],
          }),
          new TableIndex({
            name: 'IDX_activities_student_course_time',
            columnNames: ['studentId', 'courseId', 'timestamp'],
          }),
        ],
      }),
      true,
    );

    // Create learning_sessions table
    await queryRunner.createTable(
      new Table({
        name: 'learning_sessions',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'studentId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'sessionId',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'startTime',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'endTime',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'duration',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'completed', 'abandoned', 'timed_out'],
            default: "'active'",
          },
          {
            name: 'pageViews',
            type: 'int',
            default: 0,
          },
          {
            name: 'activitiesCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'coursesAccessed',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'lessonsAccessed',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'assessmentsTaken',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'deviceType',
            type: 'enum',
            enum: ['desktop', 'tablet', 'mobile', 'unknown'],
            isNullable: true,
          },
          {
            name: 'browser',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'operatingSystem',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'ipAddress',
            type: 'varchar',
            length: '45',
            isNullable: true,
          },
          {
            name: 'location',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'engagementMetrics',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'learningOutcomes',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'qualityIndicators',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          new TableIndex({
            name: 'IDX_sessions_studentId',
            columnNames: ['studentId'],
          }),
          new TableIndex({
            name: 'IDX_sessions_sessionId',
            columnNames: ['sessionId'],
          }),
          new TableIndex({
            name: 'IDX_sessions_start',
            columnNames: ['startTime'],
          }),
          new TableIndex({
            name: 'IDX_sessions_end',
            columnNames: ['endTime'],
          }),
          new TableIndex({
            name: 'IDX_sessions_duration',
            columnNames: ['duration'],
          }),
          new TableIndex({
            name: 'IDX_sessions_status',
            columnNames: ['status'],
          }),
        ],
      }),
      true,
    );

    // Create learning_analytics table
    await queryRunner.createTable(
      new Table({
        name: 'learning_analytics',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'studentId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'courseId',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'date',
            type: 'date',
          },
          {
            name: 'totalTimeSpent',
            type: 'int',
            default: 0,
          },
          {
            name: 'lessonsCompleted',
            type: 'int',
            default: 0,
          },
          {
            name: 'quizzesAttempted',
            type: 'int',
            default: 0,
          },
          {
            name: 'quizzesPassed',
            type: 'int',
            default: 0,
          },
          {
            name: 'averageQuizScore',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'loginCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'videoWatchTime',
            type: 'int',
            default: 0,
          },
          {
            name: 'readingTime',
            type: 'int',
            default: 0,
          },
          {
            name: 'discussionPosts',
            type: 'int',
            default: 0,
          },
          {
            name: 'chatMessages',
            type: 'int',
            default: 0,
          },
          {
            name: 'mostActiveHour',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'struggleIndicators',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'engagementScore',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0,
          },
          {
            name: 'progressPercentage',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0,
          },
          {
            name: 'performanceLevel',
            type: 'enum',
            enum: ['excellent', 'good', 'average', 'below_average', 'poor'],
            default: "'average'",
          },
          {
            name: 'learningPattern',
            type: 'enum',
            enum: [
              'consistent',
              'binge_learner',
              'procrastinator',
              'perfectionist',
              'explorer',
              'focused',
              'social_learner',
              'independent',
            ],
            isNullable: true,
          },
          {
            name: 'engagementMetrics',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'learningVelocity',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'predictiveIndicators',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'skillsGained',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'behavioralPatterns',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          new TableIndex({
            name: 'IDX_analytics_studentId',
            columnNames: ['studentId'],
          }),
          new TableIndex({
            name: 'IDX_analytics_courseId',
            columnNames: ['courseId'],
          }),
          new TableIndex({
            name: 'IDX_analytics_date',
            columnNames: ['date'],
          }),
          new TableIndex({
            name: 'IDX_analytics_engagement',
            columnNames: ['engagementScore'],
          }),
          new TableIndex({
            name: 'IDX_analytics_performance',
            columnNames: ['performanceLevel'],
          }),
        ],
      }),
      true,
    );

    // Add unique constraint for student-course-date combination
    await queryRunner.createIndex(
      'learning_analytics',
      new TableIndex({
        name: 'IDX_analytics_unique_student_course_date',
        columnNames: ['studentId', 'courseId', 'date'],
        isUnique: true,
      }),
    );

    // Create ai_recommendations table
    await queryRunner.createTable(
      new Table({
        name: 'ai_recommendations',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'studentId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'recommendationType',
            type: 'enum',
            enum: [
              'next_lesson',
              'review_content',
              'practice_quiz',
              'supplementary_material',
              'course_recommendation',
              'study_schedule',
              'learning_path',
              'skill_improvement',
              'peer_study_group',
              'tutor_session',
              'break_suggestion',
              'difficulty_adjustment',
            ],
          },
          {
            name: 'contentId',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'contentType',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'reason',
            type: 'text',
          },
          {
            name: 'confidenceScore',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0.5,
          },
          {
            name: 'priority',
            type: 'enum',
            enum: ['low', 'medium', 'high', 'urgent'],
            default: "'medium'",
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'active', 'accepted', 'dismissed', 'expired', 'completed'],
            default: "'pending'",
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'interactedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'interactionType',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'modelInfo',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'userContext',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'expectedOutcomes',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'abTestInfo',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'userRating',
            type: 'decimal',
            precision: 3,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'userFeedback',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'wasEffective',
            type: 'boolean',
            default: false,
          },
          {
            name: 'effectivenessMetrics',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          new TableIndex({
            name: 'IDX_recommendations_studentId',
            columnNames: ['studentId'],
          }),
          new TableIndex({
            name: 'IDX_recommendations_type',
            columnNames: ['recommendationType'],
          }),
          new TableIndex({
            name: 'IDX_recommendations_status',
            columnNames: ['status'],
          }),
          new TableIndex({
            name: 'IDX_recommendations_priority',
            columnNames: ['priority'],
          }),
          new TableIndex({
            name: 'IDX_recommendations_expires',
            columnNames: ['expiresAt'],
          }),
          new TableIndex({
            name: 'IDX_recommendations_confidence',
            columnNames: ['confidenceScore'],
          }),
          new TableIndex({
            name: 'IDX_recommendations_created',
            columnNames: ['createdAt'],
          }),
        ],
      }),
      true,
    );

    // Add Foreign Key Constraints
    await queryRunner.createForeignKey(
      'assessments',
      new TableForeignKey({
        columnNames: ['courseId'],
        referencedTableName: 'courses',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'assessments',
      new TableForeignKey({
        columnNames: ['lessonId'],
        referencedTableName: 'lessons',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'assessments',
      new TableForeignKey({
        columnNames: ['teacherId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'questions',
      new TableForeignKey({
        columnNames: ['assessmentId'],
        referencedTableName: 'assessments',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'assessment_attempts',
      new TableForeignKey({
        columnNames: ['studentId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'assessment_attempts',
      new TableForeignKey({
        columnNames: ['assessmentId'],
        referencedTableName: 'assessments',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'assessment_attempts',
      new TableForeignKey({
        columnNames: ['gradedBy'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'learning_activities',
      new TableForeignKey({
        columnNames: ['studentId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'learning_activities',
      new TableForeignKey({
        columnNames: ['courseId'],
        referencedTableName: 'courses',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'learning_activities',
      new TableForeignKey({
        columnNames: ['lessonId'],
        referencedTableName: 'lessons',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'learning_sessions',
      new TableForeignKey({
        columnNames: ['studentId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'learning_analytics',
      new TableForeignKey({
        columnNames: ['studentId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'learning_analytics',
      new TableForeignKey({
        columnNames: ['courseId'],
        referencedTableName: 'courses',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'ai_recommendations',
      new TableForeignKey({
        columnNames: ['studentId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order to handle foreign key constraints
    await queryRunner.dropTable('ai_recommendations');
    await queryRunner.dropTable('learning_analytics');
    await queryRunner.dropTable('learning_sessions');
    await queryRunner.dropTable('learning_activities');
    await queryRunner.dropTable('assessment_attempts');
    await queryRunner.dropTable('questions');
    await queryRunner.dropTable('assessments');
  }
}
