import { Injectable, LoggerService, Scope } from '@nestjs/common';
import { Logger as WinstonLogger } from 'winston';

@Injectable({ scope: Scope.TRANSIENT })
export class WinstonLoggerService implements LoggerService {
  private context?: string;

  constructor(private readonly winstonLogger: WinstonLogger) {}

  setContext(context: string) {
    this.context = context;
  }

  log(message: any, context?: string) {
    const ctx = context || this.context || 'Application';

    if (typeof message === 'object') {
      this.winstonLogger.info(JSON.stringify(message), { context: ctx });
    } else {
      this.winstonLogger.info(message, { context: ctx });
    }
  }

  error(message: any, trace?: string, context?: string) {
    const ctx = context || this.context || 'Application';

    if (typeof message === 'object') {
      this.winstonLogger.error(JSON.stringify(message), {
        context: ctx,
        trace: trace || message.stack,
      });
    } else {
      this.winstonLogger.error(message, { context: ctx, trace });
    }
  }

  warn(message: any, context?: string) {
    const ctx = context || this.context || 'Application';

    if (typeof message === 'object') {
      this.winstonLogger.warn(JSON.stringify(message), { context: ctx });
    } else {
      this.winstonLogger.warn(message, { context: ctx });
    }
  }

  debug(message: any, context?: string) {
    const ctx = context || this.context || 'Application';

    if (typeof message === 'object') {
      this.winstonLogger.debug(JSON.stringify(message), { context: ctx });
    } else {
      this.winstonLogger.debug(message, { context: ctx });
    }
  }

  verbose(message: any, context?: string) {
    const ctx = context || this.context || 'Application';

    if (typeof message === 'object') {
      this.winstonLogger.verbose(JSON.stringify(message), { context: ctx });
    } else {
      this.winstonLogger.verbose(message, { context: ctx });
    }
  }
}
