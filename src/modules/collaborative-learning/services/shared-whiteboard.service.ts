import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SharedWhiteboard } from '../entities/shared-whiteboard.entity';
import { WhiteboardElement } from '../entities/whiteboard-element.entity';
import {
  CreateWhiteboardDto,
  UpdateWhiteboardDto,
  CreateWhiteboardElementDto,
  WhiteboardQueryDto,
} from '../dto/whiteboard.dto';
import { UserPayload } from '@/common/interfaces/user-payload.interface';

@Injectable()
export class SharedWhiteboardService {
  constructor(
    @InjectRepository(SharedWhiteboard)
    private readonly whiteboardRepository: Repository<SharedWhiteboard>,
    @InjectRepository(WhiteboardElement)
    private readonly elementRepository: Repository<WhiteboardElement>,
  ) {}

  async create(createDto: CreateWhiteboardDto, user: UserPayload): Promise<SharedWhiteboard> {
    const whiteboard = this.whiteboardRepository.create({
      ...createDto,
      creatorId: user.sub,
      lastEditedAt: new Date(),
      lastEditedBy: user.sub,
    });

    return this.whiteboardRepository.save(whiteboard);
  }

  async findAll(
    query: WhiteboardQueryDto,
    user: UserPayload,
  ): Promise<{ data: SharedWhiteboard[]; total: number }> {
    const { page = 1, limit = 10, studyGroupId, search, status } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.whiteboardRepository
      .createQueryBuilder('wb')
      .leftJoinAndSelect('wb.creator', 'creator')
      .leftJoinAndSelect('wb.studyGroup', 'studyGroup');

    // Filter by user's accessible whiteboards
    queryBuilder.andWhere(
      '(wb.creatorId = :userId OR wb.studyGroupId IN (SELECT sgm.studyGroupId FROM study_group_members sgm WHERE sgm.userId = :userId AND sgm.status = :memberStatus))',
      { userId: user.sub, memberStatus: 'active' },
    );

    if (studyGroupId) {
      queryBuilder.andWhere('wb.studyGroupId = :studyGroupId', { studyGroupId });
    }

    if (search) {
      queryBuilder.andWhere('(wb.name LIKE :search OR wb.description LIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (status) {
      queryBuilder.andWhere('wb.status = :status', { status });
    } else {
      queryBuilder.andWhere('wb.status != :deletedStatus', { deletedStatus: 'deleted' });
    }

    queryBuilder.skip(skip).take(limit).orderBy('wb.lastEditedAt', 'DESC');

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
  }

  async findOne(id: string, user: UserPayload): Promise<SharedWhiteboard> {
    const whiteboard = await this.whiteboardRepository.findOne({
      where: { id },
      relations: ['creator', 'studyGroup', 'elements', 'elements.creator'],
    });

    if (!whiteboard) {
      throw new NotFoundException('Whiteboard not found');
    }

    // Check access permissions
    await this.checkWhiteboardAccess(whiteboard, user.sub);

    return whiteboard;
  }

  async update(
    id: string,
    updateDto: UpdateWhiteboardDto,
    user: UserPayload,
  ): Promise<SharedWhiteboard> {
    const whiteboard = await this.findOne(id, user);

    // Check edit permissions
    await this.checkWhiteboardEditPermission(whiteboard, user.sub);

    const updateData = {
      ...updateDto,
      version: whiteboard.version + 1,
      lastEditedAt: new Date(),
      lastEditedBy: user.sub,
      updatedBy: user.sub,
    };

    if (updateDto.canvasData) {
      updateData.canvasData = JSON.stringify(updateDto.canvasData);
    }

    await this.whiteboardRepository.update(id, updateData);
    return this.findOne(id, user);
  }

  async delete(id: string, user: UserPayload): Promise<void> {
    const whiteboard = await this.findOne(id, user);

    // Only creator can delete
    if (whiteboard.creatorId !== user.sub) {
      throw new ForbiddenException('Only the creator can delete this whiteboard');
    }

    await this.whiteboardRepository.update(id, {
      status: 'deleted',
      updatedBy: user.sub,
    });
  }

  async createElement(
    createDto: CreateWhiteboardElementDto,
    user: UserPayload,
  ): Promise<WhiteboardElement> {
    const whiteboard = await this.findOne(createDto.whiteboardId, user);

    // Check edit permissions
    await this.checkWhiteboardEditPermission(whiteboard, user.sub);

    const element = this.elementRepository.create({
      ...createDto,
      creatorId: user.sub,
      elementData: JSON.stringify(createDto.elementData),
    });

    const savedElement = await this.elementRepository.save(element);

    // Update whiteboard version and last edited
    await this.whiteboardRepository.update(whiteboard.id, {
      version: whiteboard.version + 1,
      lastEditedAt: new Date(),
      lastEditedBy: user.sub,
    });

    return savedElement;
  }

  async updateElement(
    elementId: string,
    updateData: Partial<CreateWhiteboardElementDto>,
    user: UserPayload,
  ): Promise<WhiteboardElement | null> {
    const element = await this.elementRepository.findOne({
      where: { id: elementId },
      relations: ['whiteboard'],
    });

    if (!element) {
      throw new NotFoundException('Whiteboard element not found');
    }

    // Check edit permissions
    await this.checkWhiteboardEditPermission(element.whiteboard, user.sub);

    const updates = { ...updateData };
    if (updateData.elementData) {
      updates.elementData = JSON.stringify(updateData.elementData);
    }

    await this.elementRepository.update(elementId, updates);

    // Update whiteboard version
    await this.whiteboardRepository.update(element.whiteboard.id, {
      version: element.whiteboard.version + 1,
      lastEditedAt: new Date(),
      lastEditedBy: user.sub,
    });

    return this.elementRepository.findOne({
      where: { id: elementId },
      relations: ['creator'],
    });
  }

  async deleteElement(elementId: string, user: UserPayload): Promise<void> {
    const element = await this.elementRepository.findOne({
      where: { id: elementId },
      relations: ['whiteboard'],
    });

    if (!element) {
      throw new NotFoundException('Whiteboard element not found');
    }

    // Check permissions - can delete own elements or if has admin access
    if (element.creatorId !== user.sub) {
      await this.checkWhiteboardEditPermission(element.whiteboard, user.sub);
    }

    await this.elementRepository.delete(elementId);

    // Update whiteboard version
    await this.whiteboardRepository.update(element.whiteboard.id, {
      version: element.whiteboard.version + 1,
      lastEditedAt: new Date(),
      lastEditedBy: user.sub,
    });
  }

  private async checkWhiteboardAccess(
    whiteboard: SharedWhiteboard,
    userId: string,
  ): Promise<boolean> {
    // Creator always has access
    if (whiteboard.creatorId === userId) {
      return true;
    }

    // If part of study group, check membership
    if (whiteboard.studyGroupId) {
      // Would check study group membership here
      return true; // Simplified for now
    }

    throw new ForbiddenException('Access denied to this whiteboard');
  }

  private async checkWhiteboardEditPermission(
    whiteboard: SharedWhiteboard,
    userId: string,
  ): Promise<boolean> {
    if (whiteboard.isLocked) {
      throw new ForbiddenException('Whiteboard is locked');
    }

    // Creator always has edit access
    if (whiteboard.creatorId === userId) {
      return true;
    }

    // Check permissions based on default permission and study group role
    if (whiteboard.defaultPermission === 'view_only') {
      throw new ForbiddenException('You only have view access to this whiteboard');
    }

    return true;
  }
}
