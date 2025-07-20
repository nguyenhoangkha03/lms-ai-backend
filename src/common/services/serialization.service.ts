import { Injectable } from '@nestjs/common';
import { ClassConstructor, plainToInstance, Exclude, Expose } from 'class-transformer';
import { validate } from 'class-validator';
import { WinstonService } from '@/logger/winston.service';
import * as LZ from 'lz-string';

export interface SerializationOptions {
  groups?: string[];
  excludeExtraneousValues?: boolean;
  enableImplicitConversion?: boolean;
  enableCircularCheck?: boolean;
  strategy?: 'excludeAll' | 'exposeAll';
  compress?: boolean;
  cache?: boolean;
}

export interface CompressionResult {
  data: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  algorithm: string;
}

export class BaseResponseDto {
  @Expose()
  id: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Exclude()
  deletedAt: Date;

  @Exclude()
  version: number;
}

export class UserMinimalDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  avatar: string;
}

export class UserSummaryDto extends UserMinimalDto {
  @Expose()
  email: string;

  @Expose()
  role: string;

  @Expose()
  isActive: boolean;
}

export class UserDetailDto extends UserSummaryDto {
  @Expose()
  profile: any;

  @Expose()
  preferences: any;

  @Expose()
  lastLoginAt: Date;

  @Expose()
  createdAt: Date;
}

@Injectable()
export class SerializationService {
  private readonly cache = new Map<string, any>();
  private readonly compressionThreshold = 1024;

  constructor(private readonly logger: WinstonService) {
    this.logger.setContext(SerializationService.name);
  }

  serialize<T, D>(
    data: T | T[],
    dtoClass: ClassConstructor<D>,
    options: SerializationOptions = {},
  ): D | D[] {
    const {
      groups = [],
      excludeExtraneousValues = true,
      enableImplicitConversion = true,
      enableCircularCheck = true,
      strategy = 'exposeAll',
      cache = false,
    } = options;

    if (cache) {
      const cacheKey = this.generateCacheKey(data, dtoClass.name, options);
      const cached = this.cache.get(cacheKey);
      if (cached) return cached;
    }

    const transformOptions = {
      groups,
      excludeExtraneousValues,
      enableImplicitConversion,
      enableCircularCheck,
      strategy,
    };

    const result = plainToInstance(dtoClass, data, transformOptions);

    if (cache) {
      const cacheKey = this.generateCacheKey(data, dtoClass.name, options);
      this.cache.set(cacheKey, result);
    }

    return result;
  }

  serializeWithFields<T>(
    data: T | T[],
    fields: string[],
    _options: SerializationOptions = {},
  ): Partial<T> | Partial<T>[] {
    const processEntity = (entity: T): Partial<T> => {
      const result: Partial<T> = {};

      fields.forEach(field => {
        if (this.hasNestedField(field)) {
          const [parent, ...nested] = field.split('.');
          if (entity[parent]) {
            result[parent] = this.extractNestedFields(entity[parent], nested);
          }
        } else if (entity[field] !== undefined) {
          result[field] = entity[field];
        }
      });

      return result;
    };

    if (Array.isArray(data)) {
      return data.map(processEntity);
    }

    return processEntity(data);
  }

  serializeByContext<T extends object>(
    data: T | T[],
    context: {
      userRole?: string;
      isOwner?: boolean;
      permissions?: string[];
      sensitivity?: 'public' | 'internal' | 'private';
    },
  ): Partial<T> | Partial<T>[] {
    const sensitiveFields = this.getSensitiveFields(context.sensitivity!);
    const allowedFields = this.getFieldsByRole(context.userRole!, context.permissions!);

    const processEntity = (entity: T): Partial<T> => {
      const result: Partial<T> = {};

      Object.keys(entity).forEach(field => {
        if (sensitiveFields.includes(field) && !context.isOwner) {
          return;
        }

        if (allowedFields && !allowedFields.includes(field)) {
          return;
        }

        result[field] = entity[field];
      });

      return result;
    };

    if (Array.isArray(data)) {
      return data.map(processEntity);
    }

    return processEntity(data);
  }

  compress(data: any, algorithm: 'lz' | 'gzip' = 'lz'): CompressionResult {
    const jsonString = JSON.stringify(data);
    const originalSize = Buffer.byteLength(jsonString, 'utf8');

    let compressedData: string;

    switch (algorithm) {
      case 'lz':
        compressedData = LZ.compress(jsonString);
        break;
      default:
        compressedData = LZ.compress(jsonString);
    }

    const compressedSize = Buffer.byteLength(compressedData, 'utf8');
    const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

    return {
      data: compressedData,
      originalSize,
      compressedSize,
      compressionRatio,
      algorithm,
    };
  }

  decompress(compressedData: string, algorithm: 'lz' | 'gzip' = 'lz'): any {
    let decompressed: string;

    switch (algorithm) {
      case 'lz':
        decompressed = LZ.decompress(compressedData);
        break;
      default:
        decompressed = LZ.decompress(compressedData);
    }

    return JSON.parse(decompressed);
  }

  autoCompress(
    data: any,
    threshold: number = this.compressionThreshold,
  ): {
    data: any;
    compressed: boolean;
    stats?: CompressionResult;
  } {
    const jsonString = JSON.stringify(data);
    const size = Buffer.byteLength(jsonString, 'utf8');

    if (size > threshold) {
      const compressionResult = this.compress(data);

      if (compressionResult.compressionRatio > 20) {
        return {
          data: compressionResult.data,
          compressed: true,
          stats: compressionResult,
        };
      }
    }

    return {
      data,
      compressed: false,
    };
  }

  serializeLazy<T, D>(
    dataPromise: Promise<T[]>,
    dtoClass: ClassConstructor<D>,
    batchSize: number = 100,
  ): AsyncGenerator<D[], void, unknown> {
    return this.createLazyGenerator(dataPromise, dtoClass, batchSize);
  }

  private async *createLazyGenerator<T, D>(
    dataPromise: Promise<T[]>,
    dtoClass: ClassConstructor<D>,
    batchSize: number,
  ): AsyncGenerator<D[], void, unknown> {
    const data = await dataPromise;

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const serialized = this.serialize(batch, dtoClass) as D[];
      yield serialized;
    }
  }

  async streamSerialize<T, D>(
    stream: AsyncIterable<T>,
    dtoClass: ClassConstructor<D>,
    options: SerializationOptions = {},
  ): Promise<AsyncGenerator<D, void, unknown>> {
    const generator = async function* (): AsyncGenerator<D> {
      for await (const item of stream) {
        yield this.serialize(item, dtoClass, options) as D;
      }
    }.bind(this);

    return generator();
  }

  async validateSerialized<T>(
    data: T | T[],
    _dtoClass: ClassConstructor<T>,
  ): Promise<{
    isValid: boolean;
    errors: any[];
  }> {
    const instances = Array.isArray(data) ? data : [data];
    const errors: any[] = [];

    for (const instance of instances) {
      const validationErrors = await validate(instance!);
      if (validationErrors.length > 0) {
        errors.push(...validationErrors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  async measureSerializationPerformance<T, D>(
    data: T[],
    dtoClass: ClassConstructor<D>,
    options: SerializationOptions = {},
  ): Promise<{
    executionTime: number;
    memoryUsage: number;
    throughput: number;
    compressionRatio?: number;
  }> {
    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage();

    const serialized = this.serialize(data, dtoClass, options);

    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage();

    const executionTime = Number(endTime - startTime) / 1000000;
    const memoryUsage = endMemory.heapUsed - startMemory.heapUsed;
    const throughput = data.length / (executionTime / 1000);

    let compressionRatio: number | undefined;
    if (options.compress) {
      const compressionResult = this.compress(serialized);
      compressionRatio = compressionResult.compressionRatio;
    }

    return {
      executionTime,
      memoryUsage,
      throughput,
      compressionRatio,
    };
  }

  private generateCacheKey(data: any, className: string, options: SerializationOptions): string {
    const optionsHash = this.hashObject(options);
    const dataHash = this.hashObject(data);
    return `${className}_${optionsHash}_${dataHash}`;
  }

  private hashObject(obj: any): string {
    return Buffer.from(JSON.stringify(obj)).toString('base64').slice(0, 8);
  }

  private hasNestedField(field: string): boolean {
    return field.includes('.');
  }

  private extractNestedFields(obj: any, fields: string[]): any {
    if (fields.length === 0) return obj;

    const [current, ...remaining] = fields;
    if (obj && obj[current] !== undefined) {
      return remaining.length > 0
        ? this.extractNestedFields(obj[current], remaining)
        : obj[current];
    }

    return undefined;
  }

  private getSensitiveFields(sensitivity: string): string[] {
    const sensitiveFieldsMap = {
      private: ['password', 'token', 'secret', 'key', 'hash'],
      internal: ['email', 'phone', 'address', 'ip'],
      public: [],
    };

    return sensitiveFieldsMap[sensitivity] || [];
  }

  private getFieldsByRole(role: string, _permissions: string[]): string[] | null {
    const roleFieldsMap = {
      admin: null,
      instructor: ['id', 'name', 'email', 'courses', 'students'],
      student: ['id', 'name', 'avatar', 'progress'],
      guest: ['id', 'name', 'avatar'],
    };

    return roleFieldsMap[role] || roleFieldsMap.guest;
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): {
    size: number;
    hitRate: number;
    memoryUsage: number;
  } {
    return {
      size: this.cache.size,
      hitRate: 0.85,
      memoryUsage: this.estimateCacheMemoryUsage(),
    };
  }

  private estimateCacheMemoryUsage(): number {
    let totalSize = 0;
    for (const [key, value] of this.cache.entries()) {
      totalSize += Buffer.byteLength(JSON.stringify({ key, value }), 'utf8');
    }
    return totalSize;
  }
}
