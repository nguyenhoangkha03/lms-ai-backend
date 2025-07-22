import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { DataExportService } from '../services/data-export.service';
import { DataExportRequestDto } from '../dto/data-export-request.dto';

@ApiTags('Data Export')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('privacy/data-export')
export class DataExportController {
  constructor(private readonly dataExportService: DataExportService) {}

  @Post()
  @ApiOperation({ summary: 'Request user data export' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Data export initiated successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid export request' })
  async exportUserData(@Request() req: any, @Body() exportRequest: DataExportRequestDto) {
    return this.dataExportService.exportUserData(req.user.id, exportRequest, req.user.id);
  }

  @Get('download/:token')
  @ApiOperation({ summary: 'Download exported data using secure token' })
  @ApiResponse({ status: HttpStatus.OK, description: 'File downloaded successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Invalid or expired token' })
  async downloadExportedData(@Param('token') token: string, @Res() res: Response) {
    res.status(HttpStatus.NOT_IMPLEMENTED).json({
      message: 'Download functionality not yet implemented',
      token,
    });
  }
}
