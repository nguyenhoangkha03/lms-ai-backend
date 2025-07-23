import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PerformanceTestSetup } from './performance-test-setup';
import { E2ETestSetup } from '../e2e-setup';

describe('API Performance Tests', () => {
  let app: INestApplication;
  let testData: any;

  beforeAll(async () => {
    app = await PerformanceTestSetup.setupPerformanceApp();
    testData = await E2ETestSetup.createCompleteUserFlow();
  }, 60000);

  describe('Authentication Performance', () => {
    it('should handle login requests within acceptable time limits', async () => {
      const loginRequest = () =>
        request(app.getHttpServer()).post('/auth/login').send({
          email: 'student@e2e.com',
          password: 'Password123!',
        });

      const metrics = await PerformanceTestSetup.measureResponseTime(loginRequest, 50);

      expect(metrics.average).toBeLessThan(500); // Average under 500ms
      expect(metrics.p95).toBeLessThan(1000); // 95th percentile under 1s
      expect(metrics.max).toBeLessThan(2000); // Max under 2s

      console.log('Login Performance Metrics:', metrics);
    });

    it('should handle concurrent login requests', async () => {
      const concurrentLogins = Array.from({ length: 10 }, () =>
        request(app.getHttpServer()).post('/auth/login').send({
          email: 'student@e2e.com',
          password: 'Password123!',
        }),
      );

      const start = Date.now();
      const results = await Promise.all(concurrentLogins);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(3000); // All requests under 3s
      expect(results.every(r => r.status === 200)).toBe(true);
    });
  });

  describe('Course API Performance', () => {
    it('should handle course listing with pagination efficiently', async () => {
      // Create multiple courses for testing
      const coursePromises = Array.from({ length: 50 }, (_, i) =>
        request(app.getHttpServer())
          .post('/courses')
          .set('Authorization', `Bearer ${testData.tokens.teacher}`)
          .send({
            title: `Performance Test Course ${i}`,
            description: `Course for performance testing ${i}`,
            categoryId: testData.course.categoryId,
            level: 'beginner',
            language: 'en',
          }),
      );

      await Promise.all(coursePromises);

      const courseListRequest = () => request(app.getHttpServer()).get('/courses?page=1&limit=20');

      const metrics = await PerformanceTestSetup.measureResponseTime(courseListRequest, 30);

      expect(metrics.average).toBeLessThan(300); // Average under 300ms
      expect(metrics.p95).toBeLessThan(500); // 95th percentile under 500ms

      console.log('Course List Performance Metrics:', metrics);
    });

    it('should handle course search efficiently', async () => {
      const searchRequest = () =>
        request(app.getHttpServer()).get('/courses?search=Performance&page=1&limit=10');

      const metrics = await PerformanceTestSetup.measureResponseTime(searchRequest, 30);

      expect(metrics.average).toBeLessThan(400); // Average under 400ms
      expect(metrics.p95).toBeLessThan(800); // 95th percentile under 800ms
    });
  });

  describe('Database Query Performance', () => {
    it('should handle complex queries with joins efficiently', async () => {
      const complexQueryRequest = () =>
        request(app.getHttpServer())
          .get(`/courses/${testData.course.id}`)
          .set('Authorization', `Bearer ${testData.tokens.student}`);

      const metrics = await PerformanceTestSetup.measureResponseTime(complexQueryRequest, 50);

      expect(metrics.average).toBeLessThan(200); // Average under 200ms
      expect(metrics.p95).toBeLessThan(400); // 95th percentile under 400ms
    });
  });

  describe('Memory Usage Performance', () => {
    it('should not have memory leaks during sustained operation', async () => {
      const sustainedOperation = () =>
        request(app.getHttpServer())
          .get('/courses')
          .then(() =>
            request(app.getHttpServer())
              .get(`/courses/${testData.course.id}`)
              .set('Authorization', `Bearer ${testData.tokens.student}`),
          );

      const memoryProfile = await PerformanceTestSetup.profileMemoryUsage(
        sustainedOperation,
        30000, // 30 seconds
      );

      expect(memoryProfile.memoryLeakDetected).toBe(false);

      console.log('Memory Usage Profile:', {
        initial: Math.round(memoryProfile.initialMemory.heapUsed / 1024 / 1024),
        final: Math.round(memoryProfile.finalMemory.heapUsed / 1024 / 1024),
        peak: Math.round(memoryProfile.peakMemory.heapUsed / 1024 / 1024),
      });
    });
  });
});
