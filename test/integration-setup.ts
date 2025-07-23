import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppModule } from '../src/app.module';
import { DatabaseTestUtils } from '../src/common/test-utils/database-test-utils';
import { RedisService } from '../src/redis/redis.service';

export class IntegrationTestSetup {
  static app: INestApplication;
  static dataSource: DataSource;
  static redisService: RedisService;

  static async setupTestApp(): Promise<INestApplication> {
    if (this.app) {
      return this.app;
    }

    this.dataSource = await DatabaseTestUtils.setupTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRootAsync({
          useFactory: () => ({
            type: 'mysql',
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT!) || 3306,
            username: process.env.DB_USERNAME || 'root',
            password: process.env.DB_PASSWORD || '',
            database: `${process.env.DB_DATABASE || 'lms_ai'}_test`,
            entities: ['src/**/*.entity.ts'],
            synchronize: true,
            dropSchema: true,
            logging: false,
          }),
        }),
        AppModule,
      ],
    }).compile();

    this.app = moduleFixture.createNestApplication();
    this.redisService = this.app.get(RedisService);

    const { ValidationPipe } = await import('@nestjs/common');
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

  static async cleanupTestApp(): Promise<void> {
    if (this.redisService) {
      await this.redisService.flushAll();
    }

    if (this.dataSource?.isInitialized) {
      await DatabaseTestUtils.clearDatabase();
    }

    if (this.app) {
      await this.app.close();
      //   this.app = undefined;
    }
  }

  static async seedBasicData(): Promise<{
    admin: any;
    teacher: any;
    student: any;
    course: any;
  }> {
    const userService = this.app.get('UserService');
    const courseService = this.app.get('CourseService');
    const categoryService = this.app.get('CategoryService');

    const admin = await userService.create({
      email: 'admin@test.com',
      username: 'admin',
      passwordHash: await this.app.get('PasswordService').hashPassword('password123'),
      userType: 'admin',
      firstName: 'Admin',
      lastName: 'User',
    });

    const teacher = await userService.create({
      email: 'teacher@test.com',
      username: 'teacher',
      passwordHash: await this.app.get('PasswordService').hashPassword('password123'),
      userType: 'teacher',
      firstName: 'Teacher',
      lastName: 'User',
    });

    const student = await userService.create({
      email: 'student@test.com',
      username: 'student',
      passwordHash: await this.app.get('PasswordService').hashPassword('password123'),
      userType: 'student',
      firstName: 'Student',
      lastName: 'User',
    });

    const category = await categoryService.create({
      name: 'Programming',
      slug: 'programming',
      description: 'Programming courses',
    });

    const course = await courseService.create({
      title: 'Test Course',
      slug: 'test-course',
      description: 'Test course description',
      categoryId: category.id,
      instructorId: teacher.id,
      level: 'beginner',
      language: 'en',
      price: 99.99,
      currency: 'USD',
    });

    return { admin, teacher, student, course };
  }
}

// Global setup and teardown
beforeAll(async () => {
  await IntegrationTestSetup.setupTestApp();
}, 60000);

afterAll(async () => {
  await IntegrationTestSetup.cleanupTestApp();
}, 30000);

beforeEach(async () => {
  await DatabaseTestUtils.clearDatabase();
  await IntegrationTestSetup.redisService?.flushAll();
});
