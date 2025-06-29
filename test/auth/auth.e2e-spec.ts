import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { DatabaseModule } from '../../src/database/database.module';
import configuration from '@/config/configuration';

describe('Authentication (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [configuration],
          isGlobal: true,
        }),
        DatabaseModule,
        AuthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          username: 'testuser',
          password: 'SecurePassword123!',
          userType: 'student',
        })
        .expect(201)
        .expect(res => {
          expect(res.body.message).toBe('User registered successfully');
          expect(res.body.user).toBeDefined();
          expect(res.body.accessToken).toBeDefined();
        });
    });

    it('should reject registration with weak password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'test2@example.com',
          username: 'testuser2',
          password: '123456',
          userType: 'student',
        })
        .expect(400)
        .expect(res => {
          expect(res.body.message).toBe('Password does not meet security requirements');
        });
    });
  });

  describe('/auth/login (POST)', () => {
    it('should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePassword123!',
        })
        .expect(200)
        .expect(res => {
          expect(res.body.message).toBe('Login successful');
          expect(res.body.accessToken).toBeDefined();
          accessToken = res.body.accessToken;
        });
    });

    it('should reject login with invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });
  });

  describe('/auth/me (GET)', () => {
    it('should return user profile when authenticated', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect(res => {
          expect(res.body.user).toBeDefined();
          expect(res.body.user.email).toBe('test@example.com');
        });
    });

    it('should reject unauthenticated requests', () => {
      return request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on login attempts', async () => {
      const promises = Array.from({ length: 10 }, () =>
        request(app.getHttpServer()).post('/api/v1/auth/login').send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
        }),
      );

      const responses = await Promise.all(promises);
      const rateLimitedResponses = responses.filter(res => res.status === 429);

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});
