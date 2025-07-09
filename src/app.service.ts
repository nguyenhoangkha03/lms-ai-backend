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
      uptime: process.uptime(), // Thời gian server đã hoạt động (tính bằng giây).
      memory: process.memoryUsage(),
      // Thông tin bộ nhớ sử dụng của ứng dụng, bao gồm:
      // "rss": 115712000,                 // Tổng bộ nhớ RAM NodeJS đang chiếm dụng (Resident Set Size), đơn vị byte.
      // "heapTotal": 71946240,            // Tổng dung lượng Heap được cấp phát.
      // "heapUsed": 58035344,             // Dung lượng Heap thực sự đang được sử dụng.
      // "external": 2455012,              // Bộ nhớ dùng cho các tài nguyên bên ngoài V8, như Buffer, C extension.
      // "arrayBuffers": 58714             // Bộ nhớ dành cho ArrayBuffer, SharedArrayBuffer.
      version: process.env.npm_package_version || '1.0.0',
    };
  }
}
