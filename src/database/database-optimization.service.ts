import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WinstonLoggerService } from 'common/logger/winston-logger.service';

@Injectable()
export class DatabaseOptimizationService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly logger: WinstonLoggerService,
  ) {
    this.logger.setContext(DatabaseOptimizationService.name);
  }

  async getConnectionPoolStatus() {
    const driver = this.dataSource.driver as any;

    return {
      activeConnections: driver.pool?.activeConnections?.length || 0, // Số kết nối đang bận sử dụng
      idleConnections: driver.pool?.idleConnections?.length || 0, // Số kết nối đang rảnh, sẵn sàng cho request
      totalConnections: driver.pool?.allConnections?.length || 0, // Tổng số kết nối đang được giữ (active + idle)
      poolConfig: {
        acquireTimeoutMillis: driver.pool?.config?.acquireTimeoutMillis, // Thời gian tối đa (ms) để đợi lấy được 1 kết nối từ pool
        createTimeoutMillis: driver.pool?.config?.createTimeoutMillis, // 	Thời gian tối đa (ms) để tạo kết nối mới nếu chưa đủ số lượng max
        idleTimeoutMillis: driver.pool?.config?.idleTimeoutMillis, // 	Thời gian (ms) một kết nối không được dùng thì sẽ bị đóng lại
        max: driver.pool?.config?.max, // Số lượng kết nối tối đa trong pool
        min: driver.pool?.config?.min, // Số lượng kết nối tối thiểu mở sẵn
      },
    };
  }

  async getSlowQueries(limit: number = 10) {
    const queries = await this.dataSource.query(
      `
      SELECT 
        query_time,
        lock_time,
        rows_sent,
        rows_examined,
        sql_text
      FROM mysql.slow_log 
      ORDER BY query_time DESC 
      LIMIT ?
    `,
      [limit],
    );

    return queries;
  }

  async getTableSizes() {
    const result = await this.dataSource.query(`
      SELECT 
        table_name,
        ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'size_mb',
        ROUND((data_length / 1024 / 1024), 2) AS 'data_mb',
        ROUND((index_length / 1024 / 1024), 2) AS 'index_mb',
        table_rows
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
      ORDER BY (data_length + index_length) DESC
    `);

    return result;
  }

  // Cập nhật thống kê (statistics) cho optimizer
  // Giúp MySQL chọn kế hoạch truy vấn tốt hơn, tránh scan toàn bảng
  async analyzeTable(tableName: string) {
    await this.dataSource.query(`ANALYZE TABLE ??`, [tableName]);
    this.logger.log(`✅ Analyzed table: ${tableName}`);
  }

  // Dọn dẹp phân mảnh, sắp xếp lại dữ liệu
  // Giảm dung lượng file, tăng tốc độ truy vấn, đặc biệt với bảng bị UPDATE/DELETE nhiều
  async optimizeTable(tableName: string) {
    await this.dataSource.query(`OPTIMIZE TABLE ??`, [tableName]);
    this.logger.log(`✅ Optimized table: ${tableName}`);
  }

  // tự động mỗi ngày lúc 2h sáng, thực hiện tối ưu hóa database bằng cách
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async runDailyOptimization() {
    this.logger.log('🔧 Starting daily database optimization...');

    try {
      // Get all tables
      const tables = await this.dataSource.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE()
      `);

      // Analyze and optimize tables
      for (const table of tables) {
        await this.analyzeTable(table.table_name);
        await this.optimizeTable(table.table_name);
      }

      this.logger.log('✅ Daily database optimization completed');
    } catch (error) {
      this.logger.error('❌ Daily optimization failed:', error.message);
    }
  }

  async getIndexUsage() {
    const result = await this.dataSource.query(`
      SELECT 
            s.table_name,
            s.index_name,
            s.column_name,
            s.cardinality,
            p.count_read,
            p.count_fetch
        FROM information_schema.statistics s
        LEFT JOIN performance_schema.table_io_waits_summary_by_index_usage p 
            ON s.table_name = p.OBJECT_NAME 
            AND s.index_name = p.INDEX_NAME
        WHERE s.table_schema = DATABASE()
        ORDER BY s.table_name, s.index_name;
    `);

    return result;
  }

  async createIndexIfNotExists(tableName: string, indexName: string, columns: string[]) {
    try {
      const indexExists = await this.dataSource.query(
        `
        SELECT COUNT(*) as count
        FROM information_schema.statistics 
        WHERE table_schema = DATABASE() 
        AND table_name = ? 
        AND index_name = ?
      `,
        [tableName, indexName],
      );

      if (indexExists[0].count === 0) {
        const columnList = columns.join(', ');
        await this.dataSource.query(`CREATE INDEX ?? ON ?? (${columnList})`, [
          indexName,
          tableName,
        ]);
        this.logger.log(`✅ Created index ${indexName} on table ${tableName}`);
      }
    } catch (error) {
      this.logger.error(`❌ Failed to create index ${indexName}:`, error.message);
    }
  }

  async getConnectionStatistics() {
    const result = await this.dataSource.query(`
      SHOW STATUS WHERE 
        variable_name IN (
          'Connections',
          'Max_used_connections',
          'Threads_connected',
          'Threads_running',
          'Connection_errors_max_connections'
        )
    `);

    return result.reduce((acc, row) => {
      acc[row.Variable_name] = row.Value;
      return acc;
    }, {});
  }
}
