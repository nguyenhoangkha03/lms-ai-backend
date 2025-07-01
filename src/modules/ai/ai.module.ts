import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AIRecommendation } from './entities/ai-recommendation.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([AIRecommendation])],
  controllers: [AiController],
  providers: [AiService],
  exports: [TypeOrmModule],
})
export class AiModule {}
