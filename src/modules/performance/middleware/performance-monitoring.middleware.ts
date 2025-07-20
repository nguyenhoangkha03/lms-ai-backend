import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PerformanceMonitoringService } from '../services/performance-monitoring.service';
import { WinstonService } from '@/logger/winston.service';

@Injectable()
export class PerformanceMonitoringMiddleware implements NestMiddleware {
  constructor(
    private readonly performanceMonitoring: PerformanceMonitoringService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(PerformanceMonitoringMiddleware.name);
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = process.hrtime.bigint();

    (req as any).performanceMarkers = {
      start: startTime,
      middleware: [],
      guards: [],
      interceptors: [],
    };

    const originalEnd = res.end;
    res.end = (...args: any[]) => {
      const endTime = process.hrtime.bigint();
      const responseTime = Number(endTime - startTime) / 1_000_000;

      this.performanceMonitoring.recordRequestMetrics({
        endpoint: req.path,
        method: req.method,
        responseTime,
        statusCode: res.statusCode,
        userAgent: req.headers['user-agent'],
        userId: (req as any).user?.id,
      });

      if (responseTime > 1000) {
        this.logger.warn(`Slow request detected, {
          path: ${req.path},
          method: ${req.method},
          responseTime: ${responseTime},
          statusCode: ${res.statusCode},
        }`);
      }

      return originalEnd.apply(res, args);
    };

    next();
  }
}
