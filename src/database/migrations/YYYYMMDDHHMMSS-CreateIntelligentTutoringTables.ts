import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateIntelligentTutoringTables1704067200000 implements MigrationInterface {
  name = 'CreateIntelligentTutoringTables1704067200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'tutoring_sessions',
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
            name: 'contentType',
            type: 'enum',
            enum: [
              'lesson',
              'exercise',
              'quiz',
              'explanation',
              'example',
              'simulation',
              'video',
              'interactive',
              'reading',
            ],
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'content',
            type: 'text',
          },
          {
            name: 'difficultyLevel',
            type: 'enum',
            enum: ['very_easy', 'easy', 'medium', 'hard', 'very_hard', 'adaptive'],
          },
          {
            name: 'adaptationType',
            type: 'enum',
            enum: [
              'difficulty_adjustment',
              'content_variation',
              'pacing_adjustment',
              'learning_style_adaptation',
              'remediation',
              'enrichment',
              'path_redirection',
            ],
          },
          {
            name: 'targetLearningStyles',
            type: 'json',
          },
          {
            name: 'prerequisites',
            type: 'json',
          },
          {
            name: 'conceptsCovered',
            type: 'json',
          },
          {
            name: 'estimatedDuration',
            type: 'int',
            default: 5,
          },
          {
            name: 'effectivenessScore',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'adaptationRules',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'mediaAssets',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'interactiveElements',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create hint_generations table
    await queryRunner.createTable(
      new Table({
        name: 'hint_generations',
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
            name: 'createdAt',
            type: 'timestamp',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'interactionId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'hintType',
            type: 'enum',
            enum: [
              'strategic',
              'conceptual',
              'procedural',
              'metacognitive',
              'motivational',
              'directional',
              'elaborative',
            ],
          },
          {
            name: 'trigger',
            type: 'enum',
            enum: [
              'user_request',
              'struggle_detection',
              'time_threshold',
              'incorrect_attempts',
              'confusion_indicators',
              'proactive_support',
              'learning_objective',
            ],
          },
          {
            name: 'hintLevel',
            type: 'int',
            default: 1,
          },
          {
            name: 'hintContent',
            type: 'text',
          },
          {
            name: 'wasUsed',
            type: 'boolean',
            default: false,
          },
          {
            name: 'wasHelpful',
            type: 'boolean',
            isNullable: true,
          },
          {
            name: 'timesToGenerate',
            type: 'int',
            default: 0,
          },
          {
            name: 'relevanceScore',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0,
          },
          {
            name: 'contextAnalysis',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'adaptationData',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'tutoring_sessions',
      new TableIndex({
        name: 'IDX_TUTORING_SESSIONS_STUDENT_STARTED',
        columnNames: ['studentId', 'startedAt'],
      }),
    );

    await queryRunner.createIndex(
      'tutoring_sessions',
      new TableIndex({
        name: 'IDX_TUTORING_SESSIONS_COURSE_STATUS',
        columnNames: ['courseId', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'tutoring_interactions',
      new TableIndex({
        name: 'IDX_TUTORING_INTERACTIONS_SESSION_CREATED',
        columnNames: ['sessionId', 'createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'tutoring_interactions',
      new TableIndex({
        name: 'IDX_TUTORING_INTERACTIONS_TYPE_CREATED',
        columnNames: ['interactionType', 'createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'learning_style_profiles',
      new TableIndex({
        name: 'IDX_LEARNING_STYLE_PROFILES_USER',
        columnNames: ['userId'],
      }),
    );

    await queryRunner.createIndex(
      'adaptive_content',
      new TableIndex({
        name: 'IDX_ADAPTIVE_CONTENT_COURSE_DIFFICULTY',
        columnNames: ['courseId', 'difficultyLevel'],
      }),
    );

    await queryRunner.createIndex(
      'adaptive_content',
      new TableIndex({
        name: 'IDX_ADAPTIVE_CONTENT_TYPE_ACTIVE',
        columnNames: ['contentType', 'isActive'],
      }),
    );

    await queryRunner.createIndex(
      'hint_generations',
      new TableIndex({
        name: 'IDX_HINT_GENERATIONS_INTERACTION',
        columnNames: ['interactionId'],
      }),
    );

    await queryRunner.createIndex(
      'hint_generations',
      new TableIndex({
        name: 'IDX_HINT_GENERATIONS_TYPE_CREATED',
        columnNames: ['hintType', 'createdAt'],
      }),
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'tutoring_sessions',
      new TableForeignKey({
        columnNames: ['studentId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'tutoring_sessions',
      new TableForeignKey({
        columnNames: ['courseId'],
        referencedTableName: 'courses',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'tutoring_sessions',
      new TableForeignKey({
        columnNames: ['lessonId'],
        referencedTableName: 'lessons',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'tutoring_interactions',
      new TableForeignKey({
        columnNames: ['sessionId'],
        referencedTableName: 'tutoring_sessions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'learning_style_profiles',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'adaptive_content',
      new TableForeignKey({
        columnNames: ['courseId'],
        referencedTableName: 'courses',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'adaptive_content',
      new TableForeignKey({
        columnNames: ['lessonId'],
        referencedTableName: 'lessons',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'hint_generations',
      new TableForeignKey({
        columnNames: ['interactionId'],
        referencedTableName: 'tutoring_interactions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    const tutoringSessionsTable = await queryRunner.getTable('tutoring_sessions');
    if (tutoringSessionsTable) {
      const foreignKeys = tutoringSessionsTable.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('tutoring_sessions', foreignKey);
      }
    }

    const tutoringInteractionsTable = await queryRunner.getTable('tutoring_interactions');
    if (tutoringInteractionsTable) {
      const foreignKeys = tutoringInteractionsTable.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('tutoring_interactions', foreignKey);
      }
    }

    const learningStyleProfilesTable = await queryRunner.getTable('learning_style_profiles');
    if (learningStyleProfilesTable) {
      const foreignKeys = learningStyleProfilesTable.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('learning_style_profiles', foreignKey);
      }
    }

    const adaptiveContentTable = await queryRunner.getTable('adaptive_content');
    if (adaptiveContentTable) {
      const foreignKeys = adaptiveContentTable.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('adaptive_content', foreignKey);
      }
    }

    const hintGenerationsTable = await queryRunner.getTable('hint_generations');
    if (hintGenerationsTable) {
      const foreignKeys = hintGenerationsTable.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('hint_generations', foreignKey);
      }
    }

    // Drop tables
    await queryRunner.dropTable('hint_generations');
    await queryRunner.dropTable('adaptive_content');
    await queryRunner.dropTable('learning_style_profiles');
    await queryRunner.dropTable('tutoring_interactions');
    await queryRunner.dropTable('tutoring_sessions');
  }
}
