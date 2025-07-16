import { Test, TestingModule } from '@nestjs/testing';
import { ChatFileService } from './chat-file.service';

describe('ChatFileService', () => {
  let service: ChatFileService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatFileService],
    }).compile();

    service = module.get<ChatFileService>(ChatFileService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
