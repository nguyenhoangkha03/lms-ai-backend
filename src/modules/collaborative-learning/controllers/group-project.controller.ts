import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GroupProjectService } from '../services/group-project.service';
import {
  CreateGroupProjectDto,
  UpdateGroupProjectDto,
  CreateProjectTaskDto,
  UpdateProjectTaskDto,
  ManageProjectMemberDto,
  GroupProjectQueryDto,
} from '../dto/group-project.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { UserPayload } from '@/common/interfaces/user-payload.interface';

@ApiTags('Group Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('group-projects')
export class GroupProjectController {
  constructor(private readonly projectService: GroupProjectService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new group project' })
  @ApiResponse({ status: 201, description: 'Project created successfully' })
  async create(@Body() createProjectDto: CreateGroupProjectDto, @CurrentUser() user: UserPayload) {
    return this.projectService.create(createProjectDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all accessible projects' })
  @ApiResponse({ status: 200, description: 'Projects retrieved successfully' })
  async findAll(@Query() query: GroupProjectQueryDto, @CurrentUser() user: UserPayload) {
    return this.projectService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  @ApiResponse({ status: 200, description: 'Project retrieved successfully' })
  async findOne(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.projectService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update project' })
  @ApiResponse({ status: 200, description: 'Project updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateGroupProjectDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.projectService.update(id, updateProjectDto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete project' })
  @ApiResponse({ status: 200, description: 'Project deleted successfully' })
  async remove(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    await this.projectService.delete(id, user);
    return { message: 'Project deleted successfully' };
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add project member' })
  @ApiResponse({ status: 201, description: 'Member added successfully' })
  async addMember(
    @Param('id') id: string,
    @Body() memberDto: ManageProjectMemberDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.projectService.addMember(id, memberDto, user);
  }

  @Patch(':id/members/:memberId')
  @ApiOperation({ summary: 'Update project member' })
  @ApiResponse({ status: 200, description: 'Member updated successfully' })
  async updateMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() memberDto: Partial<ManageProjectMemberDto>,
    @CurrentUser() user: UserPayload,
  ) {
    return this.projectService.updateMember(id, memberId, memberDto, user);
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: 'Remove project member' })
  @ApiResponse({ status: 200, description: 'Member removed successfully' })
  async removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.projectService.removeMember(id, memberId, user);
    return { message: 'Member removed successfully' };
  }

  @Post(':id/tasks')
  @ApiOperation({ summary: 'Create project task' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  async createTask(
    @Param('id') projectId: string,
    @Body() createTaskDto: CreateProjectTaskDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.projectService.createTask(projectId, createTaskDto, user);
  }

  @Get(':id/tasks')
  @ApiOperation({ summary: 'Get project tasks' })
  @ApiResponse({ status: 200, description: 'Tasks retrieved successfully' })
  async getProjectTasks(@Param('id') projectId: string, @CurrentUser() user: UserPayload) {
    return this.projectService.getProjectTasks(projectId, user);
  }

  @Patch('tasks/:taskId')
  @ApiOperation({ summary: 'Update project task' })
  @ApiResponse({ status: 200, description: 'Task updated successfully' })
  async updateTask(
    @Param('taskId') taskId: string,
    @Body() updateTaskDto: UpdateProjectTaskDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.projectService.updateTask(taskId, updateTaskDto, user);
  }

  @Delete('tasks/:taskId')
  @ApiOperation({ summary: 'Delete project task' })
  @ApiResponse({ status: 200, description: 'Task deleted successfully' })
  async removeTask(@Param('taskId') taskId: string, @CurrentUser() user: UserPayload) {
    await this.projectService.deleteTask(taskId, user);
    return { message: 'Task deleted successfully' };
  }

  @Get(':id/dashboard')
  @ApiOperation({ summary: 'Get project dashboard data' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  async getProjectDashboard(@Param('id') projectId: string, @CurrentUser() user: UserPayload) {
    return this.projectService.getProjectDashboard(projectId, user);
  }
}
