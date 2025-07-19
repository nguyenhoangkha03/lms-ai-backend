import { Test, TestingModule } from '@nestjs/testing';
import { QualityAssessmentController } from './quality-assessment.controller';

describe('QualityAssessmentController', () => {
  let controller: QualityAssessmentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QualityAssessmentController],
    }).compile();

    controller = module.get<QualityAssessmentController>(QualityAssessmentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
