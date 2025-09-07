import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLessonIdIntoQuestion1757261617779 implements MigrationInterface {
    name = 'AddLessonIdIntoQuestion1757261617779'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`questions\` ADD \`lessonId\` varchar(36) NULL COMMENT 'Khóa ngoại liên kết tới lessons.id, xác định câu hỏi này thuộc về bài học nào'`);
        await queryRunner.query(`ALTER TABLE \`questions\` ADD CONSTRAINT \`FK_5ff5c21d36d6ad6083aa129d632\` FOREIGN KEY (\`lessonId\`) REFERENCES \`lessons\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`questions\` DROP FOREIGN KEY \`FK_5ff5c21d36d6ad6083aa129d632\``);
        await queryRunner.query(`ALTER TABLE \`questions\` DROP COLUMN \`lessonId\``);
    }

}

