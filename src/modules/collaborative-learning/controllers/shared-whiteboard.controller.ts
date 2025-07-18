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
import { SharedWhiteboardService } from '../services/shared-whiteboard.service';
import {
  CreateWhiteboardDto,
  UpdateWhiteboardDto,
  CreateWhiteboardElementDto,
  WhiteboardQueryDto,
} from '../dto/whiteboard.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { UserPayload } from '@/common/interfaces/user-payload.interface';

@ApiTags('Shared Whiteboards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('whiteboards')
export class SharedWhiteboardController {
  constructor(private readonly whiteboardService: SharedWhiteboardService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new shared whiteboard' })
  @ApiResponse({ status: 201, description: 'Whiteboard created successfully' })
  async create(@Body() createWhiteboardDto: CreateWhiteboardDto, @CurrentUser() user: UserPayload) {
    return this.whiteboardService.create(createWhiteboardDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all accessible whiteboards' })
  @ApiResponse({ status: 200, description: 'Whiteboards retrieved successfully' })
  async findAll(@Query() query: WhiteboardQueryDto, @CurrentUser() user: UserPayload) {
    return this.whiteboardService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get whiteboard by ID' })
  @ApiResponse({ status: 200, description: 'Whiteboard retrieved successfully' })
  async findOne(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.whiteboardService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update whiteboard' })
  @ApiResponse({ status: 200, description: 'Whiteboard updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() updateWhiteboardDto: UpdateWhiteboardDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.whiteboardService.update(id, updateWhiteboardDto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete whiteboard' })
  @ApiResponse({ status: 200, description: 'Whiteboard deleted successfully' })
  async remove(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    await this.whiteboardService.delete(id, user);
    return { message: 'Whiteboard deleted successfully' };
  }

  @Post(':id/elements')
  @ApiOperation({ summary: 'Create whiteboard element' })
  @ApiResponse({ status: 201, description: 'Element created successfully' })
  async createElement(
    @Param('id') whiteboardId: string,
    @Body() createElementDto: CreateWhiteboardElementDto,
    @CurrentUser() user: UserPayload,
  ) {
    createElementDto.whiteboardId = whiteboardId;
    return this.whiteboardService.createElement(createElementDto, user);
  }

  @Patch('elements/:elementId')
  @ApiOperation({ summary: 'Update whiteboard element' })
  @ApiResponse({ status: 200, description: 'Element updated successfully' })
  async updateElement(
    @Param('elementId') elementId: string,
    @Body() updateData: Partial<CreateWhiteboardElementDto>,
    @CurrentUser() user: UserPayload,
  ) {
    return this.whiteboardService.updateElement(elementId, updateData, user);
  }

  @Delete('elements/:elementId')
  @ApiOperation({ summary: 'Delete whiteboard element' })
  @ApiResponse({ status: 200, description: 'Element deleted successfully' })
  async removeElement(@Param('elementId') elementId: string, @CurrentUser() user: UserPayload) {
    await this.whiteboardService.deleteElement(elementId, user);
    return { message: 'Element deleted successfully' };
  }
}
