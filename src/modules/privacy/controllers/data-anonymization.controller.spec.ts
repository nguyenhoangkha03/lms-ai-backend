import { Test, TestingModule } from '@nestjs/testing';
import { DataAnonymizationController } from './data-anonymization.controller';

describe('DataAnonymizationController', () => {
  let controller: DataAnonymizationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DataAnonymizationController],
    }).compile();

    controller = module.get<DataAnonymizationController>(DataAnonymizationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
