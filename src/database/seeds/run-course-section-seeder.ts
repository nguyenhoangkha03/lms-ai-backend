import { DataSource } from 'typeorm';
import { AppDataSource } from '../data-source';
import { CourseSectionSeeder } from './course-section.seeder';
import { CourseSection } from '@/modules/course/entities/course-section.entity';
import { Course } from '@/modules/course/entities/course.entity';

async function run() {
  await AppDataSource.initialize();
  const seeder = new CourseSectionSeeder(
    AppDataSource.getRepository(CourseSection),
    AppDataSource.getRepository(Course),
  );
  await seeder.seed();
  await AppDataSource.destroy();
}

run().catch(err => {
  console.error('❌ Seeder failed:', err);
  process.exit(1);
});
