import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateWishlist1756379323103 implements MigrationInterface {
    name = 'CreateWishlist1756379323103'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`wishlists\` (\`id\` varchar(36) NOT NULL, \`user_id\` varchar(255) NOT NULL, \`course_id\` varchar(255) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_e572b039c52c60db4fbeeab418\` (\`user_id\`, \`course_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`wishlists\` ADD CONSTRAINT \`FK_b5e6331a1a7d61c25d7a25cab8f\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`wishlists\` ADD CONSTRAINT \`FK_e75b95de9990fc2ef8ee1f402bf\` FOREIGN KEY (\`course_id\`) REFERENCES \`courses\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`wishlists\` DROP FOREIGN KEY \`FK_e75b95de9990fc2ef8ee1f402bf\``);
        await queryRunner.query(`ALTER TABLE \`wishlists\` DROP FOREIGN KEY \`FK_b5e6331a1a7d61c25d7a25cab8f\``);
        await queryRunner.query(`DROP INDEX \`IDX_e572b039c52c60db4fbeeab418\` ON \`wishlists\``);
        await queryRunner.query(`DROP TABLE \`wishlists\``);
    }

}
