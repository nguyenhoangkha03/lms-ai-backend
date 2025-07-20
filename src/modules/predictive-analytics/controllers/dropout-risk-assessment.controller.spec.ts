import { Test, TestingModule } from '@nestjs/testing';
import { DropoutRiskAssessmentController } from './dropout-risk-assessment.controller';

describe('DropoutRiskAssessmentController', () => {
  let controller: DropoutRiskAssessmentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DropoutRiskAssessmentController],
    }).compile();

    controller = module.get<DropoutRiskAssessmentController>(DropoutRiskAssessmentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
