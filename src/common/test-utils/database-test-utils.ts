import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

export class DatabaseTestUtils {
  private static dataSource: DataSource;

  static async setupTestDatabase(): Promise<DataSource> {
    if (this.dataSource?.isInitialized) {
      return this.dataSource;
    }

    const configService = new ConfigService();

    this.dataSource = new DataSource({
      type: 'mysql',
      host: configService.get('DB_HOST', 'localhost'),
      port: configService.get('DB_PORT', 3306),
      username: configService.get('DB_USERNAME', 'root'),
      password: configService.get('DB_PASSWORD', ''),
      database: `${configService.get('DB_DATABASE', 'lms_ai')}_test`,
      entities: ['src/**/*.entity.ts'],
      synchronize: true,
      dropSchema: true,
      logging: false,
    });

    await this.dataSource.initialize();
    return this.dataSource;
  }

  static async cleanupTestDatabase(): Promise<void> {
    if (this.dataSource?.isInitialized) {
      await this.dataSource.destroy();
    }
  }

  static async clearDatabase(): Promise<void> {
    if (!this.dataSource?.isInitialized) {
      throw new Error('Database not initialized');
    }

    const entities = this.dataSource.entityMetadatas;

    await this.dataSource.query('SET FOREIGN_KEY_CHECKS = 0');

    for (const entity of entities) {
      const repository = this.dataSource.getRepository(entity.name);
      await repository.clear();
    }

    await this.dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
  }

  static async seedTestData(): Promise<void> {
    // Implement basic test data seeding
    // This would populate essential data for tests
  }
}
