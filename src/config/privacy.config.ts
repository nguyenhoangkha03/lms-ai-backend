export default () => ({
  privacy: {
    gdprComplianceMode: process.env.GDPR_COMPLIANCE_MODE === 'true',
    dataRetentionDays: parseInt(process.env.DATA_RETENTION_DAYS!, 10) || 2555,
    privacyOfficerEmail: process.env.PRIVACY_OFFICER_EMAIL,
    dpoContact: process.env.DPO_CONTACT,

    export: {
      maxFileSize: parseInt(process.env.EXPORT_MAX_FILE_SIZE!, 10) || 104857600, // 100MB
      encryptionKey: process.env.EXPORT_ENCRYPTION_KEY,
      downloadExpiryHours: parseInt(process.env.EXPORT_DOWNLOAD_EXPIRY_HOURS!, 10) || 24,
    },

    anonymization: {
      salt: process.env.ANONYMIZATION_SALT,
      reversible: process.env.REVERSIBLE_ANONYMIZATION === 'true',
    },

    audit: {
      retentionYears: parseInt(process.env.AUDIT_LOG_RETENTION_YEARS!, 10) || 7,
      complianceAlertThreshold: parseFloat(process.env.COMPLIANCE_ALERT_THRESHOLD!) || 0.95,
    },
  },
});
