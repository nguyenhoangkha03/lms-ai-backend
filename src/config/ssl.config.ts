import { Logger } from '@nestjs/common';
import { readFileSync } from 'fs';

export class SSLConfig {
  private static readonly logger = new Logger(SSLConfig.name);

  static getHttpsOptions() {
    const isProduction = process.env.NODE_ENV === 'production';
    const sslEnabled = process.env.SSL_ENABLED === 'true';

    if (!isProduction || !sslEnabled) {
      return null;
    }

    try {
      //  Đây là bí mật tuyệt đối của server
      const keyPath = process.env.SSL_KEY_PATH || './ssl/private.key';
      // Đây là căn cước công dân của server bạn, chứa thông tin về server và public key
      const certPath = process.env.SSL_CERT_PATH || './ssl/certificate.crt';
      // bằng chứng rằng cơ quan địa phương đó lại được một cơ quan trung ương uy tín hơn công nhận.
      const caPath = process.env.SSL_CA_PATH; // Optional CA bundle

      const httpsOptions: any = {
        key: readFileSync(keyPath),
        cert: readFileSync(certPath),
      };

      // Add CA bundle if provided
      if (caPath) {
        httpsOptions.ca = readFileSync(caPath);
      }

      this.logger.log('✅ SSL certificates loaded successfully');
      return httpsOptions;
    } catch (error) {
      this.logger.error('❌ Failed to load SSL certificates:', error.message);
      this.logger.warn('⚠️ Starting server without HTTPS');
      return null;
    }
  }

  static generateSelfSignedCert() {
    // This would be used only for development
    // In production, use proper SSL certificates from a CA
    this.logger.warn('⚠️ Using self-signed certificate for development only');
  }
}
