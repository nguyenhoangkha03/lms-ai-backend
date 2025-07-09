import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { WinstonService } from '@/logger/winston.service';

const execAsync = promisify(exec);

@Injectable()
export class BackupService {
  private readonly backupDir: string;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(BackupService.name);
    this.backupDir = this.configService.get<string>('BACKUP_DIR') || './src/backups';
    this.ensureBackupDirectory();
  }

  private ensureBackupDirectory(): void {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      this.logger.log(`📁 Created backup directory: ${this.backupDir}`);
    }
  }

  // Tạo một file .sql chứa toàn bộ nội dung của database hiện tại
  async createDatabaseBackup(filename?: string): Promise<string> {
    const dbConfig = this.configService.get('database');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = filename || `lms-ai-backup-${timestamp}.sql`;
    const backupPath = path.join(this.backupDir, backupFilename);

    try {
      const mysqldumpCmd = [
        'mysqldump',
        `-h${dbConfig.host}`,
        `-P${dbConfig.port}`,
        `-u${dbConfig.username}`,
        `-p${dbConfig.password}`,
        '--single-transaction',
        '--routines',
        '--triggers',
        '--events',
        '--hex-blob',
        dbConfig.database,
        `> ${backupPath}`,
      ].join(' ');

      await execAsync(mysqldumpCmd);

      this.logger.log(`✅ Database backup created: ${backupPath}`);
      return backupPath;
    } catch (error) {
      this.logger.error('❌ Database backup failed:', error.message);
      throw new Error(`Backup failed: ${error.message}`);
    }
  }

  async restoreDatabase(backupPath: string): Promise<void> {
    const dbConfig = this.configService.get('database');

    try {
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupPath}`);
      }

      const mysqlCmd = [
        'mysql',
        `-h${dbConfig.host}`,
        `-P${dbConfig.port}`,
        `-u${dbConfig.username}`,
        `-p${dbConfig.password}`,
        dbConfig.database,
        `< ${backupPath}`,
      ].join(' ');

      await execAsync(mysqlCmd);

      this.logger.log(`✅ Database restored from: ${backupPath}`);
    } catch (error) {
      this.logger.error('❌ Database restore failed:', error.message);
      throw new Error(`Restore failed: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async scheduledBackup(): Promise<void> {
    this.logger.log('🔄 Starting scheduled backup...');

    try {
      const backupPath = await this.createDatabaseBackup();
      await this.compressBackup(backupPath);
      await this.cleanOldBackups();

      this.logger.log('✅ Scheduled backup completed successfully');
    } catch (error) {
      this.logger.error('❌ Scheduled backup failed:', error.message);
    }
  }

  private async compressBackup(backupPath: string): Promise<string> {
    try {
      const compressedPath = `${backupPath}.gz`;
      await execAsync(`gzip ${backupPath}`);

      this.logger.log(`🗜️ Backup compressed: ${compressedPath}`);
      return compressedPath;
    } catch (error) {
      this.logger.error('❌ Backup compression failed:', error.message);
      return backupPath;
    }
  }

  private async cleanOldBackups(): Promise<void> {
    const retentionDays = this.configService.get<number>('BACKUP_RETENTION_DAYS') || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    try {
      const files = fs.readdirSync(this.backupDir);
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.backupDir, file);
        const stats = fs.statSync(filePath);

        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }

      this.logger.log(`🗑️ Cleaned up ${deletedCount} old backup files`);
    } catch (error) {
      this.logger.error('❌ Backup cleanup failed:', error.message);
    }
  }

  async getBackupList(): Promise<any[]> {
    try {
      const files = fs.readdirSync(this.backupDir);
      const backups: {
        filename: string;
        path: string;
        size: number;
        created: Date;
      }[] = [];

      for (const file of files) {
        const filePath = path.join(this.backupDir, file);
        const stats = fs.statSync(filePath);

        backups.push({
          filename: file,
          path: filePath,
          size: stats.size,
          created: stats.mtime,
        });
      }

      return backups.sort((a, b) => b.created.getTime() - a.created.getTime());
    } catch (error) {
      this.logger.error('❌ Failed to get backup list:', error.message);
      return [];
    }
  }

  async getBackupInfo(filename: string) {
    const filePath = path.join(this.backupDir, filename);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Backup file not found: ${filename}`);
    }

    const stats = fs.statSync(filePath);

    return {
      filename,
      path: filePath,
      size: stats.size,
      sizeFormatted: this.formatFileSize(stats.size),
      created: stats.mtime,
      modified: stats.mtime,
    };
  }

  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  }
}
