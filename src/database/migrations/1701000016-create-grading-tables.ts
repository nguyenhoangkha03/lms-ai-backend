import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateGradingTables1701000016 implements MigrationInterface {
  name = 'CreateGradingTables1701000016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ===== GRADES TABLE =====
    await queryRunner.createTable(
      new Table({
        name: 'grades',
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
          // Relationship fields
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
          {
            name: 'attemptId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'graderId',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          // Core grading fields
          {
            name: 'score',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0,
          },
          {
            name: 'maxScore',
            type: 'decimal',
            precision: 5,
            scale: 2,
          },
          {
            name: 'percentage',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'graded', 'under_review', 'finalized'],
            default: "'pending'",
          },
          {
            name: 'feedbackType',
            type: 'enum',
            enum: ['overall', 'question_specific', 'ai_generated', 'manual'],
            default: "'manual'",
          },
          // Detailed scoring
          {
            name: 'questionScores',
            type: 'longtext',
            isNullable: true,
            comment: 'JSON: Question-level scores and feedback',
          },
          {
            name: 'overallFeedback',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'comments',
            type: 'text',
            isNullable: true,
          },
          // Grading metadata
          {
            name: 'gradedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'publishedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'isPublished',
            type: 'boolean',
            default: false,
          },
          {
            name: 'isAiGraded',
            type: 'boolean',
            default: false,
          },
          {
            name: 'aiConfidence',
            type: 'decimal',
            precision: 3,
            scale: 2,
            isNullable: true,
          },
          // Quality assurance
          {
            name: 'reviewedBy',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'reviewedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'reviewComments',
            type: 'text',
            isNullable: true,
          },
          // Additional data
          {
            name: 'gradingRubric',
            type: 'longtext',
            isNullable: true,
            comment: 'JSON: Grading criteria and weights',
          },
          {
            name: 'analytics',
            type: 'longtext',
            isNullable: true,
            comment: 'JSON: Performance analytics',
          },
          {
            name: 'metadata',
            type: 'longtext',
            isNullable: true,
            comment: 'JSON: Additional grading data',
          },
        ],
        indices: [
          new TableIndex({
            name: 'IDX_grades_student_assessment',
            columnNames: ['studentId', 'assessmentId'],
            isUnique: true,
          }),

          new TableIndex({
            name: 'IDX_grades_grader_created',
            columnNames: ['graderId', 'createdAt'],
          }),

          new TableIndex({
            name: 'IDX_grades_status_created',
            columnNames: ['status', 'createdAt'],
          }),

          new TableIndex({
            name: 'IDX_grades_published',
            columnNames: ['isPublished', 'publishedAt'],
          }),

          new TableIndex({
            name: 'IDX_grades_ai',
            columnNames: ['isAiGraded', 'aiConfidence'],
          }),
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['studentId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
          new TableForeignKey({
            columnNames: ['assessmentId'],
            referencedTableName: 'assessments',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
          new TableForeignKey({
            columnNames: ['attemptId'],
            referencedTableName: 'assessment_attempts',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
          new TableForeignKey({
            columnNames: ['graderId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          }),
          new TableForeignKey({
            columnNames: ['reviewedBy'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          }),
        ],
      }),
      true,
    );

    // ===== FEEDBACKS TABLE =====
    await queryRunner.createTable(
      new Table({
        name: 'feedbacks',
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
          // Relationship fields
          {
            name: 'gradeId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'questionId',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'authorId',
            type: 'varchar',
            length: '36',
          },
          // Core feedback fields
          {
            name: 'category',
            type: 'enum',
            enum: ['content', 'structure', 'grammar', 'logic', 'creativity', 'technical'],
          },
          {
            name: 'severity',
            type: 'enum',
            enum: ['info', 'suggestion', 'warning', 'error'],
            default: "'info'",
          },
          {
            name: 'content',
            type: 'text',
          },
          {
            name: 'suggestion',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'isAiGenerated',
            type: 'boolean',
            default: false,
          },
          {
            name: 'aiConfidence',
            type: 'decimal',
            precision: 3,
            scale: 2,
            isNullable: true,
          },
          // Position in response
          {
            name: 'startPosition',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'endPosition',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'highlightedText',
            type: 'text',
            isNullable: true,
          },
          // Rating and usefulness
          {
            name: 'helpfulnessRating',
            type: 'int',
            isNullable: true,
            comment: '1-5 rating',
          },
          {
            name: 'isMarkedHelpful',
            type: 'boolean',
            default: false,
          },
          {
            name: 'metadata',
            type: 'longtext',
            isNullable: true,
            comment: 'JSON: Additional feedback data',
          },
        ],
        indices: [
          new TableIndex({
            name: 'IDX_feedbacks_grade_question',
            columnNames: ['gradeId', 'questionId'],
          }),

          new TableIndex({
            name: 'IDX_feedbacks_author_created',
            columnNames: ['authorId', 'createdAt'],
          }),

          new TableIndex({
            name: 'IDX_feedbacks_category_severity',
            columnNames: ['category', 'severity'],
          }),

          new TableIndex({
            name: 'IDX_feedbacks_ai_generated',
            columnNames: ['isAiGenerated', 'aiConfidence'],
          }),
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['gradeId'],
            referencedTableName: 'grades',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
          new TableForeignKey({
            columnNames: ['questionId'],
            referencedTableName: 'questions',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
          new TableForeignKey({
            columnNames: ['authorId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
        ],
      }),
      true,
    );

    // ===== GRADEBOOKS TABLE =====
    await queryRunner.createTable(
      new Table({
        name: 'gradebooks',
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
          // Relationship fields
          {
            name: 'courseId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'teacherId',
            type: 'varchar',
            length: '36',
          },
          // Core gradebook fields
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'finalized', 'archived'],
            default: "'active'",
          },
          // Grading configuration
          {
            name: 'gradingScale',
            type: 'longtext',
            isNullable: true,
            comment: 'JSON: Grade scale configuration',
          },
          {
            name: 'weightingScheme',
            type: 'longtext',
            isNullable: true,
            comment: 'JSON: Assessment weighting scheme',
          },
          {
            name: 'passingThreshold',
            type: 'decimal',
            precision: 3,
            scale: 2,
            default: 60.0,
          },
          {
            name: 'allowLateSubmissions',
            type: 'boolean',
            default: true,
          },
          {
            name: 'latePenaltyPercentage',
            type: 'decimal',
            precision: 3,
            scale: 2,
            default: 10.0,
          },
          // Statistics
          {
            name: 'totalStudents',
            type: 'int',
            default: 0,
          },
          {
            name: 'totalAssessments',
            type: 'int',
            default: 0,
          },
          {
            name: 'classAverage',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0,
          },
          {
            name: 'lastCalculatedAt',
            type: 'timestamp',
            isNullable: true,
          },
          // Settings
          {
            name: 'displaySettings',
            type: 'longtext',
            isNullable: true,
            comment: 'JSON: Display preferences',
          },
          {
            name: 'exportSettings',
            type: 'longtext',
            isNullable: true,
            comment: 'JSON: Export format preferences',
          },
          {
            name: 'metadata',
            type: 'longtext',
            isNullable: true,
            comment: 'JSON: Additional gradebook data',
          },
        ],
        indices: [
          new TableIndex({
            name: 'IDX_gradebooks_course_teacher',
            columnNames: ['courseId', 'teacherId'],
          }),

          new TableIndex({
            name: 'IDX_gradebooks_status_created',
            columnNames: ['status', 'createdAt'],
          }),
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['courseId'],
            referencedTableName: 'courses',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
          new TableForeignKey({
            columnNames: ['teacherId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
        ],
      }),
      true,
    );

    // ===== GRADING_RUBRICS TABLE =====
    await queryRunner.createTable(
      new Table({
        name: 'grading_rubrics',
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
          // Relationship fields
          {
            name: 'assessmentId',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          // Core rubric fields
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
            name: 'type',
            type: 'enum',
            enum: ['holistic', 'analytic', 'single_point'],
            default: "'analytic'",
          },
          {
            name: 'isTemplate',
            type: 'boolean',
            default: false,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          // Rubric structure
          {
            name: 'criteria',
            type: 'longtext',
            comment: 'JSON: Rubric criteria and levels',
          },
          {
            name: 'maxScore',
            type: 'decimal',
            precision: 5,
            scale: 2,
          },
          {
            name: 'version',
            type: 'int',
            default: 1,
          },
          // Usage statistics
          {
            name: 'usageCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'lastUsedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'longtext',
            isNullable: true,
            comment: 'JSON: Additional rubric data',
          },
        ],
        indices: [
          new TableIndex({
            name: 'IDX_grading_rubrics_assessment',
            columnNames: ['assessmentId'],
          }),

          new TableIndex({
            name: 'IDX_grading_rubrics_template',
            columnNames: ['createdBy', 'isTemplate'],
          }),

          new TableIndex({
            name: 'IDX_grading_rubrics_active',
            columnNames: ['isActive', 'lastUsedAt'],
          }),
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['assessmentId'],
            referencedTableName: 'assessments',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
          new TableForeignKey({
            columnNames: ['createdBy'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('grading_rubrics');
    await queryRunner.dropTable('gradebooks');
    await queryRunner.dropTable('feedbacks');
    await queryRunner.dropTable('grades');
  }
}
