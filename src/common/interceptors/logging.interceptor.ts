import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, body, query, params } = req;
    const userAgent = req.get('User-Agent') || '';
    const ip = req.ip;

    const now = Date.now();

    this.logger.log(`Incoming Request: ${method} ${url} - ${userAgent} ${ip}`, 'HttpRequest');

    if (process.env.NODE_ENV === 'development') {
      // Skip logging body for file uploads (multipart/form-data)
      const contentType = req.headers['content-type'] || '';
      if (contentType.includes('multipart/form-data')) {
        this.logger.debug(`Request Body: [File Upload - Multipart Data]`, 'HttpRequest');
      } else {
        try {
          this.logger.debug(`Request Body: ${JSON.stringify(body)}`, 'HttpRequest');
        } catch (err) {
          this.logger.debug(`Request Body: [Unable to stringify - ${err.message}]`, 'HttpRequest');
        }
      }
      this.logger.debug(`Request Query: ${JSON.stringify(query)}`, 'HttpRequest');
      this.logger.debug(`Request Params: ${JSON.stringify(params)}`, 'HttpRequest');
    }

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - now;
        this.logger.log(`Response: ${method} ${url} - ${responseTime}ms`, 'HttpResponse');
      }),
    );
  }
}
