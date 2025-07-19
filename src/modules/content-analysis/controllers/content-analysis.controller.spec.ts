import { Test, TestingModule } from '@nestjs/testing';
import { ContentAnalysisController } from './content-analysis.controller';

describe('ContentAnalysisController', () => {
  let controller: ContentAnalysisController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContentAnalysisController],
    }).compile();

    controller = module.get<ContentAnalysisController>(ContentAnalysisController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
