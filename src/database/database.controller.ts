import { Controller, Get, Post, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DatabaseHealthService } from './services/database-health.service';
import { DatabaseMonitoringService } from './services/monitoring.service';
import { BackupService } from './services/backup.service';
import { DatabaseOptimizationService } from './services/database-optimization.service';

@ApiTags('Database Management')
@Controller('database')
// @UseGuards(AdminGuard) // Will be implemented in auth module
export class DatabaseController {
  constructor(
    private readonly healthService: DatabaseHealthService,
    private readonly monitoringService: DatabaseMonitoringService,
    private readonly backupService: BackupService,
    private readonly optimizationService: DatabaseOptimizationService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Check database health status' })
  @ApiResponse({ status: 200, description: 'Database health information' })
  async getHealth() {
    return this.healthService.checkDatabaseHealth();
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get database performance metrics' })
  @ApiResponse({ status: 200, description: 'Performance metrics' })
  async getMetrics() {
    return this.monitoringService.getPerformanceMetrics();
  }

  @Get('status')
  @ApiOperation({ summary: 'Get database connection status' })
  @ApiResponse({ status: 200, description: 'Connection status information' })
  async getStatus() {
    return this.optimizationService.getConnectionPoolStatus();
  }

  @Get('tables')
  @ApiOperation({ summary: 'Get table statistics' })
  @ApiResponse({ status: 200, description: 'Table size and usage statistics' })
  async getTableStats() {
    return this.monitoringService.getTableStatistics();
  }

  @Get('backups')
  @ApiOperation({ summary: 'List available backups' })
  @ApiResponse({ status: 200, description: 'Available backup files' })
  async getBackups() {
    return this.backupService.getBackupList();
  }

  @Post('backup')
  @ApiOperation({ summary: 'Create database backup' })
  @ApiResponse({ status: 201, description: 'Backup created successfully' })
  // @ApiBearerAuth('JWT-auth')
  async createBackup() {
    const backupPath = await this.backupService.createDatabaseBackup();
    return {
      message: 'Backup created successfully',
      path: backupPath,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('optimize/:table')
  @ApiOperation({ summary: 'Optimize specific table' })
  @ApiResponse({ status: 200, description: 'Table optimized successfully' })
  // @ApiBearerAuth('JWT-auth')
  async optimizeTable(@Param('table') tableName: string) {
    await this.optimizationService.optimizeTable(tableName);
    return {
      message: `Table ${tableName} optimized successfully`,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('report')
  @ApiOperation({ summary: 'Generate comprehensive health report' })
  @ApiResponse({ status: 200, description: 'Database health report' })
  async getHealthReport() {
    return this.monitoringService.generateHealthReport();
  }
}
