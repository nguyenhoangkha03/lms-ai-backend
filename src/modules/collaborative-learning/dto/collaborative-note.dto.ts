import { IsString, IsOptional, IsEnum, IsBoolean, IsUUID, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NoteType, NoteStatus } from '@/common/enums/collaborative.enums';
import { PaginationDto } from '@/common/dto/pagination.dto';

export class CreateCollaborativeNoteDto {
  @ApiProperty({ description: 'Note title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Note content' })
  @IsString()
  content: string;

  @ApiProperty({ enum: NoteType, description: 'Note type' })
  @IsEnum(NoteType)
  type: NoteType;

  @ApiPropertyOptional({ description: 'Associated study group ID' })
  @IsOptional()
  @IsUUID()
  studyGroupId?: string;

  @ApiPropertyOptional({ description: 'Associated course ID' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({ description: 'Associated lesson ID' })
  @IsOptional()
  @IsUUID()
  lessonId?: string;

  @ApiPropertyOptional({ description: 'Note tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Is note template' })
  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  @ApiPropertyOptional({ description: 'Template source ID' })
  @IsOptional()
  @IsUUID()
  templateId?: string;
}

export class UpdateCollaborativeNoteDto {
  @ApiPropertyOptional({ description: 'Note title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Note content' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ enum: NoteStatus, description: 'Note status' })
  @IsOptional()
  @IsEnum(NoteStatus)
  status?: NoteStatus;

  @ApiPropertyOptional({ description: 'Note tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Is note pinned' })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional({ description: 'Edit reason' })
  @IsOptional()
  @IsString()
  editReason?: string;
}

export class CollaborativeNoteQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: NoteType, description: 'Filter by note type' })
  @IsOptional()
  @IsEnum(NoteType)
  type?: NoteType;

  @ApiPropertyOptional({ enum: NoteStatus, description: 'Filter by note status' })
  @IsOptional()
  @IsEnum(NoteStatus)
  status?: NoteStatus;

  @ApiPropertyOptional({ description: 'Filter by study group ID' })
  @IsOptional()
  @IsUUID()
  studyGroupId?: string;

  @ApiPropertyOptional({ description: 'Filter by course ID' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({ description: 'Filter by lesson ID' })
  @IsOptional()
  @IsUUID()
  lessonId?: string;

  @ApiPropertyOptional({ description: 'Search by title or content' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Show only templates' })
  @IsOptional()
  @IsBoolean()
  templatesOnly?: boolean;
}

export class ShareNoteDto {
  @ApiProperty({ description: 'User IDs to share with' })
  @IsArray()
  @IsUUID(undefined, { each: true })
  userIds: string[];

  @ApiProperty({ enum: ['view', 'comment', 'edit'], description: 'Permission level' })
  @IsEnum(['view', 'comment', 'edit'])
  permission: string;

  @ApiPropertyOptional({ description: 'Share message' })
  @IsOptional()
  @IsString()
  message?: string;
}
