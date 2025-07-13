import { Test, TestingModule } from '@nestjs/testing';
import { AssessmentTakingController } from './assessment-taking.controller';

describe('AssessmentTakingController', () => {
  let controller: AssessmentTakingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssessmentTakingController],
    }).compile();

    controller = module.get<AssessmentTakingController>(AssessmentTakingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
