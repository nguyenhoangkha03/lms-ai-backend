import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
  ValidationPipe,
  UsePipes,
  Query,
  Res,
  Header,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

import { GradebookService } from '../services/gradebook.service';
import { CreateGradebookDto, UpdateGradebookDto } from '../dto/gradebook.dto';
import { Gradebook } from '../entities/gradebook.entity';
import { UserType } from '@/common/enums/user.enums';
import { WinstonService } from '@/logger/winston.service';

@ApiTags('Gradebook')
@Controller('gradebook')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class GradebookController {
  constructor(
    private readonly gradebookService: GradebookService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(GradebookController.name);
  }

  @Post()
  @Roles(UserType.TEACHER, UserType.ADMIN)
  @ApiOperation({ summary: 'Create a new gradebook' })
  @ApiResponse({ status: 201, description: 'Gradebook created successfully', type: Gradebook })
  @UsePipes(new ValidationPipe({ transform: true }))
  async createGradebook(
    @Body() createGradebookDto: CreateGradebookDto,
    @Request() req: any,
  ): Promise<Gradebook> {
    return this.gradebookService.createGradebook(createGradebookDto, req.user.id);
  }

  @Put(':id')
  @Roles(UserType.TEACHER, UserType.ADMIN)
  @ApiOperation({ summary: 'Update gradebook' })
  @ApiParam({ name: 'id', description: 'Gradebook ID' })
  @ApiResponse({ status: 200, description: 'Gradebook updated successfully', type: Gradebook })
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateGradebook(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateGradebookDto: UpdateGradebookDto,
    @Request() req: any,
  ): Promise<Gradebook> {
    return this.gradebookService.updateGradebook(id, updateGradebookDto, req.user.id);
  }

  @Get(':id/data')
  @Roles(UserType.TEACHER, UserType.ADMIN)
  @ApiOperation({ summary: 'Get gradebook data with all student grades' })
  @ApiParam({ name: 'id', description: 'Gradebook ID' })
  @ApiResponse({ status: 200, description: 'Gradebook data retrieved successfully' })
  async getGradebookData(@Param('id', ParseUUIDPipe) id: string): Promise<any> {
    return this.gradebookService.getGradebookData(id);
  }

  @Get(':id/summary')
  @Roles(UserType.TEACHER, UserType.ADMIN)
  @ApiOperation({ summary: 'Get gradebook summary and statistics' })
  @ApiParam({ name: 'id', description: 'Gradebook ID' })
  @ApiResponse({ status: 200, description: 'Gradebook summary retrieved successfully' })
  async getGradebookSummary(@Param('id', ParseUUIDPipe) id: string): Promise<any> {
    return this.gradebookService.getGradebookSummary(id);
  }

  @Put(':id/calculate')
  @Roles(UserType.TEACHER, UserType.ADMIN)
  @ApiOperation({ summary: 'Recalculate final grades' })
  @ApiParam({ name: 'id', description: 'Gradebook ID' })
  @ApiResponse({ status: 200, description: 'Final grades calculated successfully' })
  async calculateFinalGrades(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    await this.gradebookService.calculateFinalGrades(id);
    return { message: 'Final grades calculated successfully' };
  }

  @Get(':id/export')
  @Roles(UserType.TEACHER, UserType.ADMIN)
  @ApiOperation({ summary: 'Export gradebook data' })
  @ApiParam({ name: 'id', description: 'Gradebook ID' })
  @ApiQuery({ name: 'format', enum: ['csv', 'xlsx'], required: false })
  @Header('Content-Type', 'application/octet-stream')
  async exportGradebook(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('format') format: 'csv' | 'xlsx' = 'csv',
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.gradebookService.exportGradebook(id, format);

    const filename = `gradebook_${id}_${new Date().toISOString().split('T')[0]}.${format}`;
    res.set({
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length.toString(),
    });

    res.end(buffer);
  }
}
