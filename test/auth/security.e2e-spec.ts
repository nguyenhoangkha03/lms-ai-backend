import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Security (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Security Headers', () => {
    it('should include security headers', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(res => {
          expect(res.headers['x-content-type-options']).toBe('nosniff');
          expect(res.headers['x-frame-options']).toBe('DENY');
          expect(res.headers['x-xss-protection']).toBe('1; mode=block');
        });
    });

    it('should not expose sensitive headers', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(res => {
          expect(res.headers['x-powered-by']).toBeUndefined();
          expect(res.headers['server']).toBeUndefined();
        });
    });
  });

  describe('Input Validation', () => {
    it('should sanitize malicious input', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          username: '<script>alert("xss")</script>',
          password: 'SecurePassword123!',
        })
        .expect(res => {
          if (res.body.user) {
            expect(res.body.user.username).not.toContain('<script>');
          }
        });
    });

    it('should reject SQL injection attempts', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: "admin'--",
          password: 'anything',
        })
        .expect(401);
    });
  });

  describe('CORS Policy', () => {
    it('should enforce CORS policy', () => {
      return request(app.getHttpServer())
        .options('/api/v1/auth/login')
        .set('Origin', 'https://malicious-site.com')
        .expect(res => {
          expect(res.headers['access-control-allow-origin']).not.toBe('https://malicious-site.com');
        });
    });

    it('should allow configured origins', () => {
      return request(app.getHttpServer())
        .options('/api/v1/auth/login')
        .set('Origin', 'http://localhost:3000')
        .expect(res => {
          expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
        });
    });
  });
});
