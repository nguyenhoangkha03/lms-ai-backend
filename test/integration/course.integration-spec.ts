import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { IntegrationTestSetup } from '../integration-setup';

describe('Course Management Integration Tests', () => {
  let app: INestApplication;
  let _adminToken: string;
  let teacherToken: string;
  let studentToken: string;
  let testData: any;

  beforeAll(async () => {
    app = await IntegrationTestSetup.setupTestApp();
  });

  beforeEach(async () => {
    testData = await IntegrationTestSetup.seedBasicData();

    // Get auth tokens
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: 'password123' });
    _adminToken = adminLogin.body.accessToken;

    const teacherLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'teacher@test.com', password: 'password123' });
    teacherToken = teacherLogin.body.accessToken;

    const studentLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'student@test.com', password: 'password123' });
    studentToken = studentLogin.body.accessToken;
  });

  describe('POST /courses', () => {
    it('should allow teacher to create a course', async () => {
      const courseDto = {
        title: 'New Course',
        description: 'Course description',
        categoryId: testData.course.categoryId,
        level: 'intermediate',
        language: 'en',
        price: 149.99,
        currency: 'USD',
      };

      const response = await request(app.getHttpServer())
        .post('/courses')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(courseDto)
        .expect(201);

      expect(response.body).toMatchObject({
        title: courseDto.title,
        description: courseDto.description,
        instructorId: testData.teacher.id,
        status: 'draft',
      });
    });

    it('should validate course data', async () => {
      const invalidDto = {
        title: '', // Empty title
        price: -10, // Negative price
      };

      const response = await request(app.getHttpServer())
        .post('/courses')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(invalidDto)
        .expect(400);

      expect(response.body.message).toContain('validation failed');
    });

    it('should deny course creation to students', async () => {
      const courseDto = {
        title: 'Unauthorized Course',
        description: 'Should not be created',
      };

      await request(app.getHttpServer())
        .post('/courses')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(courseDto)
        .expect(403);
    });
  });

  describe('GET /courses', () => {
    it('should return published courses for public access', async () => {
      const response = await request(app.getHttpServer()).get('/courses').expect(200);

      expect(response.body).toMatchObject({
        items: expect.any(Array),
        total: expect.any(Number),
      });
    });

    it('should support filtering by category', async () => {
      const response = await request(app.getHttpServer())
        .get(`/courses?categoryId=${testData.course.categoryId}`)
        .expect(200);

      expect(
        response.body.items.every(course => course.categoryId === testData.course.categoryId),
      ).toBe(true);
    });

    it('should support search functionality', async () => {
      const response = await request(app.getHttpServer()).get('/courses?search=Test').expect(200);

      expect(response.body.items.some(course => course.title.includes('Test'))).toBe(true);
    });
  });

  describe('GET /courses/:id', () => {
    it('should return course details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/courses/${testData.course.id}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: testData.course.id,
        title: testData.course.title,
        instructor: expect.objectContaining({
          id: testData.teacher.id,
        }),
      });
    });

    it('should include enrollment status for authenticated users', async () => {
      const response = await request(app.getHttpServer())
        .get(`/courses/${testData.course.id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('isEnrolled');
      expect(response.body).toHaveProperty('enrollmentStatus');
    });
  });

  describe('POST /courses/:id/enroll', () => {
    it('should allow student to enroll in course', async () => {
      const response = await request(app.getHttpServer())
        .post(`/courses/${testData.course.id}/enroll`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.message).toContain('enrolled successfully');
    });

    it('should prevent duplicate enrollments', async () => {
      // First enrollment
      await request(app.getHttpServer())
        .post(`/courses/${testData.course.id}/enroll`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      // Second enrollment attempt
      const response = await request(app.getHttpServer())
        .post(`/courses/${testData.course.id}/enroll`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(409);

      expect(response.body.message).toContain('already enrolled');
    });

    it('should deny enrollment to instructors of the same course', async () => {
      await request(app.getHttpServer())
        .post(`/courses/${testData.course.id}/enroll`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(403);
    });
  });

  describe('PUT /courses/:id', () => {
    it('should allow instructor to update their course', async () => {
      const updateDto = {
        title: 'Updated Course Title',
        description: 'Updated description',
      };

      const response = await request(app.getHttpServer())
        .put(`/courses/${testData.course.id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body).toMatchObject(updateDto);
    });

    it('should deny updates to non-instructors', async () => {
      const updateDto = { title: 'Unauthorized Update' };

      await request(app.getHttpServer())
        .put(`/courses/${testData.course.id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(updateDto)
        .expect(403);
    });
  });

  describe('POST /courses/:id/publish', () => {
    it('should allow instructor to publish course', async () => {
      const response = await request(app.getHttpServer())
        .post(`/courses/${testData.course.id}/publish`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(response.body.status).toBe('published');
    });

    it('should validate course completeness before publishing', async () => {
      // Create incomplete course
      const incompleteDto = {
        title: 'Incomplete Course',
        description: 'Missing sections',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/courses')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(incompleteDto);

      const response = await request(app.getHttpServer())
        .post(`/courses/${createResponse.body.id}/publish`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(400);

      expect(response.body.message).toContain('Course must have at least one section');
    });
  });
});
