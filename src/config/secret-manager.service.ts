import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';

@Injectable()
export class SecretManagerService {
  private readonly logger = new Logger(SecretManagerService.name);
  private secretsManager: AWS.SecretsManager;

  constructor(private configService: ConfigService) {
    if (this.configService.get('NODE_ENV') === 'production') {
      this.secretsManager = new AWS.SecretsManager({
        region: this.configService.get('AWS_REGION', 'us-east-1'),
      });
    }
  }

  async getSecret(secretName: string): Promise<string | null | undefined> {
    if (this.configService.get('NODE_ENV') !== 'production') {
      return this.configService.get(secretName);
    }

    try {
      const result = await this.secretsManager.getSecretValue({ SecretId: secretName }).promise();

      if (result.SecretString) {
        const secret = JSON.parse(result.SecretString);
        return secret[secretName] || secret.value || result.SecretString;
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to retrieve secret ${secretName}:`, error.message);
      return null;
    }
  }

  async setSecret(secretName: string, secretValue: string): Promise<boolean> {
    if (this.configService.get('NODE_ENV') !== 'production') {
      this.logger.warn('Secret setting is only available in production');
      return false;
    }

    try {
      await this.secretsManager
        .updateSecret({
          SecretId: secretName,
          SecretString: JSON.stringify({ [secretName]: secretValue }),
        })
        .promise();

      this.logger.log(`Secret ${secretName} updated successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to set secret ${secretName}:`, error.message);
      return false;
    }
  }

  async rotateSecret(secretName: string): Promise<boolean> {
    try {
      await this.secretsManager
        .rotateSecret({
          SecretId: secretName,
        })
        .promise();

      this.logger.log(`Secret rotation initiated for ${secretName}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to rotate secret ${secretName}:`, error.message);
      return false;
    }
  }
}
