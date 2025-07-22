import { Test, TestingModule } from '@nestjs/testing';
import { DataExportController } from './data-export.controller';

describe('DataExportController', () => {
  let controller: DataExportController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DataExportController],
    }).compile();

    controller = module.get<DataExportController>(DataExportController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
