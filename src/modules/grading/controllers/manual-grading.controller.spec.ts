import { Test, TestingModule } from '@nestjs/testing';
import { ManualGradingController } from './manual-grading.controller';

describe('ManualGradingController', () => {
  let controller: ManualGradingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ManualGradingController],
    }).compile();

    controller = module.get<ManualGradingController>(ManualGradingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
