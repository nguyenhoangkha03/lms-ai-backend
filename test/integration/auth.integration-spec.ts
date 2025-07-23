import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { IntegrationTestSetup } from '../integration-setup';
import { UserService } from '../../src/modules/user/services/user.service';
import { PasswordService } from '../../src/modules/auth/services/password.service';
import { UserType } from '@/common/enums/user.enums';

describe('Auth Integration Tests', () => {
  let app: INestApplication;
  let userService: UserService;
  let passwordService: PasswordService;

  beforeAll(async () => {
    app = await IntegrationTestSetup.setupTestApp();
    userService = app.get(UserService);
    passwordService = app.get(PasswordService);
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const registerDto = {
        email: 'newuser@test.com',
        username: 'newuser',
        password: 'Password123!',
        userType: 'student',
        firstName: 'New',
        lastName: 'User',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      expect(response.body).toMatchObject({
        message: 'Registration successful',
        user: {
          email: registerDto.email,
          username: registerDto.username,
          userType: registerDto.userType,
        },
      });

      const user = await userService.findByEmail(registerDto.email);
      expect(user).toBeDefined();
      expect(user?.email).toBe(registerDto.email);
    });

    it('should validate email format', async () => {
      const registerDto = {
        email: 'invalid-email',
        username: 'testuser',
        password: 'Password123!',
        userType: 'student',
        firstName: 'Test',
        lastName: 'User',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(400);

      expect(response.body.message).toContain('email must be an email');
    });

    it('should enforce password strength requirements', async () => {
      const registerDto = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'weak',
        userType: 'student',
        firstName: 'Test',
        lastName: 'User',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(400);

      expect(response.body.message).toContain('Password does not meet requirements');
    });

    it('should prevent duplicate email registration', async () => {
      const registerDto = {
        email: 'duplicate@test.com',
        username: 'user1',
        password: 'Password123!',
        userType: 'student',
        firstName: 'User',
        lastName: 'One',
      };

      await request(app.getHttpServer()).post('/auth/register').send(registerDto).expect(201);

      const duplicateDto = {
        ...registerDto,
        username: 'user2',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(duplicateDto)
        .expect(409);

      expect(response.body.message).toContain('Email already exists');
    });
  });

  describe('POST /auth/login', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await userService.create({
        email: 'login@test.com',
        username: 'loginuser',
        passwordHash: await passwordService.hashPassword('Password123!'),
        userType: UserType.STUDENT,
        firstName: 'Login',
        lastName: 'User',
      });
    });

    it('should login with valid credentials', async () => {
      const loginDto = {
        email: 'login@test.com',
        password: 'Password123!',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(200);

      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: {
          id: testUser.id,
          email: testUser.email,
          username: testUser.username,
        },
      });

      expect(response.body.accessToken).toMatch(
        /^eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/,
      );
    });

    it('should reject invalid credentials', async () => {
      const loginDto = {
        email: 'login@test.com',
        password: 'wrongpassword',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);

      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should implement rate limiting for failed attempts', async () => {
      const loginDto = {
        email: 'login@test.com',
        password: 'wrongpassword',
      };

      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer()).post('/auth/login').send(loginDto).expect(401);
      }
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(429);

      expect(response.body.message).toContain('too many requests');
    });
  });

  describe('POST /auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      await userService.create({
        email: 'refresh@test.com',
        username: 'refreshuser',
        passwordHash: await passwordService.hashPassword('Password123!'),
        userType: UserType.STUDENT,
        firstName: 'Refresh',
        lastName: 'User',
      });

      const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({
        email: 'refresh@test.com',
        password: 'Password123!',
      });

      refreshToken = loginResponse.body.refreshToken;
    });

    it('should refresh tokens with valid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });

      // New tokens should be different
      expect(response.body.refreshToken).not.toBe(refreshToken);
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.message).toContain('Invalid refresh token');
    });
  });

  describe('POST /auth/logout', () => {
    let accessToken: string;
    let refreshToken: string;

    beforeEach(async () => {
      await userService.create({
        email: 'logout@test.com',
        username: 'logoutuser',
        passwordHash: await passwordService.hashPassword('Password123!'),
        userType: UserType.STUDENT,
        firstName: 'Logout',
        lastName: 'User',
      });

      const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({
        email: 'logout@test.com',
        password: 'Password123!',
      });

      accessToken = loginResponse.body.accessToken;
      refreshToken = loginResponse.body.refreshToken;
    });

    it('should logout successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);

      expect(response.body.message).toBe('Logout successful');
    });

    it('should invalidate refresh token after logout', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);

      await request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken }).expect(401);
    });
  });
});
