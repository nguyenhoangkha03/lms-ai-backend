import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMigrationTemplate1234567890000 implements MigrationInterface {
  name = 'CreateMigrationTemplate1234567890000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Migration up logic here
    await queryRunner.query('SELECT 1');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Migration down logic here
    await queryRunner.query('SELECT 1');
  }
}
