import { Test, TestingModule } from '@nestjs/testing';
import { UserPresenceService } from './user-presence.service';

describe('UserPresenceService', () => {
  let service: UserPresenceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserPresenceService],
    }).compile();

    service = module.get<UserPresenceService>(UserPresenceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
