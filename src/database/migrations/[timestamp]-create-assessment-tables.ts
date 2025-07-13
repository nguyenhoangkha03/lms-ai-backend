import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateAssessmentTables implements MigrationInterface {
  name = 'CreateAssessmentTables';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'assessments',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: '(UUID())',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'deletedAt',
            type: 'timestamp',
            precision: 6,
            isNullable: true,
          },
          {
            name: 'createdBy',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'updatedBy',
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
            isNullable: true,
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
            default: 100.0,
          },
          {
            name: 'randomizeQuestions',
            type: 'tinyint',
            default: 0,
          },
          {
            name: 'randomizeAnswers',
            type: 'tinyint',
            default: 0,
          },
          {
            name: 'showResults',
            type: 'tinyint',
            default: 1,
          },
          {
            name: 'showCorrectAnswers',
            type: 'tinyint',
            default: 0,
          },
          {
            name: 'isMandatory',
            type: 'tinyint',
            default: 0,
          },
          {
            name: 'isProctored',
            type: 'tinyint',
            default: 0,
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
            default: 0.0,
          },
          {
            name: 'settings',
            type: 'longtext',
            isNullable: true,
          },
          {
            name: 'antiCheatSettings',
            type: 'longtext',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'longtext',
            isNullable: true,
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
        ],
      }),
      true,
    );

    // Create questions table
    await queryRunner.createTable(
      new Table({
        name: 'questions',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: '(UUID())',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'deletedAt',
            type: 'timestamp',
            precision: 6,
            isNullable: true,
          },
          {
            name: 'createdBy',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'updatedBy',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'questionText',
            type: 'text',
          },
          {
            name: 'questionType',
            type: 'enum',
            enum: [
              'multiple_choice',
              'true_false',
              'short_answer',
              'essay',
              'fill_in_the_blank',
              'matching',
              'ordering',
              'numeric',
              'code',
            ],
            default: "'multiple_choice'",
          },
          {
            name: 'explanation',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'points',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 1.0,
          },
          {
            name: 'difficulty',
            type: 'enum',
            enum: ['easy', 'medium', 'hard', 'expert'],
            default: "'medium'",
          },
          {
            name: 'orderIndex',
            type: 'int',
            default: 0,
          },
          {
            name: 'timeLimit',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'hint',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'options',
            type: 'longtext',
            isNullable: true,
          },
          {
            name: 'correctAnswer',
            type: 'longtext',
          },
          {
            name: 'tags',
            type: 'longtext',
            isNullable: true,
          },
          {
            name: 'attachments',
            type: 'longtext',
            isNullable: true,
          },
          {
            name: 'validationRules',
            type: 'longtext',
            isNullable: true,
          },
          {
            name: 'analytics',
            type: 'longtext',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'longtext',
            isNullable: true,
          },
          {
            name: 'usageCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'isActive',
            type: 'tinyint',
            default: 1,
          },
          {
            name: 'assessmentId',
            type: 'varchar',
            length: '36',
            isNullable: true, // Null for question bank questions
          },
        ],
      }),
      true,
    );

    // Create assessment_attempts table
    await queryRunner.createTable(
      new Table({
        name: 'assessment_attempts',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: '(UUID())',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'deletedAt',
            type: 'timestamp',
            precision: 6,
            isNullable: true,
          },
          {
            name: 'createdBy',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'updatedBy',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'attemptNumber',
            type: 'int',
            default: 1,
          },
          {
            name: 'startedAt',
            type: 'timestamp',
          },
          {
            name: 'submittedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'gradingStatus',
            type: 'enum',
            enum: ['pending', 'graded', 'reviewing', 'disputed'],
            default: "'pending'",
          },
          {
            name: 'score',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'maxScore',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'percentage',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'timeTaken',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['in_progress', 'submitted', 'abandoned', 'timed_out', 'flagged'],
            default: "'in_progress'",
          },
          {
            name: 'answers',
            type: 'longtext',
            isNullable: true,
          },
          {
            name: 'feedback',
            type: 'longtext',
            isNullable: true,
          },
          {
            name: 'gradedBy',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'gradedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'isFlagged',
            type: 'tinyint',
            default: 0,
          },
          {
            name: 'flagReason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'proctoringData',
            type: 'longtext',
            isNullable: true,
          },
          {
            name: 'sessionData',
            type: 'longtext',
            isNullable: true,
          },
          {
            name: 'analyticsData',
            type: 'longtext',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'longtext',
            isNullable: true,
          },
          {
            name: 'studentId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'assessmentId',
            type: 'varchar',
            length: '36',
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'assessments',
      new TableIndex({
        name: 'IDX_ASSESSMENT_COURSE_STATUS',
        columnNames: ['courseId', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'assessments',
      new TableIndex({
        name: 'IDX_ASSESSMENT_TEACHER_TYPE',
        columnNames: ['teacherId', 'assessmentType'],
      }),
    );

    await queryRunner.createIndex(
      'assessments',
      new TableIndex({
        name: 'IDX_ASSESSMENT_AVAILABILITY',
        columnNames: ['availableFrom', 'availableUntil'],
      }),
    );

    await queryRunner.createIndex(
      'questions',
      new TableIndex({
        name: 'IDX_QUESTION_ASSESSMENT_ORDER',
        columnNames: ['assessmentId', 'orderIndex'],
      }),
    );

    await queryRunner.createIndex(
      'questions',
      new TableIndex({
        name: 'IDX_QUESTION_TYPE_DIFFICULTY',
        columnNames: ['questionType', 'difficulty'],
      }),
    );

    await queryRunner.createIndex(
      'assessment_attempts',
      new TableIndex({
        name: 'IDX_ATTEMPT_STUDENT_ASSESSMENT',
        columnNames: ['studentId', 'assessmentId'],
      }),
    );

    await queryRunner.createIndex(
      'assessment_attempts',
      new TableIndex({
        name: 'IDX_ATTEMPT_GRADING_SUBMITTED',
        columnNames: ['gradingStatus', 'submittedAt'],
      }),
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'assessments',
      new TableForeignKey({
        columnNames: ['courseId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'courses',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'assessments',
      new TableForeignKey({
        columnNames: ['lessonId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'lessons',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'assessments',
      new TableForeignKey({
        columnNames: ['teacherId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'questions',
      new TableForeignKey({
        columnNames: ['assessmentId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'assessments',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'assessment_attempts',
      new TableForeignKey({
        columnNames: ['studentId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'assessment_attempts',
      new TableForeignKey({
        columnNames: ['assessmentId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'assessments',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'assessment_attempts',
      new TableForeignKey({
        columnNames: ['gradedBy'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('assessment_attempts');
    await queryRunner.dropTable('questions');
    await queryRunner.dropTable('assessments');
  }
}
