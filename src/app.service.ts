import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(private readonly configService: ConfigService) {}

  getHello(): string {
    return 'LMS AI Backend is running!';
  }

  getHealth() {
    const environment = this.configService.get<string>('NODE_ENV');
    const port = this.configService.get<number>('app.port');
    const apiPrefix = this.configService.get<string>('app.apiPrefix');

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment,
      port,
      apiPrefix,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0',
    };
  }
}
