import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationService {
  async create(_data: any) {}
  async createNotification(data: any) {
    // Implementation for creating a notification
    console.log('Notification created:', data);
  }
}
