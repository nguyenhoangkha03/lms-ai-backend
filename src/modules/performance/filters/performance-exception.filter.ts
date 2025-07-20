import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { WinstonService } from '@/logger/winston.service';
import { PerformanceMonitoringService } from '../services/performance-monitoring.service';

@Catch()
export class PerformanceExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly logger: WinstonService,
    private readonly performanceMonitoring: PerformanceMonitoringService,
  ) {
    this.logger.setContext(PerformanceExceptionFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException ? exception.getResponse() : 'Internal server error';

    // Record error metrics
    const startTime = (request as any).performanceMarkers?.start;
    if (startTime) {
      const endTime = process.hrtime.bigint();
      const responseTime = Number(endTime - startTime) / 1000000;

      this.performanceMonitoring.recordRequestMetrics({
        endpoint: request.path,
        method: request.method,
        responseTime,
        statusCode: status,
        userAgent: request.headers['user-agent'],
        userId: (request as any).user?.id,
      });
    }

    // Log the error with performance context
    this.logger.error(`Request exception, {
      path: ${request.path},
      method: ${request.method},
      statusCode: ${status},
      message: ${typeof message === 'string' ? message : JSON.stringify(message)},
      stack: ${exception instanceof Error ? exception.stack : undefined},
    }`);

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: typeof message === 'object' ? message : { message },
    });
  }
}
