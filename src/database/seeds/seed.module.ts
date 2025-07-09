import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { SystemSeeder } from './system.seeder';
import { WinstonModule } from '@/logger/winston.module';

@Module({
  imports: [TypeOrmModule.forFeature([]), WinstonModule],
  providers: [SeedService, SystemSeeder],
  exports: [SeedService],
})
export class SeedModule {}
