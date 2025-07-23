import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { E2ETestSetup } from '../e2e-setup';

describe('Complete User Journey E2E Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await E2ETestSetup.setupE2EApp();
  });

  describe('Student Learning Journey', () => {
    it('should complete full student learning journey', async () => {
      const testData = await E2ETestSetup.createCompleteUserFlow();

      // Step 1: Student browses courses
      const coursesResponse = await request(app.getHttpServer()).get('/courses').expect(200);

      expect(coursesResponse.body.items).toContainEqual(
        expect.objectContaining({ id: testData.course.id }),
      );

      // Step 2: Student views course details
      const courseDetailResponse = await request(app.getHttpServer())
        .get(`/courses/${testData.course.id}`)
        .set('Authorization', `Bearer ${testData.tokens.student}`)
        .expect(200);

      expect(courseDetailResponse.body).toMatchObject({
        id: testData.course.id,
        title: testData.course.title,
        isEnrolled: false,
      });

      // Step 3: Student enrolls in course
      const enrollResponse = await request(app.getHttpServer())
        .post(`/courses/${testData.course.id}/enroll`)
        .set('Authorization', `Bearer ${testData.tokens.student}`)
        .expect(200);

      expect(enrollResponse.body.message).toContain('enrolled successfully');

      // Step 4: Verify enrollment status
      const enrolledCourseResponse = await request(app.getHttpServer())
        .get(`/courses/${testData.course.id}`)
        .set('Authorization', `Bearer ${testData.tokens.student}`)
        .expect(200);

      expect(enrolledCourseResponse.body.isEnrolled).toBe(true);

      // Step 5: Student accesses course content
      const progressResponse = await request(app.getHttpServer())
        .get(`/courses/${testData.course.id}/progress`)
        .set('Authorization', `Bearer ${testData.tokens.student}`)
        .expect(200);

      expect(progressResponse.body).toHaveProperty('enrollmentDate');
      expect(progressResponse.body).toHaveProperty('progressPercentage');

      // Step 6: Student updates profile
      const profileUpdateResponse = await request(app.getHttpServer())
        .put(`/users/${testData.student.id}/profile`)
        .set('Authorization', `Bearer ${testData.tokens.student}`)
        .send({
          bio: 'Completed E2E learning journey',
          learningGoals: ['Complete course', 'Get certificate'],
        })
        .expect(200);

      expect(profileUpdateResponse.body.profile.bio).toBe('Completed E2E learning journey');
    }, 60000);
  });

  describe('Teacher Course Management Journey', () => {
    it('should complete full teacher course creation and management journey', async () => {
      const testData = await E2ETestSetup.createCompleteUserFlow();

      // Step 1: Teacher creates course sections
      const sectionResponse = await request(app.getHttpServer())
        .post(`/courses/${testData.course.id}/sections`)
        .set('Authorization', `Bearer ${testData.tokens.teacher}`)
        .send({
          title: 'Introduction Section',
          description: 'Course introduction and overview',
          orderIndex: 0,
        })
        .expect(201);

      const sectionId = sectionResponse.body.id;

      // Step 2: Teacher adds lessons to section
      const _lessonResponse = await request(app.getHttpServer())
        .post(`/courses/${testData.course.id}/sections/${sectionId}/lessons`)
        .set('Authorization', `Bearer ${testData.tokens.teacher}`)
        .send({
          title: 'Welcome Lesson',
          description: 'Introduction to the course',
          content: 'Welcome to our comprehensive course!',
          contentType: 'text',
          orderIndex: 0,
          duration: 300,
        })
        .expect(201);

      // Step 3: Teacher creates an assessment
      const assessmentResponse = await request(app.getHttpServer())
        .post(`/courses/${testData.course.id}/assessments`)
        .set('Authorization', `Bearer ${testData.tokens.teacher}`)
        .send({
          title: 'Introduction Quiz',
          description: 'Test your understanding of the basics',
          type: 'quiz',
          timeLimit: 600,
          maxAttempts: 3,
          passingScore: 70,
        })
        .expect(201);

      const assessmentId = assessmentResponse.body.id;

      // Step 4: Teacher adds questions to assessment
      const _questionResponse = await request(app.getHttpServer())
        .post(`/assessments/${assessmentId}/questions`)
        .set('Authorization', `Bearer ${testData.tokens.teacher}`)
        .send({
          questionText: 'What is the main topic of this course?',
          questionType: 'multiple_choice',
          points: 10,
          options: [
            { text: 'Programming', isCorrect: true },
            { text: 'Cooking', isCorrect: false },
            { text: 'Sports', isCorrect: false },
            { text: 'Music', isCorrect: false },
          ],
        })
        .expect(201);

      // Step 5: Teacher publishes the course
      const publishResponse = await request(app.getHttpServer())
        .post(`/courses/${testData.course.id}/publish`)
        .set('Authorization', `Bearer ${testData.tokens.teacher}`)
        .expect(200);

      expect(publishResponse.body.status).toBe('published');

      // Step 6: Teacher views course analytics
      const analyticsResponse = await request(app.getHttpServer())
        .get(`/courses/${testData.course.id}/analytics`)
        .set('Authorization', `Bearer ${testData.tokens.teacher}`)
        .expect(200);

      expect(analyticsResponse.body).toHaveProperty('enrollmentCount');
      expect(analyticsResponse.body).toHaveProperty('completionRate');
    }, 60000);
  });

  describe('Admin Management Journey', () => {
    it('should complete full admin management journey', async () => {
      const testData = await E2ETestSetup.createCompleteUserFlow();

      // Step 1: Admin views all users
      const usersResponse = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${testData.tokens.admin}`)
        .expect(200);

      expect(usersResponse.body.items.length).toBeGreaterThanOrEqual(3);

      // Step 2: Admin manages user roles
      const _roleAssignResponse = await request(app.getHttpServer())
        .post(`/users/${testData.teacher.id}/roles`)
        .set('Authorization', `Bearer ${testData.tokens.admin}`)
        .send({ roleId: 'instructor' })
        .expect(200);

      // Step 3: Admin views system analytics
      const systemAnalyticsResponse = await request(app.getHttpServer())
        .get('/admin/analytics/overview')
        .set('Authorization', `Bearer ${testData.tokens.admin}`)
        .expect(200);

      expect(systemAnalyticsResponse.body).toHaveProperty('totalUsers');
      expect(systemAnalyticsResponse.body).toHaveProperty('totalCourses');

      // Step 4: Admin manages course approvals
      const _pendingCoursesResponse = await request(app.getHttpServer())
        .get('/admin/courses/pending')
        .set('Authorization', `Bearer ${testData.tokens.admin}`)
        .expect(200);

      // Step 5: Admin configures system settings
      const settingsResponse = await request(app.getHttpServer())
        .put('/admin/settings')
        .set('Authorization', `Bearer ${testData.tokens.admin}`)
        .send({
          maxFileUploadSize: 100000000,
          enableEmailNotifications: true,
          maintenanceMode: false,
        })
        .expect(200);

      expect(settingsResponse.body.message).toContain('Settings updated');
    }, 60000);
  });
});
