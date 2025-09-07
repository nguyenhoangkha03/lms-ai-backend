import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateReference1757131587117 implements MigrationInterface {
    name = 'UpdateReference1757131587117'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`file_uploads\` DROP FOREIGN KEY \`FK_175be1fef3fab05de57c182a1ab\``);
        await queryRunner.query(`ALTER TABLE \`file_uploads\` DROP FOREIGN KEY \`FK_cee3f3f0691ba0412113fb40570\``);
        await queryRunner.query(`ALTER TABLE \`file_uploads\` DROP FOREIGN KEY \`FK_f6480896a832aeb5bf2cbdcaa8f\``);
        await queryRunner.query(`ALTER TABLE \`file_uploads\` ADD CONSTRAINT \`FK_f6480896a832aeb5bf2cbdcaa8f\` FOREIGN KEY (\`uploaderId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`file_uploads\` ADD CONSTRAINT \`FK_175be1fef3fab05de57c182a1ab\` FOREIGN KEY (\`updatedBy\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`file_uploads\` ADD CONSTRAINT \`FK_cee3f3f0691ba0412113fb40570\` FOREIGN KEY (\`moderatedBy\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`file_uploads\` DROP FOREIGN KEY \`FK_cee3f3f0691ba0412113fb40570\``);
        await queryRunner.query(`ALTER TABLE \`file_uploads\` DROP FOREIGN KEY \`FK_175be1fef3fab05de57c182a1ab\``);
        await queryRunner.query(`ALTER TABLE \`file_uploads\` DROP FOREIGN KEY \`FK_f6480896a832aeb5bf2cbdcaa8f\``);
        await queryRunner.query(`ALTER TABLE \`file_uploads\` ADD CONSTRAINT \`FK_f6480896a832aeb5bf2cbdcaa8f\` FOREIGN KEY (\`uploaderId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`file_uploads\` ADD CONSTRAINT \`FK_cee3f3f0691ba0412113fb40570\` FOREIGN KEY (\`moderatedBy\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`file_uploads\` ADD CONSTRAINT \`FK_175be1fef3fab05de57c182a1ab\` FOREIGN KEY (\`updatedBy\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
