import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CollaborativeNote } from '../entities/collaborative-note.entity';
import { NoteCollaborator } from '../entities/note-collaborator.entity';
import {
  CreateCollaborativeNoteDto,
  UpdateCollaborativeNoteDto,
  CollaborativeNoteQueryDto,
  ShareNoteDto,
} from '../dto/collaborative-note.dto';
import { NoteStatus } from '@/common/enums/collaborative.enums';
import { UserPayload } from '@/common/interfaces/user-payload.interface';

@Injectable()
export class CollaborativeNoteService {
  constructor(
    @InjectRepository(CollaborativeNote)
    private readonly noteRepository: Repository<CollaborativeNote>,
    @InjectRepository(NoteCollaborator)
    private readonly collaboratorRepository: Repository<NoteCollaborator>,
  ) {}

  async create(
    createDto: CreateCollaborativeNoteDto,
    user: UserPayload,
  ): Promise<CollaborativeNote> {
    const note = this.noteRepository.create({
      ...createDto,
      authorId: user.sub,
      tags: createDto.tags ? JSON.stringify(createDto.tags) : null,
      lastEditedAt: new Date(),
      lastEditedBy: user.sub,
    } as CollaborativeNote);

    return this.noteRepository.save(note);
  }

  async findAll(
    query: CollaborativeNoteQueryDto,
    user: UserPayload,
  ): Promise<{ data: CollaborativeNote[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      type,
      status,
      studyGroupId,
      courseId,
      lessonId,
      search,
      tags,
      templatesOnly,
    } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.noteRepository
      .createQueryBuilder('note')
      .leftJoinAndSelect('note.author', 'author')
      .leftJoinAndSelect('note.studyGroup', 'studyGroup')
      .leftJoinAndSelect('note.course', 'course')
      .leftJoinAndSelect('note.lesson', 'lesson')
      .leftJoinAndSelect('note.collaborators', 'collaborators')
      .leftJoinAndSelect('collaborators.user', 'collaboratorUser');

    // Filter by user's accessible notes
    queryBuilder.andWhere(
      '(note.authorId = :userId OR collaborators.userId = :userId OR (note.type = :sharedType AND note.studyGroupId IN (SELECT sgm.studyGroupId FROM study_group_members sgm WHERE sgm.userId = :userId AND sgm.status = :memberStatus)))',
      {
        userId: user.sub,
        sharedType: 'shared',
        memberStatus: 'active',
      },
    );

    if (type) {
      queryBuilder.andWhere('note.type = :type', { type });
    }

    if (status) {
      queryBuilder.andWhere('note.status = :status', { status });
    }

    if (studyGroupId) {
      queryBuilder.andWhere('note.studyGroupId = :studyGroupId', { studyGroupId });
    }

    if (courseId) {
      queryBuilder.andWhere('note.courseId = :courseId', { courseId });
    }

    if (lessonId) {
      queryBuilder.andWhere('note.lessonId = :lessonId', { lessonId });
    }

    if (search) {
      queryBuilder.andWhere('(note.title LIKE :search OR note.content LIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (tags && tags.length > 0) {
      const tagConditions = tags.map((tag, index) => `note.tags LIKE :tag${index}`).join(' OR ');

      const tagParams = tags.reduce((params, tag, index) => {
        params[`tag${index}`] = `%"${tag}"%`;
        return params;
      }, {});

      queryBuilder.andWhere(`(${tagConditions})`, tagParams);
    }

    if (templatesOnly) {
      queryBuilder.andWhere('note.isTemplate = :isTemplate', { isTemplate: true });
    }

    queryBuilder.skip(skip).take(limit).orderBy('note.updatedAt', 'DESC');

    const [data, total] = await queryBuilder.getManyAndCount();

    // Parse JSON fields
    data.forEach(note => {
      if (note.tags) note.tags = JSON.parse(note.tags);
    });

    return { data, total };
  }

  async findOne(id: string, user: UserPayload): Promise<CollaborativeNote> {
    const note = await this.noteRepository.findOne({
      where: { id },
      relations: [
        'author',
        'studyGroup',
        'course',
        'lesson',
        'collaborators',
        'collaborators.user',
      ],
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    // Check access permissions
    await this.checkNoteAccess(note, user.sub);

    // Parse JSON fields
    if (note.tags) note.tags = JSON.parse(note.tags);

    return note;
  }

  async update(
    id: string,
    updateDto: UpdateCollaborativeNoteDto,
    user: UserPayload,
  ): Promise<CollaborativeNote> {
    const note = await this.findOne(id, user);

    // Check edit permissions
    await this.checkNoteEditPermission(note, user.sub);

    const updateData = {
      ...updateDto,
      tags: updateDto.tags ? JSON.stringify(updateDto.tags) : note.tags,
      version: note.version + 1,
      lastEditedAt: new Date(),
      lastEditedBy: user.sub,
      updatedBy: user.sub,
    };

    await this.noteRepository.update(id, updateData);
    return this.findOne(id, user);
  }

  async delete(id: string, user: UserPayload): Promise<void> {
    const note = await this.findOne(id, user);

    // Only author can delete
    if (note.authorId !== user.sub) {
      throw new ForbiddenException('Only the author can delete this note');
    }

    await this.noteRepository.update(id, {
      status: NoteStatus.DELETED,
      updatedBy: user.sub,
    });
  }

  async shareNote(id: string, shareDto: ShareNoteDto, user: UserPayload): Promise<void> {
    const note = await this.findOne(id, user);

    // Check permissions to share
    if (note.authorId !== user.sub) {
      throw new ForbiddenException('Only the author can share this note');
    }

    // Remove existing collaborators not in the new list
    const existingCollaborators = await this.collaboratorRepository.find({
      where: { noteId: id },
    });

    const collaboratorsToRemove = existingCollaborators.filter(
      collab => !shareDto.userIds.includes(collab.userId),
    );

    if (collaboratorsToRemove.length > 0) {
      await this.collaboratorRepository.remove(collaboratorsToRemove);
    }

    // Add or update collaborators
    for (const userId of shareDto.userIds) {
      const existingCollaborator = await this.collaboratorRepository.findOne({
        where: { noteId: id, userId },
      });

      if (existingCollaborator) {
        await this.collaboratorRepository.update(existingCollaborator.id, {
          permission: shareDto.permission,
          status: 'invited',
          invitedAt: new Date(),
        });
      } else {
        const collaborator = this.collaboratorRepository.create({
          noteId: id,
          userId,
          permission: shareDto.permission,
          status: 'invited',
          invitedAt: new Date(),
        });
        await this.collaboratorRepository.save(collaborator);
      }
    }
  }

  async acceptCollaboration(noteId: string, user: UserPayload): Promise<void> {
    const collaborator = await this.collaboratorRepository.findOne({
      where: { noteId, userId: user.sub, status: 'invited' },
    });

    if (!collaborator) {
      throw new NotFoundException('Collaboration invitation not found');
    }

    await this.collaboratorRepository.update(collaborator.id, {
      status: 'active',
      acceptedAt: new Date(),
      lastAccessAt: new Date(),
    });
  }

  async createFromTemplate(templateId: string, user: UserPayload): Promise<CollaborativeNote> {
    const template = await this.noteRepository.findOne({
      where: { id: templateId, isTemplate: true },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    const note = this.noteRepository.create({
      title: `${template.title} (Copy)`,
      content: template.content,
      contentHtml: template.contentHtml,
      type: template.type,
      authorId: user.sub,
      templateId: template.id,
      tags: template.tags,
      lastEditedAt: new Date(),
      lastEditedBy: user.sub,
    });

    return this.noteRepository.save(note);
  }

  private async checkNoteAccess(note: CollaborativeNote, userId: string): Promise<boolean> {
    // Author always has access
    if (note.authorId === userId) {
      return true;
    }

    // Check if user is a collaborator
    const collaborator = note.collaborators?.find(
      c => c.userId === userId && c.status === 'active',
    );
    if (collaborator) {
      return true;
    }

    // Check if note is shared in a study group user belongs to
    if (note.type === 'shared' && note.studyGroupId) {
      // Would check study group membership here
      return true; // Simplified for now
    }

    throw new ForbiddenException('Access denied to this note');
  }

  private async checkNoteEditPermission(note: CollaborativeNote, userId: string): Promise<boolean> {
    // Author always has edit access
    if (note.authorId === userId) {
      return true;
    }

    // Check collaborator permissions
    const collaborator = note.collaborators?.find(
      c => c.userId === userId && c.status === 'active',
    );
    if (collaborator && ['edit', 'admin'].includes(collaborator.permission)) {
      return true;
    }

    throw new ForbiddenException('You do not have edit permissions for this note');
  }
}
