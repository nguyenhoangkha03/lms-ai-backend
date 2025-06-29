import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { SystemSeeder } from './system.seeder';
import { LoggerModule } from '@/logger/logger.module';

@Module({
  imports: [TypeOrmModule.forFeature([]), LoggerModule],
  providers: [SeedService, SystemSeeder],
  exports: [SeedService],
})
export class SeedModule {}
