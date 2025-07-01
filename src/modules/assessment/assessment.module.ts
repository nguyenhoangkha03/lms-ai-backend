import { Module } from '@nestjs/common';
import { AssessmentService } from './assessment.service';
import { AssessmentController } from './assessment.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assessment } from './entities/assessment.entity';
import { Question } from './entities/question.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Assessment, Question, Assessment])],
  controllers: [AssessmentController],
  providers: [AssessmentService],
  exports: [TypeOrmModule],
})
export class AssessmentModule {}
