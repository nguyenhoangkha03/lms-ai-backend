import { TestingModule } from '@nestjs/testing';
import { ObjectLiteral, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Request } from 'express';

export class TestHelpers {
  static createMockRequest(overrides: Partial<Request> = {}): Partial<Request> {
    return {
      ip: '127.0.0.1',
      get: jest.fn().mockImplementation((header: string) => {
        const headers = {
          'user-agent': 'Mozilla/5.0 (Test Browser)',
          'x-forwarded-for': '127.0.0.1',
          authorization: 'Bearer test-token',
        };
        return headers[header.toLowerCase()];
      }),
      body: {},
      query: {},
      params: {},
      headers: {},
      user: undefined,
      ...overrides,
    };
  }

  static createMockResponse() {
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
      redirect: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      removeHeader: jest.fn().mockReturnThis(),
    };
    return res;
  }

  static async getRepositoryToken<T extends ObjectLiteral>(
    module: TestingModule,
    entity: new () => T,
  ): Promise<jest.Mocked<Repository<T>>> {
    return module.get<Repository<T>>(getRepositoryToken(entity)) as jest.Mocked<Repository<T>>;
  }

  static createMockFile(
    options: {
      fieldname?: string;
      originalname?: string;
      encoding?: string;
      mimetype?: string;
      size?: number;
      buffer?: Buffer;
    } = {},
  ): Express.Multer.File {
    return {
      fieldname: options.fieldname || 'file',
      originalname: options.originalname || 'test.jpg',
      encoding: options.encoding || '7bit',
      mimetype: options.mimetype || 'image/jpeg',
      size: options.size || 1024,
      buffer: options.buffer || Buffer.from('test file content'),
      destination: '',
      filename: '',
      path: '',
      stream: null as any,
    };
  }

  static async waitFor(condition: () => boolean | Promise<boolean>, timeout = 5000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('Condition not met within timeout');
  }

  static createMockJwtPayload(overrides: any = {}) {
    return {
      sub: 'user-1',
      email: 'test@example.com',
      userType: 'student',
      roles: [],
      permissions: [],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      ...overrides,
    };
  }

  static createMockDeviceInfo(overrides: any = {}) {
    return {
      userAgent: 'Mozilla/5.0 (Test Browser)',
      ip: '127.0.0.1',
      device: 'Desktop',
      browser: 'Chrome',
      os: 'Windows',
      ...overrides,
    };
  }

  static generateRandomEmail(): string {
    return `test-${Math.random().toString(36).substring(7)}@example.com`;
  }

  static generateRandomString(length = 10): string {
    return Math.random()
      .toString(36)
      .substring(2, 2 + length);
  }

  static createMockPaginatedResult<T>(items: T[], total: number, page = 1, limit = 10) {
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    };
  }
}
