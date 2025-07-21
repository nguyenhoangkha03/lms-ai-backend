export default () => ({
  security: {
    // Encryption settings
    encryption: {
      masterKey: process.env.ENCRYPTION_MASTER_KEY || 'default-master-key-change-in-production',
      algorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm',
      keyDerivation: process.env.KEY_DERIVATION_METHOD || 'pbkdf2',
      keyRotationInterval: parseInt(process.env.KEY_ROTATION_INTERVAL || '2592000000'), // 30 days
    },

    // Input validation settings
    validation: {
      enabled: process.env.INPUT_VALIDATION_ENABLED !== 'false',
      strictMode: process.env.VALIDATION_STRICT_MODE === 'true',
      maxInputLength: parseInt(process.env.MAX_INPUT_LENGTH || '10000'),
      sanitizeHtml: process.env.SANITIZE_HTML !== 'false',
      logThreats: process.env.LOG_VALIDATION_THREATS !== 'false',
    },

    // API Security settings
    apiSecurity: {
      requireApiKey: process.env.REQUIRE_API_KEY === 'true',
      signatureValidation: process.env.SIGNATURE_VALIDATION === 'true',
      csrfProtection: process.env.CSRF_PROTECTION !== 'false',
      rateLimitingEnabled: process.env.API_RATE_LIMITING !== 'false',
      ipWhitelisting: process.env.IP_WHITELISTING === 'true',
    },

    // Security headers
    headers: {
      hsts: {
        enabled: process.env.HSTS_ENABLED !== 'false',
        maxAge: parseInt(process.env.HSTS_MAX_AGE || '31536000'),
        includeSubDomains: process.env.HSTS_INCLUDE_SUBDOMAINS !== 'false',
        preload: process.env.HSTS_PRELOAD === 'true',
      },
      csp: {
        enabled: process.env.CSP_ENABLED !== 'false',
        reportOnly: process.env.CSP_REPORT_ONLY === 'true',
        reportUri: process.env.CSP_REPORT_URI || '/api/v1/security/csp-report',
      },
    },

    // Audit settings
    audit: {
      enabled: process.env.SECURITY_AUDIT_ENABLED !== 'false',
      retentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS || '90'),
      realTimeAlerts: process.env.REAL_TIME_ALERTS === 'true',
      alertThresholds: {
        criticalEvents: parseInt(process.env.CRITICAL_EVENT_THRESHOLD || '5'),
        suspiciousIp: parseInt(process.env.SUSPICIOUS_IP_THRESHOLD || '10'),
        failedLogins: parseInt(process.env.FAILED_LOGIN_THRESHOLD || '5'),
      },
    },

    // File upload security
    fileUpload: {
      virusScanning: process.env.VIRUS_SCANNING_ENABLED === 'true',
      allowedMimeTypes: (
        process.env.ALLOWED_MIME_TYPES || 'image/jpeg,image/png,application/pdf'
      ).split(','),
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
      quarantineDirectory: process.env.QUARANTINE_DIR || './quarantine',
    },
  },
});
