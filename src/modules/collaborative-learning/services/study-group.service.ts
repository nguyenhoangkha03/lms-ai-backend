import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudyGroup } from '../entities/study-group.entity';
import { StudyGroupMember } from '../entities/study-group-member.entity';
import {
  CreateStudyGroupDto,
  UpdateStudyGroupDto,
  StudyGroupQueryDto,
  JoinStudyGroupDto,
  ManageStudyGroupMemberDto,
} from '../dto/study-group.dto';
import { StudyGroupStatus, StudyGroupRole } from '@/common/enums/collaborative.enums';
import { UserPayload } from '@/common/interfaces/user-payload.interface';
import { generateInviteCode } from '@/common/utils/code-generator.util';

@Injectable()
export class StudyGroupService {
  constructor(
    @InjectRepository(StudyGroup)
    private readonly studyGroupRepository: Repository<StudyGroup>,
    @InjectRepository(StudyGroupMember)
    private readonly memberRepository: Repository<StudyGroupMember>,
  ) {}

  async create(createDto: CreateStudyGroupDto, user: UserPayload): Promise<StudyGroup> {
    const inviteCode = generateInviteCode();

    const studyGroup = this.studyGroupRepository.create({
      ...createDto,
      creatorId: user.sub,
      inviteCode,
      memberCount: 1,
      tags: createDto.tags ? JSON.stringify(createDto.tags) : null,
      goals: createDto.goals ? JSON.stringify(createDto.goals) : null,
      rules: createDto.rules ? JSON.stringify(createDto.rules) : null,
      schedule: createDto.schedule ? JSON.stringify(createDto.schedule) : null,
      lastActivityAt: new Date(),
    } as StudyGroup);

    const savedGroup = await this.studyGroupRepository.save(studyGroup);

    const ownerMember = this.memberRepository.create({
      studyGroupId: savedGroup.id,
      userId: user.sub,
      role: StudyGroupRole.OWNER,
      status: 'active',
      contributionScore: 0,
      lastActiveAt: new Date(),
    });

    await this.memberRepository.save(ownerMember);

    return savedGroup;
  }

  async findAll(
    query: StudyGroupQueryDto,
    user?: UserPayload,
  ): Promise<{ data: StudyGroup[]; total: number }> {
    const { page = 1, limit = 10, type, status, courseId, search, tags, joinableOnly } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.studyGroupRepository
      .createQueryBuilder('sg')
      .leftJoinAndSelect('sg.creator', 'creator')
      .leftJoinAndSelect('sg.course', 'course')
      .leftJoinAndSelect('sg.members', 'members')
      .leftJoinAndSelect('members.user', 'memberUser');

    if (type) {
      queryBuilder.andWhere('sg.type = :type', { type });
    }

    if (status) {
      queryBuilder.andWhere('sg.status = :status', { status });
    } else if (joinableOnly) {
      queryBuilder.andWhere('sg.status IN (:...statuses)', {
        statuses: [StudyGroupStatus.OPEN],
      });
    }

    if (courseId) {
      queryBuilder.andWhere('sg.courseId = :courseId', { courseId });
    }

    if (search) {
      queryBuilder.andWhere('(sg.name LIKE :search OR sg.description LIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (tags && tags.length > 0) {
      const tagConditions = tags.map((tag, index) => `sg.tags LIKE :tag${index}`).join(' OR ');

      const tagParams = tags.reduce((params, tag, index) => {
        params[`tag${index}`] = `%"${tag}"%`;
        return params;
      }, {});

      queryBuilder.andWhere(`(${tagConditions})`, tagParams);
    }

    if (joinableOnly && user) {
      const userGroupIds = await this.memberRepository
        .createQueryBuilder('member')
        .select('member.studyGroupId')
        .where('member.userId = :userId', { userId: user.sub })
        .andWhere('member.status = :status', { status: 'active' })
        .getRawMany();

      if (userGroupIds.length > 0) {
        const groupIds = userGroupIds.map(item => item.member_studyGroupId);
        queryBuilder.andWhere('sg.id NOT IN (:...excludeIds)', { excludeIds: groupIds });
      }

      queryBuilder.andWhere('(sg.isPrivate = false OR sg.memberCount < sg.maxMembers)');
    }

    queryBuilder.skip(skip).take(limit).orderBy('sg.lastActivityAt', 'DESC');

    const [data, total] = await queryBuilder.getManyAndCount();

    // Parse JSON fields
    data.forEach(group => {
      if (group.tags) group.tags = JSON.parse(group.tags);
      if (group.goals) group.goals = JSON.parse(group.goals);
      if (group.rules) group.rules = JSON.parse(group.rules);
      if (group.schedule) group.schedule = JSON.parse(group.schedule);
    });

    return { data, total };
  }

  async findOne(id: string): Promise<StudyGroup> {
    const studyGroup = await this.studyGroupRepository.findOne({
      where: { id },
      relations: ['creator', 'course', 'members', 'members.user'],
    });

    if (!studyGroup) {
      throw new NotFoundException('Study group not found');
    }

    // Parse JSON fields
    if (studyGroup.tags) studyGroup.tags = JSON.parse(studyGroup.tags);
    if (studyGroup.goals) studyGroup.goals = JSON.parse(studyGroup.goals);
    if (studyGroup.rules) studyGroup.rules = JSON.parse(studyGroup.rules);
    if (studyGroup.schedule) studyGroup.schedule = JSON.parse(studyGroup.schedule);

    return studyGroup;
  }

  async update(id: string, updateDto: UpdateStudyGroupDto, user: UserPayload): Promise<StudyGroup> {
    const studyGroup = await this.findOne(id);

    // Check permissions
    await this.checkMemberPermission(id, user.sub, [
      StudyGroupRole.OWNER,
      StudyGroupRole.MODERATOR,
    ]);

    const updateData = {
      ...updateDto,
      tags: updateDto.tags ? JSON.stringify(updateDto.tags) : studyGroup.tags,
      goals: updateDto.goals ? JSON.stringify(updateDto.goals) : studyGroup.goals,
      rules: updateDto.rules ? JSON.stringify(updateDto.rules) : studyGroup.rules,
      schedule: updateDto.schedule ? JSON.stringify(updateDto.schedule) : studyGroup.schedule,
      updatedBy: user.sub,
    };

    await this.studyGroupRepository.update(id, updateData);
    return this.findOne(id);
  }

  async delete(id: string, user: UserPayload): Promise<void> {
    const _studyGroup = await this.findOne(id);

    // Check permissions - only owner can delete
    await this.checkMemberPermission(id, user.sub, [StudyGroupRole.OWNER]);

    await this.studyGroupRepository.softDelete(id);
  }

  async join(id: string, joinDto: JoinStudyGroupDto, user: UserPayload): Promise<StudyGroupMember> {
    const studyGroup = await this.findOne(id);

    // Check if user is already a member
    const existingMember = await this.memberRepository.findOne({
      where: { studyGroupId: id, userId: user.sub },
    });

    if (existingMember && existingMember.status === 'active') {
      throw new BadRequestException('You are already a member of this group');
    }

    // Check group status and capacity
    if (studyGroup.status !== StudyGroupStatus.OPEN) {
      throw new BadRequestException('This group is not accepting new members');
    }

    if (studyGroup.memberCount >= studyGroup.maxMembers) {
      throw new BadRequestException('This group has reached its maximum capacity');
    }

    // Check invite code if group is private
    if (studyGroup.isPrivate && joinDto.inviteCode !== studyGroup.inviteCode) {
      throw new ForbiddenException('Invalid invite code');
    }

    const memberStatus = studyGroup.requiresApproval ? 'pending' : 'active';

    const member = this.memberRepository.create({
      studyGroupId: id,
      userId: user.sub,
      role: StudyGroupRole.MEMBER,
      status: memberStatus,
      contributionScore: 0,
      lastActiveAt: new Date(),
    });

    const savedMember = await this.memberRepository.save(member);

    // Update member count if approved
    if (memberStatus === 'active') {
      await this.studyGroupRepository.increment({ id }, 'memberCount', 1);
      await this.studyGroupRepository.update(id, { lastActivityAt: new Date() });
    }

    return savedMember;
  }

  async leave(id: string, user: UserPayload): Promise<void> {
    const member = await this.memberRepository.findOne({
      where: { studyGroupId: id, userId: user.sub, status: 'active' },
    });

    if (!member) {
      throw new NotFoundException('You are not a member of this group');
    }

    if (member.role === StudyGroupRole.OWNER) {
      throw new BadRequestException('Group owner cannot leave. Transfer ownership first.');
    }

    await this.memberRepository.update(member.id, {
      status: 'inactive',
      leftAt: new Date(),
    });

    await this.studyGroupRepository.decrement({ id }, 'memberCount', 1);
    await this.studyGroupRepository.update(id, { lastActivityAt: new Date() });
  }

  async manageMember(
    id: string,
    memberDto: ManageStudyGroupMemberDto,
    user: UserPayload,
  ): Promise<StudyGroupMember | null> {
    // Check permissions
    await this.checkMemberPermission(id, user.sub, [
      StudyGroupRole.OWNER,
      StudyGroupRole.MODERATOR,
    ]);

    const member = await this.memberRepository.findOne({
      where: { studyGroupId: id, userId: memberDto.userId },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    await this.memberRepository.update(member.id, {
      role: memberDto.role,
      updatedBy: user.sub,
    });

    return this.memberRepository.findOne({
      where: { id: member.id },
      relations: ['user'],
    });
  }

  private async checkMemberPermission(
    groupId: string,
    userId: string,
    allowedRoles: StudyGroupRole[],
  ): Promise<void> {
    const member = await this.memberRepository.findOne({
      where: { studyGroupId: groupId, userId, status: 'active' },
    });

    if (!member || !allowedRoles.includes(member.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }

  async generateNewInviteCode(id: string, user: UserPayload): Promise<{ inviteCode: string }> {
    await this.checkMemberPermission(id, user.sub, [
      StudyGroupRole.OWNER,
      StudyGroupRole.MODERATOR,
    ]);

    const newInviteCode = generateInviteCode();
    await this.studyGroupRepository.update(id, { inviteCode: newInviteCode });

    return { inviteCode: newInviteCode };
  }

  async getMyGroups(user: UserPayload): Promise<StudyGroup[]> {
    const memberGroups = await this.memberRepository.find({
      where: { userId: user.sub, status: 'active' },
      relations: ['studyGroup', 'studyGroup.creator', 'studyGroup.course'],
    });

    return memberGroups.map(member => {
      const group = member.studyGroup;
      // Parse JSON fields
      if (group.tags) group.tags = JSON.parse(group.tags);
      if (group.goals) group.goals = JSON.parse(group.goals);
      if (group.rules) group.rules = JSON.parse(group.rules);
      if (group.schedule) group.schedule = JSON.parse(group.schedule);
      return group;
    });
  }
}
