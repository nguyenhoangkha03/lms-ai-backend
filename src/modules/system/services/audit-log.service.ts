import { Injectable } from '@nestjs/common';

@Injectable()
export class AuditLogService {
  constructor() {}

  async log(logData: any): Promise<void> {
    console.log(logData);
  }
}
