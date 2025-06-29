import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SystemSeeder } from './system.seeder';
import { WinstonLoggerService } from '@/logger/winston-logger.service';

@Injectable()
export class SeedService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly systemSeeder: SystemSeeder,
    private readonly logger: WinstonLoggerService,
  ) {
    this.logger.setContext(SeedService.name);
  }

  async runAllSeeders(): Promise<void> {
    this.logger.log('🌱 Starting database seeding...');

    try {
      // Run seeders in order
      await this.systemSeeder.run();

      this.logger.log('✅ All seeders completed successfully');
    } catch (error) {
      this.logger.error('❌ Seeding failed:', error.message);
      throw error;
    }
  }

  async runSeeder(seederName: string): Promise<void> {
    this.logger.log(`🌱 Running specific seeder: ${seederName}`);

    switch (seederName) {
      case 'system':
        await this.systemSeeder.run();
        break;
      default:
        throw new Error(`Unknown seeder: ${seederName}`);
    }

    this.logger.log(`✅ Seeder ${seederName} completed`);
  }
}
