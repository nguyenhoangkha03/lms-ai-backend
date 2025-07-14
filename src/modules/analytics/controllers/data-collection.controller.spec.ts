import { Test, TestingModule } from '@nestjs/testing';
import { DataCollectionController } from './data-collection.controller';

describe('DataCollectionController', () => {
  let controller: DataCollectionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DataCollectionController],
    }).compile();

    controller = module.get<DataCollectionController>(DataCollectionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
