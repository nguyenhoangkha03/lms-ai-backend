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
import { CollaborativeNoteService } from '../services/collaborative-note.service';
import {
  CreateCollaborativeNoteDto,
  UpdateCollaborativeNoteDto,
  CollaborativeNoteQueryDto,
  ShareNoteDto,
} from '../dto/collaborative-note.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { UserPayload } from '@/common/interfaces/user-payload.interface';

@ApiTags('Collaborative Notes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('collaborative-notes')
export class CollaborativeNoteController {
  constructor(private readonly noteService: CollaborativeNoteService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new collaborative note' })
  @ApiResponse({ status: 201, description: 'Note created successfully' })
  async create(
    @Body() createNoteDto: CreateCollaborativeNoteDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.noteService.create(createNoteDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all accessible notes' })
  @ApiResponse({ status: 200, description: 'Notes retrieved successfully' })
  async findAll(@Query() query: CollaborativeNoteQueryDto, @CurrentUser() user: UserPayload) {
    return this.noteService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get note by ID' })
  @ApiResponse({ status: 200, description: 'Note retrieved successfully' })
  async findOne(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.noteService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update note' })
  @ApiResponse({ status: 200, description: 'Note updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() updateNoteDto: UpdateCollaborativeNoteDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.noteService.update(id, updateNoteDto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete note' })
  @ApiResponse({ status: 200, description: 'Note deleted successfully' })
  async remove(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    await this.noteService.delete(id, user);
    return { message: 'Note deleted successfully' };
  }

  @Post(':id/share')
  @ApiOperation({ summary: 'Share note with other users' })
  @ApiResponse({ status: 201, description: 'Note shared successfully' })
  async shareNote(
    @Param('id') id: string,
    @Body() shareDto: ShareNoteDto,
    @CurrentUser() user: UserPayload,
  ) {
    await this.noteService.shareNote(id, shareDto, user);
    return { message: 'Note shared successfully' };
  }

  @Post(':id/accept-collaboration')
  @ApiOperation({ summary: 'Accept collaboration invitation' })
  @ApiResponse({ status: 201, description: 'Collaboration accepted successfully' })
  async acceptCollaboration(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    await this.noteService.acceptCollaboration(id, user);
    return { message: 'Collaboration accepted successfully' };
  }

  @Post('from-template/:templateId')
  @ApiOperation({ summary: 'Create note from template' })
  @ApiResponse({ status: 201, description: 'Note created from template successfully' })
  async createFromTemplate(
    @Param('templateId') templateId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.noteService.createFromTemplate(templateId, user);
  }
}
