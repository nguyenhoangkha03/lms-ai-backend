import { Test, TestingModule } from '@nestjs/testing';
import { CollaborativeNoteService } from './collaborative-note.service';

describe('CollaborativeNoteService', () => {
  let service: CollaborativeNoteService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CollaborativeNoteService],
    }).compile();

    service = module.get<CollaborativeNoteService>(CollaborativeNoteService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
