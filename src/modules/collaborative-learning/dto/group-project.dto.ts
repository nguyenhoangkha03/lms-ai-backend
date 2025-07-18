import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsUUID,
  IsArray,
  IsDate,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ProjectStatus,
  ProjectRole,
  TaskStatus,
  TaskPriority,
} from '@/common/enums/collaborative.enums';
import { PaginationDto } from '@/common/dto/pagination.dto';

export class CreateGroupProjectDto {
  @ApiProperty({ description: 'Project name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Project description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Associated study group ID' })
  @IsOptional()
  @IsUUID()
  studyGroupId?: string;

  @ApiPropertyOptional({ description: 'Associated course ID' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({ description: 'Project start date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({ description: 'Project due date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueDate?: Date;

  @ApiPropertyOptional({ description: 'Project objectives' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  objectives?: string[];

  @ApiPropertyOptional({ description: 'Project deliverables' })
  @IsOptional()
  @IsArray()
  deliverables?: any[];

  @ApiPropertyOptional({ description: 'Project resources' })
  @IsOptional()
  @IsArray()
  resources?: any[];

  @ApiPropertyOptional({ description: 'Project milestones' })
  @IsOptional()
  @IsArray()
  milestones?: any[];
}

export class UpdateGroupProjectDto {
  @ApiPropertyOptional({ description: 'Project name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Project description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ProjectStatus, description: 'Project status' })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({ description: 'Project start date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({ description: 'Project due date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueDate?: Date;

  @ApiPropertyOptional({ description: 'Project progress percentage', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progressPercentage?: number;

  @ApiPropertyOptional({ description: 'Project objectives' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  objectives?: string[];

  @ApiPropertyOptional({ description: 'Project deliverables' })
  @IsOptional()
  @IsArray()
  deliverables?: any[];

  @ApiPropertyOptional({ description: 'Project resources' })
  @IsOptional()
  @IsArray()
  resources?: any[];

  @ApiPropertyOptional({ description: 'Project milestones' })
  @IsOptional()
  @IsArray()
  milestones?: any[];
}

export class CreateProjectTaskDto {
  @ApiProperty({ description: 'Task title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Task description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: TaskPriority, description: 'Task priority' })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ description: 'Task assignee ID' })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({ description: 'Task due date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueDate?: Date;

  @ApiPropertyOptional({ description: 'Estimated hours', minimum: 0, maximum: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  estimatedHours?: number;

  @ApiPropertyOptional({ description: 'Task dependencies' })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  dependencies?: string[];
}

export class UpdateProjectTaskDto {
  @ApiPropertyOptional({ description: 'Task title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Task description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: TaskStatus, description: 'Task status' })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority, description: 'Task priority' })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ description: 'Task assignee ID' })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({ description: 'Task due date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueDate?: Date;

  @ApiPropertyOptional({ description: 'Estimated hours', minimum: 0, maximum: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  estimatedHours?: number;

  @ApiPropertyOptional({ description: 'Actual hours spent', minimum: 0, maximum: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  actualHours?: number;

  @ApiPropertyOptional({ description: 'Task dependencies' })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  dependencies?: string[];
}

export class ManageProjectMemberDto {
  @ApiProperty({ description: 'User ID' })
  @IsUUID()
  userId: string;

  @ApiProperty({ enum: ProjectRole, description: 'Member role' })
  @IsEnum(ProjectRole)
  role: ProjectRole;

  @ApiPropertyOptional({ description: 'Member responsibilities' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  responsibilities?: string[];
}

export class GroupProjectQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ProjectStatus, description: 'Filter by project status' })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({ description: 'Filter by study group ID' })
  @IsOptional()
  @IsUUID()
  studyGroupId?: string;

  @ApiPropertyOptional({ description: 'Filter by course ID' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({ description: 'Search by name' })
  @IsOptional()
  @IsString()
  search?: string;
}
