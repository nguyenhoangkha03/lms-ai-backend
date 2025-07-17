import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationPreference } from './entities/notification-preference.entity';
import { Notification } from './entities/notification.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, NotificationPreference])],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [TypeOrmModule, NotificationService],
})
export class NotificationModule {}
