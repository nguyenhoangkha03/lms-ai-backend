import { DataSource } from 'typeorm';
import { AppDataSource } from '../data-source';
import { LessonSeeder } from './lesson.seeder';
import { Course } from '@/modules/course/entities/course.entity';
import { Lesson } from '@/modules/course/entities/lesson.entity';
import { CourseSection } from '@/modules/course/entities/course-section.entity';

async function run() {
  await AppDataSource.initialize();
  const seeder = new LessonSeeder(
    AppDataSource.getRepository(Lesson),
    AppDataSource.getRepository(Course),
    AppDataSource.getRepository(CourseSection),
  );
  await seeder.seed();
  await AppDataSource.destroy();
}

run().catch(err => {
  console.error('❌ Seeder failed:', err);
  process.exit(1);
});
