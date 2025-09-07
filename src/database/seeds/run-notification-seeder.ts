import { DataSource } from 'typeorm';
import { AppDataSource } from '../data-source';
import { NotificationSeeder } from './notification.seeder';
import { Notification } from '@/modules/notification/entities/notification.entity';

async function run() {
  console.log('🌱 Starting notification seeder...');
  
  try {
    await AppDataSource.initialize();
    console.log('📊 Database connection established');
    
    const seeder = new NotificationSeeder(AppDataSource.getRepository(Notification));
    await seeder.seed();
    
    console.log('✅ Notification seeding completed successfully');
    await AppDataSource.destroy();
    console.log('🔚 Database connection closed');
  } catch (error) {
    console.error('❌ Notification seeder failed:', error);
    await AppDataSource.destroy();
    process.exit(1);
  }
}

run().catch(err => {
  console.error('❌ Seeder failed:', err);
  process.exit(1);
});