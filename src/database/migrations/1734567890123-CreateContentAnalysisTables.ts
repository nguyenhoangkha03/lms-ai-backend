import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateContentAnalysisTables1734567890123 implements MigrationInterface {
  name = 'CreateContentAnalysisTables1734567890123';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create content_tags table
    await queryRunner.query(`
      CREATE TABLE \`content_tags\` (
        \`id\` varchar(36) NOT NULL,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` timestamp(6) NULL,
        \`created_by\` varchar(36) NULL,
        \`updated_by\` varchar(36) NULL,
        \`content_type\` enum('course', 'lesson') NOT NULL,
        \`content_id\` varchar(36) NOT NULL,
        \`tag\` varchar(100) NOT NULL,
        \`category\` enum('topic', 'difficulty', 'skill', 'subject', 'learning_objective', 'content_type', 'language') NOT NULL DEFAULT 'topic',
        \`type\` enum('auto_generated', 'manual', 'ai_suggested', 'system') NOT NULL DEFAULT 'auto_generated',
        \`confidence\` decimal(5,4) NOT NULL DEFAULT '1.0000',
        \`description\` text NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`is_verified\` tinyint NOT NULL DEFAULT 0,
        \`verified_by\` varchar(36) NULL,
        \`verified_at\` timestamp NULL,
        \`ai_model_version\` varchar(50) NULL,
        \`extraction_method\` varchar(100) NULL,
        \`metadata\` json NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_plagiarism_checks_content\` (\`content_type\`, \`content_id\`),
        INDEX \`IDX_plagiarism_checks_level_completed\` (\`plagiarism_level\`, \`scan_completed_at\`),
        INDEX \`IDX_plagiarism_checks_status_created\` (\`status\`, \`created_at\`)
      ) ENGINE=InnoDB
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE \`content_tags\` 
      ADD CONSTRAINT \`FK_content_tags_created_by\` 
      FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE \`content_tags\` 
      ADD CONSTRAINT \`FK_content_tags_updated_by\` 
      FOREIGN KEY (\`updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE \`content_tags\` 
      ADD CONSTRAINT \`FK_content_tags_verified_by\` 
      FOREIGN KEY (\`verified_by\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE \`generated_quizzes\` 
      ADD CONSTRAINT \`FK_generated_quizzes_lesson\` 
      FOREIGN KEY (\`lesson_id\`) REFERENCES \`lessons\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE \`generated_quizzes\` 
      ADD CONSTRAINT \`FK_generated_quizzes_generated_by\` 
      FOREIGN KEY (\`generated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE \`generated_quizzes\` 
      ADD CONSTRAINT \`FK_generated_quizzes_reviewed_by\` 
      FOREIGN KEY (\`reviewed_by\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE \`plagiarism_checks\` 
      ADD CONSTRAINT \`FK_plagiarism_checks_initiated_by\` 
      FOREIGN KEY (\`initiated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints first
    await queryRunner.query(
      `ALTER TABLE \`plagiarism_checks\` DROP FOREIGN KEY \`FK_plagiarism_checks_initiated_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`generated_quizzes\` DROP FOREIGN KEY \`FK_generated_quizzes_reviewed_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`generated_quizzes\` DROP FOREIGN KEY \`FK_generated_quizzes_generated_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`generated_quizzes\` DROP FOREIGN KEY \`FK_generated_quizzes_lesson\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`content_tags\` DROP FOREIGN KEY \`FK_content_tags_verified_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`content_tags\` DROP FOREIGN KEY \`FK_content_tags_updated_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`content_tags\` DROP FOREIGN KEY \`FK_content_tags_created_by\``,
    );

    // Drop tables
    await queryRunner.query(`DROP TABLE \`plagiarism_checks\``);
    await queryRunner.query(`DROP TABLE \`generated_quizzes\``);
    await queryRunner.query(`DROP TABLE \`content_quality_assessments\``);
    await queryRunner.query(`DROP TABLE \`content_similarities\``);
    await queryRunner.query(`DROP TABLE \`content_tags\``);
  }
}
