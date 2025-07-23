import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { SecurityTestSetup } from './security-test-setup';
import { E2ETestSetup } from '../e2e-setup';

describe('Security Tests', () => {
  let app: INestApplication;
  let testData: any;

  beforeAll(async () => {
    app = await E2ETestSetup.setupE2EApp();
    testData = await E2ETestSetup.createCompleteUserFlow();
  }, 60000);

  describe('SQL Injection Protection', () => {
    it('should protect against SQL injection in course search', async () => {
      const isSecure = await SecurityTestSetup.testSQLInjection(app, '/courses');
      expect(isSecure).toBe(true);
    });

    it('should protect against SQL injection in user search', async () => {
      const isSecure = await SecurityTestSetup.testSQLInjection(
        app,
        '/users',
        testData.tokens.admin,
      );
      expect(isSecure).toBe(true);
    });
  });

  describe('XSS Protection', () => {
    it('should sanitize user input in course creation', async () => {
      const isSecure = await SecurityTestSetup.testXSS(app, '/courses', testData.tokens.teacher);
      expect(isSecure).toBe(true);
    });

    it('should sanitize user input in profile updates', async () => {
      const isSecure = await SecurityTestSetup.testXSS(
        app,
        `/users/${testData.student.id}/profile`,
        testData.tokens.student,
      );
      expect(isSecure).toBe(true);
    });
  });

  describe('Authentication & Authorization', () => {
    it('should protect admin endpoints from unauthorized access', async () => {
      const isSecure = await SecurityTestSetup.testAuthenticationBypass(app, '/admin/users');
      expect(isSecure).toBe(true);
    });

    it('should protect user-specific endpoints', async () => {
      const isSecure = await SecurityTestSetup.testAuthenticationBypass(
        app,
        `/users/${testData.student.id}/profile`,
      );
      expect(isSecure).toBe(true);
    });

    it('should enforce role-based access control', async () => {
      // Student trying to access admin endpoint
      const response = await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${testData.tokens.student}`)
        .expect(403);

      expect(response.body.message).toContain('Insufficient permissions');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting on login attempts', async () => {
      const isRateLimited = await SecurityTestSetup.testRateLimiting(app, '/auth/login', 5);
      expect(isRateLimited).toBe(true);
    });

    it('should enforce rate limiting on registration', async () => {
      const isRateLimited = await SecurityTestSetup.testRateLimiting(app, '/auth/register', 3);
      expect(isRateLimited).toBe(true);
    });
  });

  describe('Input Validation', () => {
    it('should validate course creation inputs', async () => {
      const isSecure = await SecurityTestSetup.testInputValidation(
        app,
        '/courses',
        testData.tokens.teacher,
      );
      expect(isSecure).toBe(true);
    });

    it('should validate user registration inputs', async () => {
      const isSecure = await SecurityTestSetup.testInputValidation(app, '/auth/register');
      expect(isSecure).toBe(true);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app.getHttpServer()).get('/courses').expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });
  });

  describe('Data Exposure', () => {
    it('should not expose sensitive user data in API responses', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${testData.student.id}`)
        .set('Authorization', `Bearer ${testData.tokens.student}`)
        .expect(200);

      expect(response.body).not.toHaveProperty('passwordHash');
      expect(response.body).not.toHaveProperty('refreshTokens');
      expect(response.body).not.toHaveProperty('twoFactorSecret');
    });

    it('should not expose internal system information in error responses', async () => {
      const response = await request(app.getHttpServer()).get('/non-existent-endpoint').expect(404);

      expect(response.body.message).not.toContain('mysql');
      expect(response.body.message).not.toContain('redis');
      expect(response.body.message).not.toContain('src/');
    });
  });

  describe('File Upload Security', () => {
    it('should validate file types and sizes', async () => {
      // Test malicious file upload
      const maliciousFile = Buffer.from('<?php echo "hacked"; ?>');

      const response = await request(app.getHttpServer())
        .post('/upload/avatar')
        .set('Authorization', `Bearer ${testData.tokens.student}`)
        .attach('file', maliciousFile, 'malicious.php')
        .expect(400);

      expect(response.body.message).toContain('Invalid file type');
    });

    it('should prevent path traversal in file uploads', async () => {
      const response = await request(app.getHttpServer())
        .post('/upload/avatar')
        .set('Authorization', `Bearer ${testData.tokens.student}`)
        .field('filename', '../../../etc/passwd')
        .expect(400);

      expect(response.body.message).toContain('Invalid filename');
    });
  });
});
