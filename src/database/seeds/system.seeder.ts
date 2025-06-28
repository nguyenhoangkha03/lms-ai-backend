import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseSeeder } from './base.seeder';
import { WinstonLoggerService } from 'common/logger/winston-logger.service';

@Injectable()
export class SystemSeeder extends BaseSeeder {
  constructor(dataSource: DataSource, logger: WinstonLoggerService) {
    super(dataSource, logger);
  }

  async run(): Promise<void> {
    this.logger.log('🌱 Running System Seeder...');

    // Example: Insert system settings
    await this.seedSystemSettings();

    this.logger.log('✅ System Seeder completed');
  }

  private async seedSystemSettings(): Promise<void> {
    // const settings = [
    //   {
    //     key: 'app.name',
    //     value: 'LMS AI Backend',
    //     description: 'Application name',
    //     category: 'general',
    //     dataType: 'string',
    //     isPublic: true,
    //   },
    //   {
    //     key: 'app.version',
    //     value: '1.0.0',
    //     description: 'Application version',
    //     category: 'general',
    //     dataType: 'string',
    //     isPublic: true,
    //   },
    //   {
    //     key: 'features.ai_recommendations',
    //     value: 'true',
    //     description: 'Enable AI recommendations',
    //     category: 'features',
    //     dataType: 'boolean',
    //     isPublic: false,
    //   },
    // ];

    // Will implement when SystemSettings entity is created
    this.logger.log('📝 System settings will be seeded when entity is available');
  }
}
