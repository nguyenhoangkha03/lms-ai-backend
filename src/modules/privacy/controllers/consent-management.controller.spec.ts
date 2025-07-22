import { Test, TestingModule } from '@nestjs/testing';
import { ConsentManagementController } from './consent-management.controller';

describe('ConsentManagementController', () => {
  let controller: ConsentManagementController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConsentManagementController],
    }).compile();

    controller = module.get<ConsentManagementController>(ConsentManagementController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
