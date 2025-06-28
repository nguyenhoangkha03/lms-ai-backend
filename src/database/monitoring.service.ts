import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CacheService } from '../cache/cache.service';
import { WinstonLoggerService } from 'common/logger/winston-logger.service';

@Injectable()
export class DatabaseMonitoringService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly cacheService: CacheService,
    private readonly logger: WinstonLoggerService,
  ) {
    this.logger.setContext(DatabaseMonitoringService.name);
  }

  // Lấy toàn bộ thống kê quan trọng liên quan đến
  async getPerformanceMetrics() {
    const metrics = {
      connections: await this.getConnectionMetrics(),
      queries: await this.getQueryMetrics(),
      innodb: await this.getInnoDBMetrics(),
      replication: await this.getReplicationStatus(),
      tableLocks: await this.getTableLockMetrics(),
    };

    // Cache metrics for dashboard
    await this.cacheService.set('db:performance:metrics', metrics, 60);

    return metrics;
  }

  // Thống kê các chỉ số kết nối
  private async getConnectionMetrics() {
    const result = await this.dataSource.query(`
      SHOW STATUS WHERE Variable_name IN (
        'Connections',
        'Max_used_connections',
        'Threads_connected',
        'Threads_running',
        'Connection_errors_max_connections',
        'Aborted_connects',
        'Aborted_clients'
      )
    `);

    return result.reduce((acc, row) => {
      acc[row.Variable_name] = parseInt(row.Value, 10);
      return acc;
    }, {});
  }

  // Đo đạc tình trạng query
  private async getQueryMetrics() {
    const result = await this.dataSource.query(`
      SHOW STATUS WHERE Variable_name IN (
        'Questions',
        'Queries',
        'Slow_queries',
        'Select_full_join',
        'Select_range_check',
        'Select_scan',
        'Sort_merge_passes',
        'Sort_range',
        'Sort_rows',
        'Sort_scan'
      )
    `);

    return result.reduce((acc, row) => {
      acc[row.Variable_name] = parseInt(row.Value, 10);
      return acc;
    }, {});
  }

  private async getInnoDBMetrics() {
    const result = await this.dataSource.query(`
      SHOW STATUS WHERE Variable_name LIKE 'Innodb_%' AND Variable_name IN (
        'Innodb_buffer_pool_reads',
        'Innodb_buffer_pool_read_requests',
        'Innodb_buffer_pool_pages_total',
        'Innodb_buffer_pool_pages_free',
        'Innodb_buffer_pool_pages_dirty',
        'Innodb_data_reads',
        'Innodb_data_writes',
        'Innodb_data_read',
        'Innodb_data_written',
        'Innodb_rows_read',
        'Innodb_rows_inserted',
        'Innodb_rows_updated',
        'Innodb_rows_deleted'
      )
    `);

    const metrics = result.reduce((acc, row) => {
      acc[row.Variable_name] = parseInt(row.Value, 10);
      return acc;
    }, {});

    // Calculate buffer pool hit ratio
    if (metrics.Innodb_buffer_pool_read_requests > 0) {
      metrics.buffer_pool_hit_ratio = (
        ((metrics.Innodb_buffer_pool_read_requests - metrics.Innodb_buffer_pool_reads) /
          metrics.Innodb_buffer_pool_read_requests) *
        100
      ).toFixed(2);
    }

    return metrics;
  }

  private async getReplicationStatus() {
    try {
      const masterStatus = await this.dataSource.query('SHOW MASTER STATUS');
      const slaveStatus = await this.dataSource.query('SHOW SLAVE STATUS');

      return {
        master: masterStatus[0] || null,
        slave: slaveStatus[0] || null,
      };
    } catch (error) {
      // Replication might not be configured
      return {
        master: null,
        slave: null,
        error: 'Replication not configured or accessible',
      };
    }
  }

  private async getTableLockMetrics() {
    const result = await this.dataSource.query(`
      SHOW STATUS WHERE Variable_name IN (
        'Table_locks_immediate',
        'Table_locks_waited'
      )
    `);

    return result.reduce((acc, row) => {
      acc[row.Variable_name] = parseInt(row.Value, 10);
      return acc;
    }, {});
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async collectMetrics() {
    try {
      const metrics = await this.getPerformanceMetrics();

      // Log performance warnings
      this.checkPerformanceWarnings(metrics);

      this.logger.debug('📊 Performance metrics collected');
    } catch (error) {
      this.logger.error('❌ Failed to collect metrics:', error.message);
    }
  }

  private checkPerformanceWarnings(metrics: any) {
    // Check connection usage
    const maxConnections = 100; // Should come from config
    const connectionUsage = (metrics.connections.Threads_connected / maxConnections) * 100;

    if (connectionUsage > 80) {
      this.logger.warn(`⚠️ High connection usage: ${connectionUsage.toFixed(1)}%`);
    }

    // Check buffer pool hit ratio
    if (metrics.innodb.buffer_pool_hit_ratio < 95) {
      this.logger.warn(`⚠️ Low buffer pool hit ratio: ${metrics.innodb.buffer_pool_hit_ratio}%`);
    }

    // Check slow queries
    if (metrics.queries.Slow_queries > 0) {
      this.logger.warn(`⚠️ Slow queries detected: ${metrics.queries.Slow_queries}`);
    }
  }

  async getTableStatistics() {
    const result = await this.dataSource.query(`
      SELECT 
        TABLE_NAME,
        TABLE_ROWS,
        ROUND(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2) AS 'SIZE_MB',
        ROUND((DATA_LENGTH / 1024 / 1024), 2) AS 'DATA_MB',
        ROUND((INDEX_LENGTH / 1024 / 1024), 2) AS 'INDEX_MB',
        ROUND(((INDEX_LENGTH / DATA_LENGTH) * 100), 2) AS 'INDEX_RATIO'
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC
    `);

    return result;
  }

  async getQueryAnalysis(limit: number = 10) {
    try {
      // Get current running queries
      const processlist = await this.dataSource.query(
        `
        SELECT 
          ID,
          USER,
          HOST,
          DB,
          COMMAND,
          TIME,
          STATE,
          LEFT(INFO, 100) AS QUERY_PREVIEW
        FROM INFORMATION_SCHEMA.PROCESSLIST 
        WHERE COMMAND != 'Sleep'
        ORDER BY TIME DESC
        LIMIT ?
      `,
        [limit],
      );

      return {
        runningQueries: processlist,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('❌ Failed to get query analysis:', error.message);
      return {
        runningQueries: [],
        error: error.message,
      };
    }
  }

  async generateHealthReport() {
    const report = {
      timestamp: new Date().toISOString(),
      database: await this.getConnectionMetrics(),
      performance: await this.getPerformanceMetrics(),
      tables: await this.getTableStatistics(),
      queries: await this.getQueryAnalysis(),
    };

    // Cache the report for dashboard
    await this.cacheService.set('db:health:report', report, 300); // 5 minutes

    return report;
  }
}
