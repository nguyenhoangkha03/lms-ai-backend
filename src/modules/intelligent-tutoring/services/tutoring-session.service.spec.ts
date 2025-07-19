import { Test, TestingModule } from '@nestjs/testing';
import { TutoringSessionService } from './tutoring-session.service';

describe('TutoringSessionService', () => {
  let service: TutoringSessionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TutoringSessionService],
    }).compile();

    service = module.get<TutoringSessionService>(TutoringSessionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
