import { Test, TestingModule } from '@nestjs/testing';
import { ContentQualityAssessmentService } from './content-quality-assessment.service';

describe('ContentQualityAssessmentService', () => {
  let service: ContentQualityAssessmentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContentQualityAssessmentService],
    }).compile();

    service = module.get<ContentQualityAssessmentService>(ContentQualityAssessmentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
