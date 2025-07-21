import { Injectable } from '@nestjs/common';
import { WinstonService } from '@/logger/winston.service';
import * as validator from 'validator';
import * as DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const purify = DOMPurify(window as any);

export interface ValidationResult {
  isValid: boolean;
  sanitizedValue?: any;
  errors: string[];
  threats: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface ValidationRule {
  type: 'string' | 'number' | 'email' | 'url' | 'phone' | 'date' | 'json' | 'html' | 'sql' | 'file';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  allowedValues?: any[];
  customValidator?: (value: any) => boolean;
  sanitize?: boolean;
  encoding?: string;
}

@Injectable()
export class InputValidationService {
  private readonly sqlInjectionPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/gi,
    /(;|\|\||&&|\|)/g,
    /('|('')|`|--|#|\*|\+|\?|\[|\]|\(|\)|\{|\}|\^|\$|\\|\.|\/)/g,
    /(exec\s*\(|sp_|xp_)/gi,
    /(script|javascript|vbscript|onload|onerror|onclick)/gi,
  ];

  private readonly xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*>/gi,
    /<link\b[^<]*>/gi,
    /<meta\b[^<]*>/gi,
    /on\w+\s*=/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /data:text\/html/gi,
  ];

  private readonly pathTraversalPatterns = [
    /\.\.\//g,
    /\.\.\\+/g,
    /%2e%2e%2f/gi,
    /%2e%2e%5c/gi,
    /\.\.\%2f/gi,
    /\.\.\%5c/gi,
  ];

  private readonly commandInjectionPatterns = [
    /(\||;|&|`|\$\(|\${)/g,
    /(nc|netcat|curl|wget|python|perl|ruby|php|bash|sh|cmd|powershell)/gi,
    /(chmod|chown|rm|mv|cp|cat|tail|head|grep|awk|sed)/gi,
  ];

  constructor(private readonly logger: WinstonService) {
    this.logger.setContext(InputValidationService.name);
  }

  validateInput(value: any, rules: ValidationRule, fieldName?: string): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      sanitizedValue: value,
      errors: [],
      threats: [],
      riskLevel: 'low',
    };

    try {
      if (rules.required && (value === null || value === undefined || value === '')) {
        result.isValid = false;
        result.errors.push(`${fieldName || 'Field'} is required`);
        return result;
      }

      if (!rules.required && (value === null || value === undefined)) {
        return result;
      }
      const stringValue = String(value);
      result.isValid = this.validateByType(stringValue, rules, result);

      this.detectThreats(stringValue, result, fieldName);

      if (rules.sanitize !== false && result.isValid) {
        result.sanitizedValue = this.sanitizeInput(value, rules.type);
      }

      result.riskLevel = this.calculateRiskLevel(result.threats);

      return result;
    } catch (error) {
      this.logger.error(`Validation error for field ${fieldName}:`, error);
      result.isValid = false;
      result.errors.push('Validation failed due to internal error');
      result.riskLevel = 'critical';
      return result;
    }
  }

  validateBatch(
    inputs: Record<string, any>,
    rules: Record<string, ValidationRule>,
  ): {
    isValid: boolean;
    results: Record<string, ValidationResult>;
    overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
    threatSummary: string[];
  } {
    const results: Record<string, ValidationResult> = {};
    let overallValid = true;
    const allThreats: string[] = [];

    for (const [fieldName, value] of Object.entries(inputs)) {
      const fieldRules = rules[fieldName];
      if (fieldRules) {
        const result = this.validateInput(value, fieldRules, fieldName);
        results[fieldName] = result;

        if (!result.isValid) {
          overallValid = false;
        }

        allThreats.push(...result.threats);
      }
    }

    return {
      isValid: overallValid,
      results,
      overallRiskLevel: this.calculateRiskLevel(allThreats),
      threatSummary: Array.from(new Set(allThreats)),
    };
  }

  detectSqlInjection(input: string): { detected: boolean; patterns: string[] } {
    const detectedPatterns: string[] = [];

    for (const pattern of this.sqlInjectionPatterns) {
      if (pattern.test(input)) {
        detectedPatterns.push(pattern.source);
      }
    }

    return {
      detected: detectedPatterns.length > 0,
      patterns: detectedPatterns,
    };
  }

  detectXss(input: string): { detected: boolean; patterns: string[] } {
    const detectedPatterns: string[] = [];

    for (const pattern of this.xssPatterns) {
      if (pattern.test(input)) {
        detectedPatterns.push(pattern.source);
      }
    }

    const decoded = this.decodeInput(input);
    if (decoded !== input) {
      for (const pattern of this.xssPatterns) {
        if (pattern.test(decoded)) {
          detectedPatterns.push(`encoded:${pattern.source}`);
        }
      }
    }

    return {
      detected: detectedPatterns.length > 0,
      patterns: detectedPatterns,
    };
  }

  detectPathTraversal(input: string): { detected: boolean; patterns: string[] } {
    const detectedPatterns: string[] = [];

    for (const pattern of this.pathTraversalPatterns) {
      if (pattern.test(input)) {
        detectedPatterns.push(pattern.source);
      }
    }

    return {
      detected: detectedPatterns.length > 0,
      patterns: detectedPatterns,
    };
  }

  detectCommandInjection(input: string): { detected: boolean; patterns: string[] } {
    const detectedPatterns: string[] = [];

    for (const pattern of this.commandInjectionPatterns) {
      if (pattern.test(input)) {
        detectedPatterns.push(pattern.source);
      }
    }

    return {
      detected: detectedPatterns.length > 0,
      patterns: detectedPatterns,
    };
  }

  sanitizeInput(value: any, type: string): any {
    if (value === null || value === undefined) return value;

    const stringValue = String(value);

    switch (type) {
      case 'html':
        return this.sanitizeHtml(stringValue);

      case 'string':
        return this.sanitizeString(stringValue);

      case 'email':
        return validator.normalizeEmail(stringValue) || stringValue;

      case 'url':
        return this.sanitizeUrl(stringValue);

      case 'number':
        return this.sanitizeNumber(stringValue);

      case 'json':
        return this.sanitizeJson(stringValue);

      case 'file':
        return this.sanitizeFilename(stringValue);

      default:
        return this.sanitizeString(stringValue);
    }
  }

  private sanitizeHtml(html: string): string {
    return purify.sanitize(html, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'a'],
      ALLOWED_ATTR: ['href', 'target'],
      ALLOW_DATA_ATTR: false,
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
    });
  }

  private sanitizeString(input: string): string {
    return input
      .replace(/[<>'"]/g, '')
      .replace(/\0/g, '')
      .replace(/\r\n|\r|\n/g, ' ')
      .trim();
  }

  private sanitizeUrl(url: string): string {
    try {
      const parsed = new URL(url);

      const allowedProtocols = ['http:', 'https:', 'mailto:'];
      if (!allowedProtocols.includes(parsed.protocol)) {
        return '';
      }

      return parsed.toString();
    } catch {
      return '';
    }
  }

  private sanitizeNumber(input: string): number | null {
    const cleaned = input.replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  private sanitizeJson(input: string): any {
    try {
      const parsed = JSON.parse(input);

      return this.sanitizeObject(parsed);
    } catch {
      return null;
    }
  }

  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '')
      .replace(/^\.+/, '')
      .substring(0, 255);
  }

  private sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = this.sanitizeString(key);
        sanitized[sanitizedKey] = this.sanitizeObject(value);
      }
      return sanitized;
    }

    return obj;
  }

  private validateByType(value: string, rules: ValidationRule, result: ValidationResult): boolean {
    let isValid = true;

    if (rules.minLength !== undefined && value.length < rules.minLength) {
      result.errors.push(`Minimum length is ${rules.minLength}`);
      isValid = false;
    }

    if (rules.maxLength !== undefined && value.length > rules.maxLength) {
      result.errors.push(`Maximum length is ${rules.maxLength}`);
      isValid = false;
    }

    if (rules.pattern && !rules.pattern.test(value)) {
      result.errors.push('Invalid format');
      isValid = false;
    }
    if (rules.allowedValues && !rules.allowedValues.includes(value)) {
      result.errors.push('Value not in allowed list');
      isValid = false;
    }

    switch (rules.type) {
      case 'email':
        if (!validator.isEmail(value)) {
          result.errors.push('Invalid email format');
          isValid = false;
        }
        break;

      case 'url':
        if (!validator.isURL(value)) {
          result.errors.push('Invalid URL format');
          isValid = false;
        }
        break;

      case 'phone':
        if (!validator.isMobilePhone(value)) {
          result.errors.push('Invalid phone number');
          isValid = false;
        }
        break;

      case 'date':
        if (!validator.isISO8601(value)) {
          result.errors.push('Invalid date format');
          isValid = false;
        }
        break;

      case 'number':
        if (!validator.isNumeric(value)) {
          result.errors.push('Must be a number');
          isValid = false;
        }
        break;

      case 'json':
        try {
          JSON.parse(value);
        } catch {
          result.errors.push('Invalid JSON format');
          isValid = false;
        }
        break;
    }

    if (rules.customValidator && !rules.customValidator(value)) {
      result.errors.push('Custom validation failed');
      isValid = false;
    }

    return isValid;
  }

  private detectThreats(value: string, result: ValidationResult, fieldName?: string): void {
    const threats: string[] = [];

    const sqlCheck = this.detectSqlInjection(value);
    if (sqlCheck.detected) {
      threats.push('SQL injection attempt detected');
    }
    const xssCheck = this.detectXss(value);
    if (xssCheck.detected) {
      threats.push('Cross-site scripting (XSS) attempt detected');
    }

    const pathCheck = this.detectPathTraversal(value);
    if (pathCheck.detected) {
      threats.push('Path traversal attempt detected');
    }
    const cmdCheck = this.detectCommandInjection(value);
    if (cmdCheck.detected) {
      threats.push('Command injection attempt detected');
    }

    if (threats.length > 0) {
      this.logger.warn(`Security threats detected in field ${fieldName || 'unknown'}:, {
        field: ${fieldName},
        value: ${value.substring(0, 100)},
        threats: ${threats},
      }`);
    }

    result.threats = threats;
  }

  private calculateRiskLevel(threats: string[]): 'low' | 'medium' | 'high' | 'critical' {
    if (threats.length === 0) return 'low';
    if (threats.length === 1) return 'medium';
    if (threats.length === 2) return 'high';
    return 'critical';
  }

  private decodeInput(input: string): string {
    try {
      let decoded = decodeURIComponent(input);

      decoded = decoded
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&#x2F;/g, '/');

      return decoded;
    } catch {
      return input;
    }
  }

  validateFileUpload(file: {
    originalname: string;
    mimetype: string;
    size: number;
    buffer?: Buffer;
  }): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      sanitizedValue: file,
      errors: [],
      threats: [],
      riskLevel: 'low',
    };

    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.txt'];
    const fileExtension = file.originalname
      .toLowerCase()
      .substring(file.originalname.lastIndexOf('.'));

    if (!allowedExtensions.includes(fileExtension)) {
      result.errors.push('File type not allowed');
      result.threats.push('Potentially malicious file type');
      result.isValid = false;
    }

    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      result.errors.push('MIME type not allowed');
      result.threats.push('MIME type mismatch detected');
      result.isValid = false;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      result.errors.push('File size exceeds limit');
      result.isValid = false;
    }

    const filenameResult = this.validateInput(file.originalname, {
      type: 'file',
      maxLength: 255,
      pattern: /^[a-zA-Z0-9._-]+$/,
    });

    if (!filenameResult.isValid) {
      result.errors.push(...filenameResult.errors);
      result.threats.push(...filenameResult.threats);
      result.isValid = false;
    }

    if (file.buffer && !this.validateMagicNumbers(file.buffer, file.mimetype)) {
      result.errors.push('File content does not match declared type');
      result.threats.push('File content spoofing detected');
      result.isValid = false;
    }

    result.riskLevel = this.calculateRiskLevel(result.threats);
    return result;
  }

  private validateMagicNumbers(buffer: Buffer, mimetype: string): boolean {
    const magicNumbers: Record<string, number[][]> = {
      'image/jpeg': [[0xff, 0xd8, 0xff]],
      'image/png': [[0x89, 0x50, 0x4e, 0x47]],
      'image/gif': [[0x47, 0x49, 0x46, 0x38]],
      'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
    };

    const expectedMagic = magicNumbers[mimetype];
    if (!expectedMagic) return true;

    return expectedMagic.some(magic => {
      if (buffer.length < magic.length) return false;
      return magic.every((byte, index) => buffer[index] === byte);
    });
  }

  getValidationStats(): {
    totalValidations: number;
    threatsDetected: number;
    commonThreats: string[];
    riskDistribution: Record<string, number>;
  } {
    return {
      totalValidations: 0,
      threatsDetected: 0,
      commonThreats: ['XSS attempts', 'SQL injection', 'Path traversal'],
      riskDistribution: { low: 0, medium: 0, high: 0, critical: 0 },
    };
  }
}
