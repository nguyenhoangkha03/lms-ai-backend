import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { PrivacySettingsService } from '../services/privacy-settings.service';

export const AnonymizeResponse = (_fields: string[]) => Reflector.createDecorator<string[]>();

@Injectable()
export class DataAnonymizationInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private privacySettingsService: PrivacySettingsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const fieldsToAnonymize = this.reflector.get(AnonymizeResponse, context.getHandler());

    if (!fieldsToAnonymize || fieldsToAnonymize.length === 0) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const requestingUserId = request.user?.id;

    return next.handle().pipe(
      map(async data => {
        if (await this.canAccessFullData(requestingUserId, data)) {
          return data;
        }

        return this.anonymizeData(data, fieldsToAnonymize);
      }),
    );
  }

  private async canAccessFullData(userId: string, data: any): Promise<boolean> {
    if (data.userId === userId || data.id === userId) {
      return true;
    }
    const dataOwnerId = data.userId || data.id;
    if (dataOwnerId) {
      const privacySettings = await this.privacySettingsService.getPrivacySettings(dataOwnerId);
      return privacySettings.profileVisible && privacySettings.allowSearch;
    }

    return false;
  }

  private anonymizeData(data: any, fieldsToAnonymize: string[]): any {
    if (Array.isArray(data)) {
      return data.map(item => this.anonymizeData(item, fieldsToAnonymize));
    }

    if (typeof data === 'object' && data !== null) {
      const anonymized = { ...data };

      fieldsToAnonymize.forEach(field => {
        if (anonymized[field]) {
          anonymized[field] = this.anonymizeValue(anonymized[field]);
        }
      });

      return anonymized;
    }

    return data;
  }

  private anonymizeValue(value: any): string {
    if (typeof value === 'string') {
      if (value.includes('@')) {
        const [local, domain] = value.split('@');
        return `${local.substring(0, 2)}***@${domain}`;
      } else if (value.length > 4) {
        return `${value.substring(0, 2)}***${value.substring(value.length - 2)}`;
      }
      return '***';
    }
    return '***';
  }
}
