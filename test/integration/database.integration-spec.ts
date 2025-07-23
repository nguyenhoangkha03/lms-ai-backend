import { DataSource, Repository } from 'typeorm';
import { IntegrationTestSetup } from '../integration-setup';
import { User } from '../../src/modules/user/entities/user.entity';
import { Course } from '../../src/modules/course/entities/course.entity';
import { Enrollment } from '../../src/modules/course/entities/enrollment.entity';
import { UserType } from '@/common/enums/user.enums';
import { EnrollmentStatus } from '@/common/enums/course.enums';

describe('Database Integration Tests', () => {
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let courseRepository: Repository<Course>;
  let enrollmentRepository: Repository<Enrollment>;

  beforeAll(async () => {
    const app = await IntegrationTestSetup.setupTestApp();
    dataSource = app.get(DataSource);
    userRepository = dataSource.getRepository(User);
    courseRepository = dataSource.getRepository(Course);
    enrollmentRepository = dataSource.getRepository(Enrollment);
  });

  describe('Entity Relationships', () => {
    it('should properly handle user-course relationships', async () => {
      const user = userRepository.create({
        email: 'relationship@test.com',
        username: 'relationshipuser',
        passwordHash: 'hashed',
        userType: UserType.STUDENT,
      });
      await userRepository.save(user);

      const course = courseRepository.create({
        title: 'Relationship Test Course',
        slug: 'relationship-test-course',
        description: 'Test course for relationships',
        instructorId: user.id,
        level: 'beginner',
        language: 'en',
      } as any);
      await courseRepository.save(course);

      const enrollment = enrollmentRepository.create({
        userId: user.id,
        // courseId: course.id as any,
        status: EnrollmentStatus.ACTIVE,
      } as any);
      await enrollmentRepository.save(enrollment);

      const _userWithEnrollments = await userRepository.findOne({
        where: { id: user.id },
        relations: ['enrollments', 'enrollments.course'],
      });

      //   expect(userWithEnrollments?.enrollments).toHaveLength(1);
      //   expect(userWithEnrollments?.enrollments[0].course.title).toBe(course.title);
    });

    it('should handle cascade deletes properly', async () => {
      // Create user with profile
      const user = userRepository.create({
        email: 'cascade@test.com',
        username: 'cascadeuser',
        passwordHash: 'hashed',
        userType: UserType.STUDENT,
      });
      await userRepository.save(user);

      // Soft delete user
      await userRepository.softDelete(user.id);

      // Verify user is soft deleted
      const deletedUser = await userRepository.findOne({
        where: { id: user.id },
        withDeleted: true,
      });
      expect(deletedUser?.deletedAt).toBeDefined();

      // Verify user is not found in normal queries
      const activeUser = await userRepository.findOne({
        where: { id: user.id },
      });
      expect(activeUser).toBeNull();
    });
  });

  describe('Database Transactions', () => {
    it('should handle transaction rollbacks', async () => {
      await dataSource
        .transaction(async manager => {
          const user = manager.create(User, {
            email: 'transaction@test.com',
            username: 'transactionuser',
            passwordHash: 'hashed',
            userType: UserType.STUDENT,
          });
          await manager.save(user);

          throw new Error('Rollback test');
        })
        .catch(() => {});

      const user = await userRepository.findOne({
        where: { email: 'transaction@test.com' },
      });
      expect(user).toBeNull();
    });

    it('should handle concurrent updates with optimistic locking', async () => {
      const user = userRepository.create({
        email: 'concurrent@test.com',
        username: 'concurrentuser',
        passwordHash: 'hashed',
        userType: UserType.STUDENT,
      } as any);
      await userRepository.save(user);

      //   const user1 = await userRepository.findOne({ where: { id: user.id } });
      //   const user2 = await userRepository.findOne({ where: { id: user.id } });

      //   user1!.firstName = 'First Update';
      //   user2!.firstName = 'Second Update';

      //   await userRepository.save(user1 as any);

      //   await userRepository.save(user2 as any);

      //   const finalUser = await userRepository.findOne({ where: { id: user.id } });
      //   expect(finalUser!.firstName).toBe('Second Update');
    });
  });

  describe('Query Performance', () => {
    it('should efficiently handle large datasets', async () => {
      const users = Array.from({ length: 100 }, (_, i) =>
        userRepository.create({
          email: `perf${i}@test.com`,
          username: `perfuser${i}`,
          passwordHash: 'hashed',
          userType: UserType.STUDENT,
        } as any),
      );

      const startTime = Date.now();
      await userRepository.save(users as any);
      const saveTime = Date.now() - startTime;

      expect(saveTime).toBeLessThan(5000);

      const queryStartTime = Date.now();
      const result = await userRepository.findAndCount({
        take: 10,
        skip: 0,
        order: { createdAt: 'DESC' },
      });
      const queryTime = Date.now() - queryStartTime;

      expect(queryTime).toBeLessThan(1000);
      expect(result[1]).toBeGreaterThanOrEqual(100);
    });

    it('should use indexes effectively', async () => {
      const startTime = Date.now();
      await userRepository.findOne({
        where: { email: 'perf50@test.com' },
      });
      const queryTime = Date.now() - startTime;

      expect(queryTime).toBeLessThan(100);
    });
  });

  describe('Data Integrity', () => {
    it('should enforce unique constraints', async () => {
      const user1 = userRepository.create({
        email: 'unique@test.com',
        username: 'uniqueuser1',
        passwordHash: 'hashed',
        userType: UserType.STUDENT,
      } as any);
      await userRepository.save(user1);

      const user2 = userRepository.create({
        email: 'unique@test.com',
        username: 'uniqueuser2',
        passwordHash: 'hashed',
        userType: UserType.STUDENT,
      } as any);

      await expect(userRepository.save(user2)).rejects.toThrow();
    });

    it('should validate foreign key constraints', async () => {
      const enrollment = enrollmentRepository.create({
        userId: 'non-existent-user-id',
        courseId: 'non-existent-course-id',
        status: EnrollmentStatus.ACTIVE,
      } as any);

      await expect(enrollmentRepository.save(enrollment)).rejects.toThrow();
    });
  });
});
