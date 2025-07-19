import { Test, TestingModule } from '@nestjs/testing';
import { PlagiarismDetectionController } from './plagiarism-detection.controller';

describe('PlagiarismDetectionController', () => {
  let controller: PlagiarismDetectionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlagiarismDetectionController],
    }).compile();

    controller = module.get<PlagiarismDetectionController>(PlagiarismDetectionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
