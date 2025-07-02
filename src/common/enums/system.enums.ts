export enum SettingCategory {
  GENERAL = 'general',
  SECURITY = 'security',
  EMAIL = 'email',
  NOTIFICATIONS = 'notifications',
  INTEGRATIONS = 'integrations',
  APPEARANCE = 'appearance',
  LEARNING = 'learning',
  ASSESSMENT = 'assessment',
  COMMUNICATION = 'communication',
  ANALYTICS = 'analytics',
  AI = 'ai',
  STORAGE = 'storage',
  PERFORMANCE = 'performance',
  COMPLIANCE = 'compliance',
}

export enum SettingType {
  STRING = 'string',
  TEXT = 'text',
  NUMBER = 'number',
  INTEGER = 'integer',
  BOOLEAN = 'boolean',
  EMAIL = 'email',
  URL = 'url',
  JSON = 'json',
  ARRAY = 'array',
  DATE = 'date',
  TIME = 'time',
  COLOR = 'color',
  FILE = 'file',
}

export enum AuditAction {
  LOGIN = 'login',
  LOGOUT = 'logout',
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  IMPORT = 'import',
  EXPORT = 'export',
  UPLOAD = 'upload',
  DOWNLOAD = 'download',
  APPROVE = 'approve',
  REJECT = 'reject',
  SUSPEND = 'suspend',
  ACTIVATE = 'activate',
  RESET_PASSWORD = 'reset_password',
  CHANGE_PASSWORD = 'change_password',
  GRANT_PERMISSION = 'grant_permission',
  REVOKE_PERMISSION = 'revoke_permission',
  SYSTEM_CONFIG = 'system_config',
  BACKUP = 'backup',
  RESTORE = 'restore',
}

export enum AuditLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export enum AuditStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  ERROR = 'error',
  PENDING = 'pending',
}
