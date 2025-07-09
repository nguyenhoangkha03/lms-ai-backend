import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { SeedService } from './seed.service';
import { WinstonService } from '@/logger/winston.service';

async function runSeeds() {
  // logger winston
  const app = await NestFactory.createApplicationContext(AppModule);
  const logger = app.get(WinstonService);
  logger.setContext('SeedRunner');

  try {
    logger.log('🌱 Starting database seeding...');

    const app = await NestFactory.createApplicationContext(AppModule);
    const seedService = app.get(SeedService);

    // Get command line arguments
    const args = process.argv.slice(2);
    const seederName = args[0];

    if (seederName) {
      // Run specific seeder
      await seedService.runSeeder(seederName);
    } else {
      // Run all seeders
      await seedService.runAllSeeders();
    }

    await app.close();
    logger.log('✅ Seeding completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

runSeeds();
