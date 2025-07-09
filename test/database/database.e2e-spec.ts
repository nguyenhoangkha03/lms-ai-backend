import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { DatabaseModule } from '../../src/database/database.module';
import { DatabaseHealthService } from '../../src/database/services/database-health.service';
import configuration from '../../src/config/configuration';

describe('Database Management (e2e)', () => {
  let app: INestApplication;
  let healthService: DatabaseHealthService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [configuration],
          isGlobal: true,
        }),
        TypeOrmModule.forRoot({
          type: 'mysql',
          host: 'localhost',
          port: 3306,
          username: 'test_user',
          password: 'test_password',
          database: 'test_db',
          synchronize: true,
          logging: false,
        }),
        DatabaseModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    healthService = moduleFixture.get<DatabaseHealthService>(DatabaseHealthService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/database/health (GET)', () => {
    it('should return database health status', () => {
      return request(app.getHttpServer())
        .get('/api/v1/database/health')
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('status');
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body).toHaveProperty('checks');
        });
    });
  });

  describe('/database/metrics (GET)', () => {
    it('should return performance metrics', () => {
      return request(app.getHttpServer())
        .get('/api/v1/database/metrics')
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('connections');
          expect(res.body).toHaveProperty('queries');
        });
    });
  });

  describe('Database Health Service', () => {
    it('should check database health', async () => {
      const health = await healthService.checkDatabaseHealth();
      expect(health).toHaveProperty('status');
      expect(health.status).toBe('healthy');
    });
  });
});
