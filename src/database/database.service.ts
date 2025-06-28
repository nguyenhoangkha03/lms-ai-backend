import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as mysql from 'mysql2/promise';
import { WinstonLoggerService } from 'common/logger/winston-logger.service';

@Injectable()
export class DatabaseService implements OnModuleInit {
  constructor(
    private readonly logger: WinstonLoggerService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    this.logger.setContext('DatabaseService');
  }

  async onModuleInit() {
    this.logger.setContext('DatabaseService');
    await this.checkDatabaseConnection();
    await this.createDatabaseIfNotExists();
  }

  async checkDatabaseConnection(): Promise<boolean> {
    try {
      const connection = this.dataSource;
      if (connection.isInitialized) {
        this.logger.log('✅ Database connection established successfully');
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error('❌ Database connection failed:', error.message);
      throw new Error('Database connection failed');
    }
  }

  async createDatabaseIfNotExists(): Promise<void> {
    const dbConfig = this.configService.get('database');

    try {
      // Create connection without database name to create database
      const connection = await mysql.createConnection({
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.username,
        password: dbConfig.password,
      });

      // Check if database exists
      const [rows] = await connection.execute(
        'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
        [dbConfig.database],
      );

      if ((rows as any[]).length === 0) {
        // Create database if it doesn't exist
        await connection.execute(
          `CREATE DATABASE ${dbConfig.database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
        );
        this.logger.log(`✅ Database '${dbConfig.database}' created successfully`);
      } else {
        this.logger.log(`✅ Database '${dbConfig.database}' already exists`);
      }

      await connection.end();
    } catch (error) {
      this.logger.error('❌ Error creating database:', error.message);
      throw error;
    }
  }

  async getConnectionStatus() {
    return {
      isConnected: this.dataSource.isInitialized,
      database: this.dataSource.options.database,
      host: (this.dataSource.options as any).host,
      port: (this.dataSource.options as any).port,
    };
  }

  async getQueryRunner() {
    return this.dataSource.createQueryRunner();
  }

  async runRawQuery(query: string, parameters?: any[]) {
    return this.dataSource.query(query, parameters);
  }

  async getTableInfo(tableName: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      const result = await queryRunner.query('DESCRIBE ??', [tableName]);
      return result;
    } finally {
      await queryRunner.release();
    }
  }

  async getDatabaseSize() {
    const result = await this.dataSource.query(
      `
      SELECT 
        table_schema AS 'Database',
        ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
      FROM information_schema.tables 
      WHERE table_schema = ?
      GROUP BY table_schema
    `,
      [this.dataSource.options.database],
    );

    return result[0] || { Database: this.dataSource.options.database, 'Size (MB)': 0 };
  }
}
