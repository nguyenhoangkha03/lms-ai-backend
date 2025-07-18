import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroupProject } from '../entities/group-project.entity';
import { ProjectMember } from '../entities/project-member.entity';
import { ProjectTask } from '../entities/project-task.entity';
import {
  CreateGroupProjectDto,
  UpdateGroupProjectDto,
  CreateProjectTaskDto,
  UpdateProjectTaskDto,
  ManageProjectMemberDto,
  GroupProjectQueryDto,
} from '../dto/group-project.dto';
import { ProjectRole, TaskStatus } from '@/common/enums/collaborative.enums';
import { UserPayload } from '@/common/interfaces/user-payload.interface';

@Injectable()
export class GroupProjectService {
  constructor(
    @InjectRepository(GroupProject)
    private readonly projectRepository: Repository<GroupProject>,
    @InjectRepository(ProjectMember)
    private readonly memberRepository: Repository<ProjectMember>,
    @InjectRepository(ProjectTask)
    private readonly taskRepository: Repository<ProjectTask>,
  ) {}

  async create(createDto: CreateGroupProjectDto, user: UserPayload): Promise<GroupProject> {
    const project = this.projectRepository.create({
      ...createDto,
      leaderId: user.sub,
      objectives: createDto.objectives ? JSON.stringify(createDto.objectives) : null,
      deliverables: createDto.deliverables ? JSON.stringify(createDto.deliverables) : null,
      resources: createDto.resources ? JSON.stringify(createDto.resources) : null,
      milestones: createDto.milestones ? JSON.stringify(createDto.milestones) : null,
    } as GroupProject);

    const savedProject = await this.projectRepository.save(project);

    // Add creator as leader
    const leaderMember = this.memberRepository.create({
      projectId: savedProject.id,
      userId: user.sub,
      role: ProjectRole.LEADER,
      status: 'active',
      contributionScore: 0,
      lastActiveAt: new Date(),
    });

    await this.memberRepository.save(leaderMember);

    return savedProject;
  }

  async findAll(
    query: GroupProjectQueryDto,
    user: UserPayload,
  ): Promise<{ data: GroupProject[]; total: number }> {
    const { page = 1, limit = 10, status, studyGroupId, courseId, search } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.leader', 'leader')
      .leftJoinAndSelect('project.studyGroup', 'studyGroup')
      .leftJoinAndSelect('project.course', 'course')
      .leftJoinAndSelect('project.members', 'members')
      .leftJoinAndSelect('members.user', 'memberUser');

    // Filter by user's accessible projects
    queryBuilder.andWhere('(project.leaderId = :userId OR members.userId = :userId)', {
      userId: user.sub,
    });

    if (status) {
      queryBuilder.andWhere('project.status = :status', { status });
    }

    if (studyGroupId) {
      queryBuilder.andWhere('project.studyGroupId = :studyGroupId', { studyGroupId });
    }

    if (courseId) {
      queryBuilder.andWhere('project.courseId = :courseId', { courseId });
    }

    if (search) {
      queryBuilder.andWhere('(project.name LIKE :search OR project.description LIKE :search)', {
        search: `%${search}%`,
      });
    }

    queryBuilder.skip(skip).take(limit).orderBy('project.createdAt', 'DESC');

    const [data, total] = await queryBuilder.getManyAndCount();

    // Parse JSON fields
    data.forEach(project => {
      if (project.objectives) project.objectives = JSON.parse(project.objectives);
      if (project.deliverables) project.deliverables = JSON.parse(project.deliverables);
      if (project.resources) project.resources = JSON.parse(project.resources);
      if (project.milestones) project.milestones = JSON.parse(project.milestones);
    });

    return { data, total };
  }

  async findOne(id: string, user: UserPayload): Promise<GroupProject> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: [
        'leader',
        'studyGroup',
        'course',
        'members',
        'members.user',
        'tasks',
        'tasks.assignee',
      ],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check access permissions
    await this.checkProjectAccess(project, user.sub);

    // Parse JSON fields
    if (project.objectives) project.objectives = JSON.parse(project.objectives);
    if (project.deliverables) project.deliverables = JSON.parse(project.deliverables);
    if (project.resources) project.resources = JSON.parse(project.resources);
    if (project.milestones) project.milestones = JSON.parse(project.milestones);

    return project;
  }

  async update(
    id: string,
    updateDto: UpdateGroupProjectDto,
    user: UserPayload,
  ): Promise<GroupProject> {
    const project = await this.findOne(id, user);

    // Check edit permissions
    await this.checkProjectEditPermission(project, user.sub);

    const updateData = {
      ...updateDto,
      objectives: updateDto.objectives ? JSON.stringify(updateDto.objectives) : project.objectives,
      deliverables: updateDto.deliverables
        ? JSON.stringify(updateDto.deliverables)
        : project.deliverables,
      resources: updateDto.resources ? JSON.stringify(updateDto.resources) : project.resources,
      milestones: updateDto.milestones ? JSON.stringify(updateDto.milestones) : project.milestones,
      updatedBy: user.sub,
    };

    await this.projectRepository.update(id, updateData);
    return this.findOne(id, user);
  }

  async delete(id: string, user: UserPayload): Promise<void> {
    const project = await this.findOne(id, user);

    // Only leader can delete
    if (project.leaderId !== user.sub) {
      throw new ForbiddenException('Only the project leader can delete this project');
    }

    await this.projectRepository.softDelete(id);
  }

  async addMember(
    id: string,
    memberDto: ManageProjectMemberDto,
    user: UserPayload,
  ): Promise<ProjectMember> {
    const project = await this.findOne(id, user);

    // Check permissions
    await this.checkProjectEditPermission(project, user.sub);

    // Check if user is already a member
    const existingMember = await this.memberRepository.findOne({
      where: { projectId: id, userId: memberDto.userId },
    });

    if (existingMember) {
      throw new BadRequestException('User is already a project member');
    }

    const member = this.memberRepository.create({
      projectId: id,
      userId: memberDto.userId,
      role: memberDto.role,
      status: 'active',
      contributionScore: 0,
      responsibilities: memberDto.responsibilities
        ? JSON.stringify(memberDto.responsibilities)
        : null,
      lastActiveAt: new Date(),
    } as ProjectMember);

    return this.memberRepository.save(member);
  }

  async updateMember(
    id: string,
    memberId: string,
    memberDto: Partial<ManageProjectMemberDto>,
    user: UserPayload,
  ): Promise<ProjectMember | null> {
    const project = await this.findOne(id, user);

    // Check permissions
    await this.checkProjectEditPermission(project, user.sub);

    const member = await this.memberRepository.findOne({
      where: { id: memberId, projectId: id },
    });

    if (!member) {
      throw new NotFoundException('Project member not found');
    }

    const updateData = {
      ...memberDto,
      responsibilities: memberDto.responsibilities
        ? JSON.stringify(memberDto.responsibilities)
        : member.responsibilities,
      updatedBy: user.sub,
    };

    await this.memberRepository.update(memberId, updateData);

    return this.memberRepository.findOne({
      where: { id: memberId },
      relations: ['user'],
    });
  }

  async removeMember(id: string, memberId: string, user: UserPayload): Promise<void> {
    const project = await this.findOne(id, user);

    // Check permissions
    await this.checkProjectEditPermission(project, user.sub);

    const member = await this.memberRepository.findOne({
      where: { id: memberId, projectId: id },
    });

    if (!member) {
      throw new NotFoundException('Project member not found');
    }

    if (member.role === ProjectRole.LEADER) {
      throw new BadRequestException('Cannot remove project leader. Transfer leadership first.');
    }

    await this.memberRepository.update(memberId, {
      status: 'removed',
      updatedBy: user.sub,
    });
  }

  async createTask(
    projectId: string,
    createTaskDto: CreateProjectTaskDto,
    user: UserPayload,
  ): Promise<ProjectTask> {
    const project = await this.findOne(projectId, user);

    // Check permissions
    await this.checkProjectEditPermission(project, user.sub);

    const task = this.taskRepository.create({
      ...createTaskDto,
      projectId,
      creatorId: user.sub,
      dependencies: createTaskDto.dependencies ? JSON.stringify(createTaskDto.dependencies) : null,
    } as ProjectTask);

    return this.taskRepository.save(task);
  }

  async getProjectTasks(projectId: string, user: UserPayload): Promise<ProjectTask[]> {
    const _project = await this.findOne(projectId, user);

    const tasks = await this.taskRepository.find({
      where: { projectId },
      relations: ['assignee', 'creator'],
      order: { createdAt: 'ASC' },
    });

    // Parse JSON fields
    tasks.forEach(task => {
      if (task.dependencies) task.dependencies = JSON.parse(task.dependencies);
      if (task.attachments) task.attachments = JSON.parse(task.attachments);
      if (task.comments) task.comments = JSON.parse(task.comments);
    });

    return tasks;
  }

  async updateTask(
    taskId: string,
    updateTaskDto: UpdateProjectTaskDto,
    user: UserPayload,
  ): Promise<ProjectTask | null> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['project'],
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Check permissions
    await this.checkProjectEditPermission(task.project, user.sub);

    const updateData: Partial<ProjectTask> = {
      ...updateTaskDto,
      dependencies: updateTaskDto.dependencies
        ? JSON.stringify(updateTaskDto.dependencies)
        : task.dependencies,
    };

    // Update completion date if status changed to done
    if (updateTaskDto.status === TaskStatus.DONE && task.status !== TaskStatus.DONE) {
      updateData.completedAt = new Date();
    }

    await this.taskRepository.update(taskId, updateData);

    // Update project progress
    await this.updateProjectProgress(task.projectId);

    return this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['assignee', 'creator'],
    });
  }

  async deleteTask(taskId: string, user: UserPayload): Promise<void> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['project'],
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Check permissions
    await this.checkProjectEditPermission(task.project, user.sub);

    await this.taskRepository.delete(taskId);

    // Update project progress
    await this.updateProjectProgress(task.projectId);
  }

  async getProjectDashboard(projectId: string, user: UserPayload): Promise<any> {
    const project = await this.findOne(projectId, user);

    const tasks = await this.taskRepository.find({
      where: { projectId },
      relations: ['assignee'],
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === TaskStatus.DONE).length;
    const inProgressTasks = tasks.filter(task => task.status === TaskStatus.IN_PROGRESS).length;
    const overdueTasks = tasks.filter(
      task => task.dueDate && task.dueDate < new Date() && task.status !== TaskStatus.DONE,
    ).length;

    const members = await this.memberRepository.find({
      where: { projectId, status: 'active' },
      relations: ['user'],
    });

    const memberStats = members.map(member => ({
      user: member.user,
      role: member.role,
      tasksAssigned: tasks.filter(task => task.assigneeId === member.userId).length,
      tasksCompleted: tasks.filter(
        task => task.assigneeId === member.userId && task.status === TaskStatus.DONE,
      ).length,
      contributionScore: member.contributionScore,
    }));

    return {
      project,
      statistics: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        overdueTasks,
        progressPercentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      },
      memberStats,
      recentTasks: tasks.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 5),
    };
  }

  private async checkProjectAccess(project: GroupProject, userId: string): Promise<boolean> {
    // Leader always has access
    if (project.leaderId === userId) {
      return true;
    }

    // Check if user is a member
    const member = project.members?.find(m => m.userId === userId && m.status === 'active');
    if (member) {
      return true;
    }

    throw new ForbiddenException('Access denied to this project');
  }

  private async checkProjectEditPermission(
    project: GroupProject,
    userId: string,
  ): Promise<boolean> {
    // Leader always has edit access
    if (project.leaderId === userId) {
      return true;
    }

    // Check if user is a member with appropriate role
    const member = project.members?.find(m => m.userId === userId && m.status === 'active');
    if (member && [ProjectRole.LEADER, ProjectRole.MEMBER].includes(member.role)) {
      return true;
    }

    throw new ForbiddenException('You do not have edit permissions for this project');
  }

  private async updateProjectProgress(projectId: string): Promise<void> {
    const tasks = await this.taskRepository.find({
      where: { projectId },
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === TaskStatus.DONE).length;
    const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    await this.projectRepository.update(projectId, {
      progressPercentage,
    });
  }
}
