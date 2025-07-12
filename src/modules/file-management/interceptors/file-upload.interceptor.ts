import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { WinstonService } from '@/logger/winston.service';

@Injectable()
export class FileUploadInterceptor implements NestInterceptor {
  constructor(private readonly logger: WinstonService) {
    this.logger.setContext(FileUploadInterceptor.name);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Log upload attempt
    const file = request.file || request.files?.[0];
    if (file) {
      this.logger.log(
        `File upload attempt: ${file.originalname} (${file.size} bytes) by user ${user?.id}`,
      );
    }

    return next.handle().pipe(
      tap(response => {
        // Log successful upload
        if (response && response.id) {
          this.logger.log(`File upload successful: ${response.id}`);
        }
      }),
      catchError(error => {
        // Log upload failure
        this.logger.error(`File upload failed: ${error.message}`, error.stack);

        // Transform multer errors
        if (error.code === 'LIMIT_FILE_SIZE') {
          throw new BadRequestException('File size exceeds maximum allowed size');
        } else if (error.code === 'LIMIT_FILE_COUNT') {
          throw new BadRequestException('Too many files in upload');
        } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
          throw new BadRequestException('Unexpected file field');
        }

        throw error;
      }),
    );
  }
}
