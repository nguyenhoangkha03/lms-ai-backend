import { Test, TestingModule } from '@nestjs/testing';
import { DataDeletionController } from './data-deletion.controller';

describe('DataDeletionController', () => {
  let controller: DataDeletionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DataDeletionController],
    }).compile();

    controller = module.get<DataDeletionController>(DataDeletionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
