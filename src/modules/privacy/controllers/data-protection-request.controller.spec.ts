import { Test, TestingModule } from '@nestjs/testing';
import { DataProtectionRequestController } from './data-protection-request.controller';

describe('DataProtectionRequestController', () => {
  let controller: DataProtectionRequestController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DataProtectionRequestController],
    }).compile();

    controller = module.get<DataProtectionRequestController>(DataProtectionRequestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
