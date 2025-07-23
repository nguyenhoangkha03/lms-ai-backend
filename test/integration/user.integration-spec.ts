import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { IntegrationTestSetup } from '../integration-setup';

describe('User Management Integration Tests', () => {
  let app: INestApplication;
  let adminToken: string;
  let teacherToken: string;
  let studentToken: string;
  let testData: any;

  beforeAll(async () => {
    app = await IntegrationTestSetup.setupTestApp();
  });

  beforeEach(async () => {
    testData = await IntegrationTestSetup.seedBasicData();

    // Get auth tokens for different user types
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: 'password123' });
    adminToken = adminLogin.body.accessToken;

    const teacherLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'teacher@test.com', password: 'password123' });
    teacherToken = teacherLogin.body.accessToken;

    const studentLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'student@test.com', password: 'password123' });
    studentToken = studentLogin.body.accessToken;
  });

  describe('GET /users', () => {
    it('should allow admin to get all users', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        items: expect.any(Array),
        total: expect.any(Number),
        page: 1,
        limit: 10,
      });

      expect(response.body.items.length).toBeGreaterThanOrEqual(3);
    });

    it('should deny access to non-admin users', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });

    it('should support filtering and pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/users?userType=student&page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.items.every(user => user.userType === 'student')).toBe(true);
      expect(response.body.limit).toBe(5);
    });
  });

  describe('GET /users/:id', () => {
    it('should allow user to get their own profile', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${testData.student.id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: testData.student.id,
        email: testData.student.email,
        username: testData.student.username,
      });
    });

    it('should allow admin to get any user profile', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${testData.student.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.id).toBe(testData.student.id);
    });

    it('should deny access to other users profiles', async () => {
      await request(app.getHttpServer())
        .get(`/users/${testData.teacher.id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });
  });

  describe('PUT /users/:id/profile', () => {
    it('should allow user to update their own profile', async () => {
      const updateDto = {
        firstName: 'Updated',
        lastName: 'Name',
        bio: 'Updated bio',
      };

      const response = await request(app.getHttpServer())
        .put(`/users/${testData.student.id}/profile`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.profile).toMatchObject(updateDto);
    });

    it('should validate profile data', async () => {
      const invalidDto = {
        firstName: '', // Empty string should fail validation
        email: 'invalid-email', // Invalid email format
      };

      const response = await request(app.getHttpServer())
        .put(`/users/${testData.student.id}/profile`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(invalidDto)
        .expect(400);

      expect(response.body.message).toContain('validation failed');
    });
  });

  describe('POST /users/:id/roles', () => {
    it('should allow admin to assign roles', async () => {
      const roleDto = { roleId: 'instructor-role' };

      const response = await request(app.getHttpServer())
        .post(`/users/${testData.student.id}/roles`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(roleDto)
        .expect(200);

      expect(response.body.message).toContain('Role assigned successfully');
    });

    it('should deny role assignment to non-admin', async () => {
      const roleDto = { roleId: 'admin-role' };

      await request(app.getHttpServer())
        .post(`/users/${testData.student.id}/roles`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(roleDto)
        .expect(403);
    });
  });

  describe('DELETE /users/:id', () => {
    it('should allow admin to soft delete users', async () => {
      await request(app.getHttpServer())
        .delete(`/users/${testData.student.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify user is soft deleted
      const _response = await request(app.getHttpServer())
        .get(`/users/${testData.student.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should prevent self-deletion', async () => {
      await request(app.getHttpServer())
        .delete(`/users/${testData.admin.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });
});
