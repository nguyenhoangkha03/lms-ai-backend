import { Test, TestingModule } from '@nestjs/testing';
import { SimilarityDetectionController } from './similarity-detection.controller';

describe('SimilarityDetectionController', () => {
  let controller: SimilarityDetectionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SimilarityDetectionController],
    }).compile();

    controller = module.get<SimilarityDetectionController>(SimilarityDetectionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
