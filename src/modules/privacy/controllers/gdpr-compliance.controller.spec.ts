import { Test, TestingModule } from '@nestjs/testing';
import { GdprComplianceController } from './gdpr-compliance.controller';

describe('GdprComplianceController', () => {
  let controller: GdprComplianceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GdprComplianceController],
    }).compile();

    controller = module.get<GdprComplianceController>(GdprComplianceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
