import { Test, TestingModule } from '@nestjs/testing';
import { ZoomIntegrationService } from './zoom-integration.service';

describe('ZoomIntegrationService', () => {
  let service: ZoomIntegrationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ZoomIntegrationService],
    }).compile();

    service = module.get<ZoomIntegrationService>(ZoomIntegrationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
