import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { Request, Response } from 'express';
import { WinstonService } from '@/logger/winston.service';
import { SerializationService } from '../services/serialization.service';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  constructor(
    private readonly logger: WinstonService,
    private readonly serializationService: SerializationService,
  ) {
    this.logger.setContext(PerformanceInterceptor.name);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = process.hrtime.bigint();

    // Add performance markers
    (request as any).performanceMarkers = {
      start: startTime,
      guardTime: null,
      handlerTime: null,
      serializationTime: null,
    };

    return next.handle().pipe(
      map(data => {
        const handlerTime = process.hrtime.bigint();
        (request as any).performanceMarkers.handlerTime = handlerTime;

        // Apply response optimization
        const optimizedData = this.optimizeResponse(data, request, response);

        const serializationTime = process.hrtime.bigint();
        (request as any).performanceMarkers.serializationTime = serializationTime;

        return optimizedData;
      }),
      tap(() => {
        const endTime = process.hrtime.bigint();
        const totalTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds

        // Log performance metrics
        this.logPerformanceMetrics(request, response, totalTime);

        // Set performance headers
        response.setHeader('X-Response-Time', `${totalTime.toFixed(2)}ms`);
        response.setHeader('X-Performance-Grade', this.calculatePerformanceGrade(totalTime));
      }),
    );
  }

  private optimizeResponse(data: any, request: Request, response: Response): any {
    const acceptEncoding = request.headers['accept-encoding'] || '';
    const userAgent = request.headers['user-agent'] || '';

    // Apply conditional optimization based on client capabilities
    const optimizationOptions = {
      compress: acceptEncoding.includes('gzip') || acceptEncoding.includes('br'),
      minify: !userAgent.includes('Development'),
      selectiveFields: this.getSelectiveFields(request),
    };

    if (optimizationOptions.selectiveFields.length > 0) {
      return this.serializationService.serializeWithFields(
        data,
        optimizationOptions.selectiveFields,
      );
    }

    if (optimizationOptions.compress && this.shouldCompress(data)) {
      const compressionResult = this.serializationService.autoCompress(data);

      if (compressionResult.compressed) {
        response.setHeader('X-Compression-Applied', 'true');
        response.setHeader(
          'X-Compression-Ratio',
          compressionResult.stats!.compressionRatio.toFixed(2),
        );
        return compressionResult.data;
      }
    }

    return data;
  }

  private getSelectiveFields(request: Request): string[] {
    const fields = request.query.fields as string;
    return fields ? fields.split(',').map(f => f.trim()) : [];
  }

  private shouldCompress(data: any): boolean {
    const size = Buffer.byteLength(JSON.stringify(data), 'utf8');
    return size > 1024; // Only compress responses larger than 1KB
  }

  private logPerformanceMetrics(request: Request, response: Response, totalTime: number): void {
    const _markers = (request as any).performanceMarkers;

    const metrics = {
      method: request.method,
      url: request.path,
      totalTime,
      statusCode: response.statusCode,
      userAgent: request.headers['user-agent'],
      ip: this.getClientIP(request),
    };

    if (totalTime > 1000) {
      this.logger.warn('Slow request detected', JSON.stringify(metrics));
    } else {
      this.logger.debug('Request performance', JSON.stringify(metrics));
    }
  }

  private calculatePerformanceGrade(responseTime: number): string {
    if (responseTime < 100) return 'A';
    if (responseTime < 300) return 'B';
    if (responseTime < 500) return 'C';
    if (responseTime < 1000) return 'D';
    return 'F';
  }

  private getClientIP(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string) ||
      (request.headers['x-real-ip'] as string) ||
      request.connection.remoteAddress ||
      'unknown'
    )
      .split(',')[0]
      .trim();
  }
}
