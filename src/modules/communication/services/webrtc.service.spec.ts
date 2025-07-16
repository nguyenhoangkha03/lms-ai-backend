import { Test, TestingModule } from '@nestjs/testing';
import { WebrtcService } from './webrtc.service';

describe('WebrtcService', () => {
  let service: WebrtcService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WebrtcService],
    }).compile();

    service = module.get<WebrtcService>(WebrtcService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
