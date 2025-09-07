import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { WinstonModule } from '@/logger/winston.module';

@Module({
  imports: [TypeOrmModule.forFeature([]), WinstonModule],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
