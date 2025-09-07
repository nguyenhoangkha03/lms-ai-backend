import { DataSource } from 'typeorm';
import { AppDataSource } from '../data-source';
import { CategorySeeder } from './category.seeder';
import { Category } from '@/modules/course/entities/category.entity';

async function run() {
  await AppDataSource.initialize();
  const seeder = new CategorySeeder(AppDataSource.getRepository(Category));
  await seeder.seed();
  await AppDataSource.destroy();
}

run().catch(err => {
  console.error('❌ Seeder failed:', err);
  process.exit(1);
});
