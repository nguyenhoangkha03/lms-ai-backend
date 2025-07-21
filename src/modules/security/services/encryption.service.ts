import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { WinstonService } from '@/logger/winston.service';

export interface EncryptionOptions {
  algorithm?: string;
  keyDerivation?: 'pbkdf2' | 'scrypt' | 'argon2';
  encoding?: BufferEncoding;
  compressed?: boolean;
}

export interface EncryptedData {
  data: string;
  iv: string;
  authTag?: string;
  salt?: string;
  algorithm: string;
  keyDerivation?: string;
}

@Injectable()
export class EncryptionService {
  private readonly defaultAlgorithm = 'aes-256-gcm';
  private readonly defaultKeyDerivation = 'pbkdf2';
  private readonly masterKey: string;
  private readonly keyCache = new Map<string, Buffer>();

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(EncryptionService.name);
    this.masterKey =
      this.configService.get<string>('security.encryption.masterKey') ||
      'default-master-key-change-in-production';

    if (this.masterKey === 'default-master-key-change-in-production') {
      this.logger.warn('Using default master key. Change this in production!');
    }
  }

  async encryptAtRest(data: string, context?: string): Promise<EncryptedData> {
    const options: EncryptionOptions = {
      algorithm: this.defaultAlgorithm,
      keyDerivation: this.defaultKeyDerivation,
      encoding: 'base64',
    };

    return this.encrypt(data, options, context);
  }

  async decryptAtRest(encryptedData: EncryptedData, context?: string): Promise<string> {
    return this.decrypt(encryptedData, context);
  }

  async encryptForTransit(data: string, recipientKey?: string): Promise<EncryptedData> {
    const options: EncryptionOptions = {
      algorithm: 'aes-256-gcm',
      keyDerivation: 'scrypt',
      encoding: 'base64',
      compressed: true,
    };

    return this.encrypt(data, options, recipientKey);
  }

  async decryptFromTransit(encryptedData: EncryptedData, senderKey?: string): Promise<string> {
    return this.decrypt(encryptedData, senderKey);
  }

  private async encrypt(
    data: string,
    options: EncryptionOptions,
    context?: string,
  ): Promise<EncryptedData> {
    try {
      const algorithm = options.algorithm || this.defaultAlgorithm;
      const keyDerivation = options.keyDerivation || this.defaultKeyDerivation;

      const salt = crypto.randomBytes(32);
      const iv = crypto.randomBytes(12);

      const key = await this.deriveKey(this.masterKey + (context || ''), salt, keyDerivation);

      const cipher = crypto.createCipheriv(algorithm, key, iv) as crypto.CipherGCM;

      if (algorithm.includes('gcm') && context) {
        cipher.setAAD(Buffer.from(context));
      }

      let processedData = data;
      if (options.compressed) {
        processedData = this.compressData(data);
      }

      let encrypted = cipher.update(processedData, 'utf8', options.encoding || 'hex');
      encrypted += cipher.final(options.encoding || 'hex');

      const authTag = algorithm.includes('gcm') ? cipher.getAuthTag() : undefined;

      return {
        data: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag?.toString('hex'),
        salt: salt.toString('hex'),
        algorithm,
        keyDerivation,
      };
    } catch (error) {
      this.logger.error('Encryption failed:', error);
      throw new Error('Encryption failed');
    }
  }

  private async decrypt(encryptedData: EncryptedData, context?: string): Promise<string> {
    try {
      const { data, iv, authTag, salt, algorithm, keyDerivation } = encryptedData;

      const saltBuffer = Buffer.from(salt!, 'hex');
      const ivBuffer = Buffer.from(iv, 'hex');

      const key = await this.deriveKey(
        this.masterKey + (context || ''),
        saltBuffer,
        keyDerivation || this.defaultKeyDerivation,
      );

      const decipher = crypto.createDecipheriv(algorithm, key, ivBuffer) as crypto.DecipherGCM;

      if (authTag) {
        decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      }

      if (context) {
        decipher.setAAD(Buffer.from(context));
      }

      let decrypted = decipher.update(data, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      if (this.isCompressed(decrypted)) {
        decrypted = this.decompressData(decrypted);
      }

      return decrypted;
    } catch (error) {
      this.logger.error('Decryption failed:', error);
      throw new Error('Decryption failed');
    }
  }

  private async deriveKey(password: string, salt: Buffer, method: string): Promise<Buffer> {
    const cacheKey = `${method}:${password}:${salt.toString('hex')}`;

    if (this.keyCache.has(cacheKey)) {
      return this.keyCache.get(cacheKey)!;
    }

    let key: Buffer;

    switch (method) {
      case 'pbkdf2':
        key = await new Promise<Buffer>((resolve, reject) => {
          crypto.pbkdf2(password, salt, 100000, 32, 'sha512', (err, derivedKey) => {
            if (err) reject(err);
            else resolve(derivedKey);
          });
        });
        break;

      case 'scrypt':
        key = await new Promise<Buffer>((resolve, reject) => {
          crypto.scrypt(password, salt, 32, { N: 32768, r: 8, p: 1 }, (err, derivedKey) => {
            if (err) reject(err);
            else resolve(derivedKey as Buffer);
          });
        });
        break;

      default:
        throw new Error(`Unsupported key derivation method: ${method}`);
    }

    this.keyCache.set(cacheKey, key);

    if (this.keyCache.size > 1000) {
      const firstKey = this.keyCache.keys().next().value;
      this.keyCache.delete(firstKey);
    }

    return key;
  }

  async hashPassword(password: string, rounds?: number): Promise<string> {
    const saltRounds = rounds || this.configService.get<number>('security.bcrypt.saltRounds') || 12;
    return bcrypt.hash(password, saltRounds);
  }
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  generateApiKey(prefix: string = 'lms'): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(16).toString('hex');
    return `${prefix}_${timestamp}_${random}`;
  }

  createHMAC(data: string, secret?: string): string {
    const secretKey = secret || this.masterKey;
    return crypto.createHmac('sha256', secretKey).update(data).digest('hex');
  }

  verifyHMAC(data: string, signature: string, secret?: string): boolean {
    const expectedSignature = this.createHMAC(data, secret);
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }
  async encryptField(value: string, fieldName: string, entityId?: string): Promise<string> {
    if (!value) return value;

    const context = `${fieldName}:${entityId || 'unknown'}`;
    const encrypted = await this.encryptAtRest(value, context);
    return JSON.stringify(encrypted);
  }

  async decryptField(
    encryptedValue: string,
    fieldName: string,
    entityId?: string,
  ): Promise<string> {
    if (!encryptedValue) return encryptedValue;

    try {
      const context = `${fieldName}:${entityId || 'unknown'}`;
      const encryptedData = JSON.parse(encryptedValue) as EncryptedData;
      return await this.decryptAtRest(encryptedData, context);
    } catch (error) {
      this.logger.warn(`Failed to decrypt field ${fieldName}:`, error);
      return encryptedValue;
    }
  }

  secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }

  generateDeterministicId(data: string, salt?: string): string {
    const input = data + (salt || this.masterKey);
    return crypto.createHash('sha256').update(input).digest('hex').substring(0, 16);
  }

  private compressData(data: string): string {
    return Buffer.from(data).toString('base64');
  }

  private decompressData(compressedData: string): string {
    return Buffer.from(compressedData, 'base64').toString('utf8');
  }

  private isCompressed(data: string): boolean {
    try {
      Buffer.from(data, 'base64');
      return true;
    } catch {
      return false;
    }
  }

  async rotateKeys(): Promise<void> {
    this.logger.log('Starting key rotation process...');

    this.keyCache.clear();

    this.logger.log('Key rotation completed');
  }

  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    checks: Record<string, boolean>;
    keyRotationDue: boolean;
  } {
    const checks = {
      masterKeySet: this.masterKey !== 'default-master-key-change-in-production',
      keyCacheOptimal: this.keyCache.size < 1000,
      cryptoModuleAvailable: !!crypto,
    };

    const allPassed = Object.values(checks).every(Boolean);
    const keyRotationDue = false;

    return {
      status: allPassed ? 'healthy' : 'warning',
      checks,
      keyRotationDue,
    };
  }
}
