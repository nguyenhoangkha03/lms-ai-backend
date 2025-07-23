import { INestApplication } from '@nestjs/common';
import { IntegrationTestSetup } from '../integration-setup';
import { CacheService } from '../../src/cache/cache.service';
import * as request from 'supertest';

describe('Cache Integration Tests', () => {
  let app: INestApplication;
  let cacheService: CacheService;

  beforeAll(async () => {
    app = await IntegrationTestSetup.setupTestApp();
    cacheService = app.get(CacheService);
  });

  beforeEach(async () => {
    await cacheService.flushAll();
  });

  describe('Basic Cache Operations', () => {
    it('should set and get cache values', async () => {
      await cacheService.set('test-key', 'test-value', 3600);
      const value = await cacheService.get('test-key');
      expect(value).toBe('test-value');
    });

    it('should handle cache expiration', async () => {
      await cacheService.set('expire-key', 'expire-value', 1);

      await new Promise(resolve => setTimeout(resolve, 1100));

      const value = await cacheService.get('expire-key');
      expect(value).toBeNull();
    });

    it('should handle complex objects', async () => {
      const complexObject = {
        user: { id: 1, name: 'Test User' },
        courses: ['course1', 'course2'],
        metadata: { lastLogin: new Date().toISOString() },
      };

      await cacheService.set('complex-key', JSON.stringify(complexObject), 3600);
      const cached = await cacheService.get<string>('complex-key');
      const parsed = JSON.parse(cached as string);

      expect(parsed).toEqual(complexObject);
    });
  });

  describe('API Response Caching', () => {
    let testData: any;

    beforeEach(async () => {
      testData = await IntegrationTestSetup.seedBasicData();
    });

    it('should cache course list responses', async () => {
      const response1 = await request(app.getHttpServer()).get('/courses').expect(200);

      const cacheKey = 'courses:list:page:1:limit:10';
      const cached = await cacheService.get(cacheKey);
      expect(cached).toBeDefined();

      const response2 = await request(app.getHttpServer()).get('/courses').expect(200);

      expect(response1.body).toEqual(response2.body);
    });

    it('should invalidate cache on course updates', async () => {
      const teacherLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'teacher@test.com', password: 'password123' });
      const teacherToken = teacherLogin.body.accessToken;

      await request(app.getHttpServer()).get('/courses').expect(200);

      const cacheKey = 'courses:list:page:1:limit:10';
      const cachedBefore = await cacheService.get(cacheKey);
      expect(cachedBefore).toBeDefined();

      await request(app.getHttpServer())
        .put(`/courses/${testData.course.id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ title: 'Updated Course Title' })
        .expect(200);

      const cachedAfter = await cacheService.get(cacheKey);
      expect(cachedAfter).toBeNull();
    });
  });

  describe('Session Caching', () => {
    it('should cache user sessions', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'student@test.com', password: 'password123' });

      const sessionKey = `session:${loginResponse.body.user.id}`;
      const session = await cacheService.get(sessionKey);
      expect(session).toBeDefined();
    });

    it('should invalidate session cache on logout', async () => {
      const testData = await IntegrationTestSetup.seedBasicData();

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'student@test.com', password: 'password123' });

      const sessionKey = `session:${testData.student.id}`;
      const sessionBefore = await cacheService.get(sessionKey);
      expect(sessionBefore).toBeDefined();

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
        .send({ refreshToken: loginResponse.body.refreshToken })
        .expect(200);

      const sessionAfter = await cacheService.get(sessionKey);
      expect(sessionAfter).toBeNull();
    });
  });

  describe('Rate Limiting Cache', () => {
    it('should track rate limit counters', async () => {
      const rateLimitKey = 'rate_limit:127.0.0.1:/auth/login';

      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'wrong@test.com', password: 'wrongpassword' });
      }

      const counter = await cacheService.get<string>(rateLimitKey);
      expect(parseInt(counter as string)).toBeGreaterThan(0);
    });
  });
});
