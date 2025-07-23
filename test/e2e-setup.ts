import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { DatabaseTestUtils } from '../src/common/test-utils/database-test-utils';
import * as request from 'supertest';

export class E2ETestSetup {
  static app: INestApplication;

  static async setupE2EApp(): Promise<INestApplication> {
    if (this.app) {
      return this.app;
    }

    await DatabaseTestUtils.setupTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    this.app = moduleFixture.createNestApplication();

    this.app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await this.app.init();
    return this.app;
  }

  static async cleanupE2EApp(): Promise<void> {
    if (this.app) {
      await this.app.close();
      //   this.app = null;
    }
    await DatabaseTestUtils.cleanupTestDatabase();
  }

  static async createCompleteUserFlow(): Promise<{
    student: any;
    teacher: any;
    admin: any;
    course: any;
    tokens: any;
  }> {
    const studentReg = await request(this.app.getHttpServer()).post('/auth/register').send({
      email: 'student@e2e.com',
      username: 'e2estudent',
      password: 'Password123!',
      userType: 'student',
      firstName: 'E2E',
      lastName: 'Student',
    });

    const teacherReg = await request(this.app.getHttpServer()).post('/auth/register').send({
      email: 'teacher@e2e.com',
      username: 'e2eteacher',
      password: 'Password123!',
      userType: 'teacher',
      firstName: 'E2E',
      lastName: 'Teacher',
    });

    const adminReg = await request(this.app.getHttpServer()).post('/auth/register').send({
      email: 'admin@e2e.com',
      username: 'e2eadmin',
      password: 'Password123!',
      userType: 'admin',
      firstName: 'E2E',
      lastName: 'Admin',
    });

    const studentLogin = await request(this.app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'student@e2e.com', password: 'Password123!' });

    const teacherLogin = await request(this.app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'teacher@e2e.com', password: 'Password123!' });

    const adminLogin = await request(this.app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@e2e.com', password: 'Password123!' });

    // Create category (as admin)
    const category = await request(this.app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${adminLogin.body.accessToken}`)
      .send({
        name: 'E2E Category',
        slug: 'e2e-category',
        description: 'Category for E2E testing',
      });

    const course = await request(this.app.getHttpServer())
      .post('/courses')
      .set('Authorization', `Bearer ${teacherLogin.body.accessToken}`)
      .send({
        title: 'E2E Test Course',
        description: 'Complete course for E2E testing',
        categoryId: category.body.id,
        level: 'beginner',
        language: 'en',
        price: 99.99,
        currency: 'USD',
      });

    return {
      student: studentReg.body.user,
      teacher: teacherReg.body.user,
      admin: adminReg.body.user,
      course: course.body,
      tokens: {
        student: studentLogin.body.accessToken,
        teacher: teacherLogin.body.accessToken,
        admin: adminLogin.body.accessToken,
      },
    };
  }
}

beforeAll(async () => {
  await E2ETestSetup.setupE2EApp();
}, 60000);

afterAll(async () => {
  await E2ETestSetup.cleanupE2EApp();
}, 30000);

beforeEach(async () => {
  await DatabaseTestUtils.clearDatabase();
});
