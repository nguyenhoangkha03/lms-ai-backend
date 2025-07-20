import { Test, TestingModule } from '@nestjs/testing';
import { DropoutRiskAssessmentService } from './dropout-risk-assessment.service';

describe('DropoutRiskAssessmentService', () => {
  let service: DropoutRiskAssessmentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DropoutRiskAssessmentService],
    }).compile();

    service = module.get<DropoutRiskAssessmentService>(DropoutRiskAssessmentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
