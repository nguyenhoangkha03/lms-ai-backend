import { Test, TestingModule } from '@nestjs/testing';
import { ComplianceAuditService } from './compliance-audit.service';

describe('ComplianceAuditService', () => {
  let service: ComplianceAuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ComplianceAuditService],
    }).compile();

    service = module.get<ComplianceAuditService>(ComplianceAuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
