import { DataSource, ObjectLiteral, Repository } from 'typeorm';
import { SeederInterface } from './seed.interface';
import { WinstonLoggerService } from '@/logger/winston-logger.service';

export abstract class BaseSeeder implements SeederInterface {
  constructor(
    protected readonly dataSource: DataSource,
    protected readonly logger: WinstonLoggerService,
  ) {
    this.logger.setContext(this.constructor.name);
  }

  abstract run(): Promise<void>;

  protected async truncateTable(tableName: string): Promise<void> {
    await this.dataSource.query(`SET FOREIGN_KEY_CHECKS = 0`);
    await this.dataSource.query(`TRUNCATE TABLE ${tableName}`);
    await this.dataSource.query(`SET FOREIGN_KEY_CHECKS = 1`);
    this.logger.log(`🗑️  Truncated table: ${tableName}`);
  }

  protected async getRepository<T extends ObjectLiteral>(entity: any): Promise<Repository<T>> {
    return this.dataSource.getRepository(entity);
  }

  protected async insertBatch<T extends ObjectLiteral>(
    repository: Repository<T>,
    data: Partial<T>[],
    batchSize: number = 100,
  ): Promise<T[]> {
    const results: T[] = [];

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const entities = repository.create(batch as any[]);
      const saved = await repository.save(entities);
      results.push(...saved);

      this.logger.log(
        `📦 Inserted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} records`,
      );
    }

    return results;
  }
}
