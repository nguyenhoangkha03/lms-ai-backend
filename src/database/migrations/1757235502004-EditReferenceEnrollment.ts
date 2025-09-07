import { MigrationInterface, QueryRunner } from "typeorm";

export class EditReferenceEnrollment1757235502004 implements MigrationInterface {
    name = 'EditReferenceEnrollment1757235502004'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`enrollments\` DROP FOREIGN KEY \`FK_60dd0ae4e21002e63a5fdefeec8\``);
        await queryRunner.query(`ALTER TABLE \`enrollments\` DROP FOREIGN KEY \`FK_bf3ba3dfa95e2df7388eb4589fd\``);
        await queryRunner.query(`ALTER TABLE \`payments\` CHANGE \`status\` \`status\` enum ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'pending_verification') NOT NULL DEFAULT 'pending'`);
        await queryRunner.query(`ALTER TABLE \`chat_files\` DROP FOREIGN KEY \`FK_ea9c9ae1f173ad90c9a4d15d2a7\``);
        await queryRunner.query(`ALTER TABLE \`chat_files\` CHANGE \`messageId\` \`messageId\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`enrollments\` ADD CONSTRAINT \`FK_bf3ba3dfa95e2df7388eb4589fd\` FOREIGN KEY (\`studentId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`enrollments\` ADD CONSTRAINT \`FK_60dd0ae4e21002e63a5fdefeec8\` FOREIGN KEY (\`courseId\`) REFERENCES \`courses\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`chat_files\` ADD CONSTRAINT \`FK_ea9c9ae1f173ad90c9a4d15d2a7\` FOREIGN KEY (\`messageId\`) REFERENCES \`chat_messages\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`chat_files\` DROP FOREIGN KEY \`FK_ea9c9ae1f173ad90c9a4d15d2a7\``);
        await queryRunner.query(`ALTER TABLE \`enrollments\` DROP FOREIGN KEY \`FK_60dd0ae4e21002e63a5fdefeec8\``);
        await queryRunner.query(`ALTER TABLE \`enrollments\` DROP FOREIGN KEY \`FK_bf3ba3dfa95e2df7388eb4589fd\``);
        await queryRunner.query(`ALTER TABLE \`chat_files\` CHANGE \`messageId\` \`messageId\` varchar(36) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`chat_files\` ADD CONSTRAINT \`FK_ea9c9ae1f173ad90c9a4d15d2a7\` FOREIGN KEY (\`messageId\`) REFERENCES \`chat_messages\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`payments\` CHANGE \`status\` \`status\` enum ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded') NOT NULL DEFAULT 'pending'`);
        await queryRunner.query(`ALTER TABLE \`enrollments\` ADD CONSTRAINT \`FK_bf3ba3dfa95e2df7388eb4589fd\` FOREIGN KEY (\`studentId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`enrollments\` ADD CONSTRAINT \`FK_60dd0ae4e21002e63a5fdefeec8\` FOREIGN KEY (\`courseId\`) REFERENCES \`courses\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
