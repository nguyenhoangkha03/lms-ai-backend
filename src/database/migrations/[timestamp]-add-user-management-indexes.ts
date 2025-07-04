import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserManagementIndexesTimestamp implements MigrationInterface {
  name = 'AddUserManagementIndexes[timestamp]';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add performance indexes for user management
    await queryRunner.query(`
            CREATE INDEX idx_users_search ON users (first_name, last_name, email, username);
        `);

    await queryRunner.query(`
            CREATE INDEX idx_users_status_type ON users (status, user_type);
        `);

    await queryRunner.query(`
            CREATE INDEX idx_users_created_at ON users (created_at);
        `);

    await queryRunner.query(`
            CREATE INDEX idx_users_last_login ON users (last_login_at);
        `);

    // Add full-text search index for user profiles
    await queryRunner.query(`
            CREATE FULLTEXT INDEX idx_user_profiles_search 
            ON user_profiles (bio, address, city, country);
        `);

    // Add indexes for role and permission queries
    await queryRunner.query(`
            CREATE INDEX idx_roles_system_active ON roles (is_system_role, is_active);
        `);

    await queryRunner.query(`
            CREATE INDEX idx_permissions_resource_action ON permissions (resource, action);
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_users_search ON users`);
    await queryRunner.query(`DROP INDEX idx_users_status_type ON users`);
    await queryRunner.query(`DROP INDEX idx_users_created_at ON users`);
    await queryRunner.query(`DROP INDEX idx_users_last_login ON users`);
    await queryRunner.query(`DROP INDEX idx_user_profiles_search ON user_profiles`);
    await queryRunner.query(`DROP INDEX idx_roles_system_active ON roles`);
    await queryRunner.query(`DROP INDEX idx_permissions_resource_action ON permissions`);
  }
}
