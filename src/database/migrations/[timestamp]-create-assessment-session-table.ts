import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateAssessmentSessionTable implements MigrationInterface {
  name = 'CreateAssessmentSessionTable';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'assessment_sessions',
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
            name: 'sessionToken',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['preparing', 'active', 'paused', 'completed', 'expired', 'terminated'],
            default: "'preparing'",
          },
          {
            name: 'startedAt',
            type: 'timestamp',
          },
          {
            name: 'endedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
          },
          {
            name: 'timeRemaining',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'lastActivityAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'currentQuestionIndex',
            type: 'int',
            default: 0,
          },
          {
            name: 'questionsAnswered',
            type: 'int',
            default: 0,
          },
          {
            name: 'totalQuestions',
            type: 'int',
          },
          {
            name: 'progressPercentage',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0.0,
          },
          {
            name: 'currentAnswers',
            type: 'longtext',
            isNullable: true,
          },
          {
            name: 'lastAutoSaveAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'autoSaveInterval',
            type: 'int',
            default: 30,
          },
          {
            name: 'securityEvents',
            type: 'longtext',
            isNullable: true,
          },
          {
            name: 'securityViolationsCount',
            type: 'int',
            default: 0,
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
            name: 'browserInfo',
            type: 'longtext',
            isNullable: true,
          },
          {
            name: 'screenResolution',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'isFullscreen',
            type: 'tinyint',
            default: 0,
          },
          {
            name: 'tabSwitchCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'lastPingAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'networkQuality',
            type: 'decimal',
            precision: 3,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'sessionConfig',
            type: 'longtext',
            isNullable: true,
          },
          {
            name: 'questionsOrder',
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
          {
            name: 'attemptId',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'assessment_sessions',
      new TableIndex({
        name: 'IDX_SESSION_STUDENT_ASSESSMENT_STATUS',
        columnNames: ['studentId', 'assessmentId', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'assessment_sessions',
      new TableIndex({
        name: 'IDX_SESSION_TOKEN',
        columnNames: ['sessionToken'],
      }),
    );

    await queryRunner.createIndex(
      'assessment_sessions',
      new TableIndex({
        name: 'IDX_SESSION_EXPIRES_AT',
        columnNames: ['expiresAt'],
      }),
    );

    await queryRunner.createIndex(
      'assessment_sessions',
      new TableIndex({
        name: 'IDX_SESSION_STATUS_EXPIRES',
        columnNames: ['status', 'expiresAt'],
      }),
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'assessment_sessions',
      new TableForeignKey({
        columnNames: ['studentId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'assessment_sessions',
      new TableForeignKey({
        columnNames: ['assessmentId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'assessments',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'assessment_sessions',
      new TableForeignKey({
        columnNames: ['attemptId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'assessment_attempts',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('assessment_sessions');
  }
}
