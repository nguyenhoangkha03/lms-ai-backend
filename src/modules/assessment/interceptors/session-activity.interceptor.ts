import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssessmentSession } from '../entities/assessment-session.entity';

@Injectable()
export class SessionActivityInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(AssessmentSession)
    private readonly sessionRepository: Repository<AssessmentSession>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const session = request.assessmentSession;

    return next.handle().pipe(
      tap(async () => {
        if (session) {
          await this.sessionRepository.update(session.id, {
            lastActivityAt: new Date(),
          });
        }
      }),
    );
  }
}
