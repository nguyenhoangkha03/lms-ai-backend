import { Test, TestingModule } from '@nestjs/testing';
import { CollaborativeNoteController } from './collaborative-note.controller';

describe('CollaborativeNoteController', () => {
  let controller: CollaborativeNoteController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CollaborativeNoteController],
    }).compile();

    controller = module.get<CollaborativeNoteController>(CollaborativeNoteController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
