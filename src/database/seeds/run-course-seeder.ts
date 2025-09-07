import { DataSource } from 'typeorm';
import { AppDataSource } from '../data-source';
import { CourseSeeder } from './course.seeder';
import { Course } from '@/modules/course/entities/course.entity';
import { Category } from '@/modules/course/entities/category.entity';

async function run() {
  await AppDataSource.initialize();
  const seeder = new CourseSeeder(
    AppDataSource.getRepository(Course),
    AppDataSource.getRepository(Category),
  );
  await seeder.seed();
  await AppDataSource.destroy();
}

run().catch(err => {
  console.error('❌ Seeder failed:', err);
  process.exit(1);
});
