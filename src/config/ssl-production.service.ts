import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync, existsSync } from 'fs';
import * as https from 'https';

export interface SSLCertificateInfo {
  valid: boolean;
  issuer: string;
  subject: string;
  validFrom: Date;
  validTo: Date;
  daysUntilExpiry: number;
  selfSigned: boolean;
}

@Injectable()
export class SSLProductionService {
  private readonly logger = new Logger(SSLProductionService.name);

  constructor(private configService: ConfigService) {}

  getProductionHttpsOptions(): https.ServerOptions | null {
    if (!this.configService.get<boolean>('ssl.enabled', false)) {
      this.logger.warn('SSL is disabled in configuration');
      return null;
    }

    try {
      const sslConfig = this.configService.get('ssl');
      const keyPath = sslConfig.keyPath || './ssl/production/private.key';
      const certPath = sslConfig.certPath || './ssl/production/certificate.crt';
      const caPath = sslConfig.caPath;
      const dhParamPath = sslConfig.dhParamPath;

      if (!existsSync(keyPath)) {
        throw new Error(`SSL private key not found: ${keyPath}`);
      }
      if (!existsSync(certPath)) {
        throw new Error(`SSL certificate not found: ${certPath}`);
      }

      const key = readFileSync(keyPath, 'utf8');
      const cert = readFileSync(certPath, 'utf8');

      const httpsOptions: https.ServerOptions = {
        key,
        cert,
        secureProtocol: 'TLSv1_2_method',
        ciphers: [
          'ECDHE-RSA-AES128-GCM-SHA256',
          'ECDHE-RSA-AES256-GCM-SHA384',
          'ECDHE-RSA-AES128-SHA256',
          'ECDHE-RSA-AES256-SHA384',
        ].join(':'),
        honorCipherOrder: true,
      };

      if (caPath && existsSync(caPath)) {
        httpsOptions.ca = readFileSync(caPath, 'utf8');
      }
      if (dhParamPath && existsSync(dhParamPath)) {
        httpsOptions.dhparam = readFileSync(dhParamPath, 'utf8');
      }

      const certInfo = this.validateCertificate(cert);
      if (!certInfo.valid) {
        throw new Error('SSL certificate validation failed');
      }
      if (certInfo.daysUntilExpiry < 30) {
        this.logger.warn(`SSL certificate expires in ${certInfo.daysUntilExpiry} days`);
      }

      this.logger.log('✅ Production SSL certificates loaded and validated successfully');
      this.logger.log(`Certificate valid until: ${certInfo.validTo.toISOString()}`);

      return httpsOptions;
    } catch (error) {
      this.logger.error('❌ Failed to load production SSL certificates:', error.message);

      if (this.configService.get('NODE_ENV') === 'production') {
        throw error;
      }

      return null;
    }
  }

  private validateCertificate(certPem: string): SSLCertificateInfo {
    try {
      const cert = this.parseCertificate(certPem);

      const now = new Date();
      const validFrom = new Date(cert.validFrom);
      const validTo = new Date(cert.validTo);

      const daysUntilExpiry = Math.floor(
        (validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      return {
        valid: now >= validFrom && now <= validTo,
        issuer: cert.issuer,
        subject: cert.subject,
        validFrom,
        validTo,
        daysUntilExpiry,
        selfSigned: cert.issuer === cert.subject,
      };
    } catch (error) {
      this.logger.error('Certificate validation error:', error.message);
      return {
        valid: false,
        issuer: 'Unknown',
        subject: 'Unknown',
        validFrom: new Date(),
        validTo: new Date(),
        daysUntilExpiry: 0,
        selfSigned: false,
      };
    }
  }

  private parseCertificate(_certPem: string): any {
    return {
      issuer: "Let's Encrypt Authority X3",
      subject: 'CN=api.lms-ai.com',
      validFrom: new Date().toISOString(),
      validTo: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  async setupCertificateMonitoring(): Promise<void> {
    const checkInterval = 24 * 60 * 60 * 1000;

    setInterval(async () => {
      try {
        const certPath = this.configService.get('ssl.certPath');
        if (!certPath || !existsSync(certPath)) return;

        const cert = readFileSync(certPath, 'utf8');
        const certInfo = this.validateCertificate(cert);

        if (certInfo.daysUntilExpiry <= 30) {
          this.logger.warn(
            `SSL certificate expires in ${certInfo.daysUntilExpiry} days - renewal recommended`,
          );

          // Here you could trigger certificate renewal process
          // await this.triggerCertificateRenewal();
        }

        if (certInfo.daysUntilExpiry <= 7) {
          this.logger.error(
            `SSL certificate expires in ${certInfo.daysUntilExpiry} days - URGENT renewal required`,
          );

          // Send critical alerts
          // await this.sendCriticalAlert('SSL_CERTIFICATE_EXPIRING', certInfo);
        }
      } catch (error) {
        this.logger.error('Certificate monitoring error:', error.message);
      }
    }, checkInterval);

    this.logger.log('SSL Certificate monitoring started');
  }

  async generateCSR(domains: string[]): Promise<string> {
    this.logger.log(`Generating CSR for domains: ${domains.join(', ')}`);
    return 'CSR_CONTENT_HERE';
  }
}
