import { Test, TestingModule } from '@nestjs/testing';
import { StudyGroupController } from './study-group.controller';

describe('StudyGroupController', () => {
  let controller: StudyGroupController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudyGroupController],
    }).compile();

    controller = module.get<StudyGroupController>(StudyGroupController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
