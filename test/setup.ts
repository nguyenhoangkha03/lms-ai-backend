/* eslint-disable no-var */
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { ObjectLiteral, Repository } from 'typeorm';
import { CacheService } from '../src/cache/cache.service';
import { SelectQueryBuilder } from 'typeorm';
import { mockDeep } from 'jest-mock-extended';

jest.mock('@/logger/winston.service', () => ({
  WinstonService: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    setContext: jest.fn(),
  })),
}));

jest.mock('ioredis', () => {
  const MockRedis = jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
    keys: jest.fn(),
    flushall: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
  }));
  return MockRedis;
});

declare global {
  var createMockCacheService: () => Partial<CacheService>;
}

global.createMockRepository = <T extends ObjectLiteral = any>() => {
  const mockQueryBuilder = mockDeep<SelectQueryBuilder<T>>();
  mockQueryBuilder.select.mockReturnThis();
  mockQueryBuilder.where.mockReturnThis();
  mockQueryBuilder.andWhere.mockReturnThis();
  mockQueryBuilder.leftJoinAndSelect.mockReturnThis();
  mockQueryBuilder.getOne.mockResolvedValue(undefined!);

  const repository = mockDeep<Repository<T>>();
  repository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  return repository;
};

global.createTestingModule = async (providers: any[]) => {
  return Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: '.env.test',
      }),
    ],
    providers,
  }).compile();
};

global.createMockCacheService = (): Partial<CacheService> => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  //   exists: jest.fn(),
  //   expire: jest.fn(),
  //   ttl: jest.fn(),
  //   keys: jest.fn(),
  //   flushAll: jest.fn(),
  //   increment: jest.fn(),
  //   decrement: jest.fn(),
  //   getMany: jest.fn(),
  //   setMany: jest.fn(),
  //   delMany: jest.fn(),
});

// Console override for cleaner test output
const originalConsole = console;
beforeAll(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

export {};
