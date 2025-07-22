import { Test, TestingModule } from '@nestjs/testing';
import { ComplianceAuditController } from './compliance-audit.controller';

describe('ComplianceAuditController', () => {
  let controller: ComplianceAuditController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ComplianceAuditController],
    }).compile();

    controller = module.get<ComplianceAuditController>(ComplianceAuditController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
