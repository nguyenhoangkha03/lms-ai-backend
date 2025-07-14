import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsProcessingController } from './analytics-processing.controller';

describe('AnalyticsProcessingController', () => {
  let controller: AnalyticsProcessingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsProcessingController],
    }).compile();

    controller = module.get<AnalyticsProcessingController>(AnalyticsProcessingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
