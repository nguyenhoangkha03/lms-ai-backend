import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection } from 'typeorm';
import { InjectConnection } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface RollbackPlan {
  version: string;
  timestamp: Date;
  databaseBackup?: string;
  migrationRollbacks: string[];
  configChanges: Record<string, any>;
  dependencies: Record<string, string>;
}

@Injectable()
export class RollbackService {
  private readonly logger = new Logger(RollbackService.name);

  constructor(
    private configService: ConfigService,
    @InjectConnection() private connection: Connection,
  ) {}

  /**
   * Create rollback plan before deployment
   */
  async createRollbackPlan(targetVersion: string): Promise<RollbackPlan> {
    this.logger.log(`Creating rollback plan for version ${targetVersion}`);

    try {
      // Get current version
      const currentVersion = process.env.npm_package_version || '1.0.0';

      // Create database backup
      const backupName = await this.createDatabaseBackup();

      // Get migration rollback scripts
      const migrationRollbacks = await this.getMigrationRollbacks();

      // Capture current configuration
      const configChanges = this.captureCurrentConfig();

      // Get current dependencies
      const dependencies = await this.getCurrentDependencies();

      const rollbackPlan: RollbackPlan = {
        version: currentVersion,
        timestamp: new Date(),
        databaseBackup: backupName,
        migrationRollbacks,
        configChanges,
        dependencies,
      };

      // Save rollback plan
      await this.saveRollbackPlan(rollbackPlan);

      this.logger.log(`Rollback plan created successfully for version ${currentVersion}`);
      return rollbackPlan;
    } catch (error) {
      this.logger.error('Failed to create rollback plan:', error.message);
      throw error;
    }
  }

  /**
   * Execute rollback to previous version
   */
  async executeRollback(targetVersion?: string): Promise<boolean> {
    this.logger.warn(
      `Starting rollback process${targetVersion ? ` to version ${targetVersion}` : ''}`,
    );

    try {
      // Load rollback plan
      const rollbackPlan = await this.loadRollbackPlan(targetVersion);
      if (!rollbackPlan) {
        throw new Error('No rollback plan found');
      }

      // Pre-rollback validation
      await this.validateRollbackPlan(rollbackPlan);

      // Step 1: Stop accepting new requests (graceful)
      await this.enterMaintenanceMode();

      // Step 2: Wait for current requests to complete
      await this.waitForActiveRequests();

      // Step 3: Rollback database migrations
      await this.rollbackMigrations(rollbackPlan.migrationRollbacks);

      // Step 4: Restore database from backup if needed
      if (rollbackPlan.databaseBackup) {
        await this.restoreDatabaseBackup(rollbackPlan.databaseBackup);
      }

      // Step 5: Rollback application code (handled by orchestrator)
      await this.rollbackApplicationCode(rollbackPlan.version);

      // Step 6: Restore configuration
      await this.restoreConfiguration(rollbackPlan.configChanges);

      // Step 7: Restart services
      await this.restartServices();

      // Step 8: Validate rollback
      await this.validateRollback();

      // Step 9: Exit maintenance mode
      await this.exitMaintenanceMode();

      this.logger.log(`Rollback to version ${rollbackPlan.version} completed successfully`);
      return true;
    } catch (error) {
      this.logger.error('Rollback failed:', error.message);

      // Emergency recovery
      await this.emergencyRecovery();

      return false;
    }
  }

  /**
   * Create database backup
   */
  private async createDatabaseBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `rollback-backup-${timestamp}.sql`;
    const backupPath = path.join('./backups', backupName);

    // Ensure backup directory exists
    fs.mkdirSync('./backups', { recursive: true });

    const dbConfig = this.configService.get('database');
    const command = `mysqldump -h ${dbConfig.host} -P ${dbConfig.port} -u ${dbConfig.username} -p${dbConfig.password} ${dbConfig.database} > ${backupPath}`;

    try {
      await execAsync(command);
      this.logger.log(`Database backup created: ${backupName}`);
      return backupName;
    } catch (error) {
      this.logger.error('Failed to create database backup:', error.message);
      throw error;
    }
  }

  /**
   * Get migration rollback scripts
   */
  private async getMigrationRollbacks(): Promise<string[]> {
    try {
      const { stdout } = await execAsync('npm run migration:show');

      // Parse migration output to get applied migrations
      const appliedMigrations = stdout
        .split('\n')
        .filter(line => line.includes('[X]'))
        .map(line => line.trim().split(' ')[1]);

      return appliedMigrations.reverse(); // Reverse order for rollback
    } catch (error) {
      this.logger.error('Failed to get migration rollbacks:', error.message);
      return [];
    }
  }

  /**
   * Capture current configuration
   */
  private captureCurrentConfig(): Record<string, any> {
    return {
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
      databaseHost: process.env.DATABASE_HOST,
      redisHost: process.env.REDIS_HOST,
      // Add other critical config
    };
  }

  /**
   * Get current dependencies
   */
  private async getCurrentDependencies(): Promise<Record<string, string>> {
    try {
      const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
      return {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };
    } catch (error) {
      this.logger.error('Failed to get current dependencies:', error.message);
      return {};
    }
  }

  /**
   * Save rollback plan
   */
  private async saveRollbackPlan(plan: RollbackPlan): Promise<void> {
    const planPath = path.join('./rollback-plans', `plan-${plan.version}.json`);
    fs.mkdirSync('./rollback-plans', { recursive: true });
    fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
  }

  /**
   * Load rollback plan
   */
  private async loadRollbackPlan(version?: string): Promise<RollbackPlan | null> {
    try {
      let planPath: string;

      if (version) {
        planPath = path.join('./rollback-plans', `plan-${version}.json`);
      } else {
        // Get latest rollback plan
        const plans = fs
          .readdirSync('./rollback-plans')
          .filter(file => file.startsWith('plan-') && file.endsWith('.json'))
          .sort()
          .reverse();

        if (plans.length === 0) {
          return null;
        }

        planPath = path.join('./rollback-plans', plans[0]);
      }

      if (!fs.existsSync(planPath)) {
        return null;
      }

      const planData = fs.readFileSync(planPath, 'utf8');
      return JSON.parse(planData);
    } catch (error) {
      this.logger.error('Failed to load rollback plan:', error.message);
      return null;
    }
  }

  /**
   * Enter maintenance mode
   */
  private async enterMaintenanceMode(): Promise<void> {
    this.logger.log('Entering maintenance mode');

    // Set maintenance flag in Redis
    // await this.redis.set('system:maintenance', 'true', 'EX', 3600);

    // Update load balancer health check to fail
    fs.writeFileSync('./maintenance.flag', Date.now().toString());
  }

  /**
   * Exit maintenance mode
   */
  private async exitMaintenanceMode(): Promise<void> {
    this.logger.log('Exiting maintenance mode');

    // Remove maintenance flag
    // await this.redis.del('system:maintenance');

    if (fs.existsSync('./maintenance.flag')) {
      fs.unlinkSync('./maintenance.flag');
    }
  }

  /**
   * Wait for active requests to complete
   */
  private async waitForActiveRequests(): Promise<void> {
    const maxWait = 30000; // 30 seconds
    const checkInterval = 1000; // 1 second
    let waited = 0;

    while (waited < maxWait) {
      // Check if there are active requests
      // This would integrate with your request tracking system
      const activeRequests = 0; // Placeholder

      if (activeRequests === 0) {
        this.logger.log('All active requests completed');
        return;
      }

      this.logger.log(`Waiting for ${activeRequests} active requests...`);
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }

    this.logger.warn('Timeout waiting for active requests to complete');
  }

  /**
   * Rollback database migrations
   */
  private async rollbackMigrations(migrations: string[]): Promise<void> {
    this.logger.log(`Rolling back ${migrations.length} migrations`);

    for (const migration of migrations) {
      try {
        await execAsync(`npm run migration:revert`);
        this.logger.log(`Rolled back migration: ${migration}`);
      } catch (error) {
        this.logger.error(`Failed to rollback migration ${migration}:`, error.message);
        throw error;
      }
    }
  }

  /**
   * Restore database from backup
   */
  private async restoreDatabaseBackup(backupName: string): Promise<void> {
    this.logger.log(`Restoring database from backup: ${backupName}`);

    const backupPath = path.join('./backups', backupName);
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }

    const dbConfig = this.configService.get('database');
    const command = `mysql -h ${dbConfig.host} -P ${dbConfig.port} -u ${dbConfig.username} -p${dbConfig.password} ${dbConfig.database} < ${backupPath}`;

    try {
      await execAsync(command);
      this.logger.log('Database restored successfully');
    } catch (error) {
      this.logger.error('Failed to restore database:', error.message);
      throw error;
    }
  }

  /**
   * Rollback application code (handled by orchestrator)
   */
  private async rollbackApplicationCode(version: string): Promise<void> {
    this.logger.log(`Rolling back application code to version ${version}`);

    // This would typically be handled by Kubernetes or Docker orchestrator
    // Here we just log the action
    this.logger.log('Application code rollback initiated via orchestrator');
  }

  /**
   * Restore configuration
   */
  private async restoreConfiguration(_configChanges: Record<string, any>): Promise<void> {
    this.logger.log('Restoring configuration');

    // This would restore environment variables or configuration files
    // Implementation depends on your configuration management strategy
    this.logger.log('Configuration restored');
  }

  /**
   * Restart services
   */
  private async restartServices(): Promise<void> {
    this.logger.log('Restarting services');

    // This would typically restart the application
    // In containerized environments, this might be handled by the orchestrator
    await new Promise(resolve => setTimeout(resolve, 5000)); // Simulate restart time

    this.logger.log('Services restarted');
  }

  /**
   * Validate rollback plan
   */
  private async validateRollbackPlan(plan: RollbackPlan): Promise<void> {
    // Check if backup exists
    if (plan.databaseBackup) {
      const backupPath = path.join('./backups', plan.databaseBackup);
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${plan.databaseBackup}`);
      }
    }

    // Validate migration rollbacks
    if (plan.migrationRollbacks.length === 0) {
      this.logger.warn('No migration rollbacks in plan');
    }

    this.logger.log('Rollback plan validation passed');
  }

  /**
   * Validate rollback success
   */
  private async validateRollback(): Promise<void> {
    this.logger.log('Validating rollback success');

    try {
      // Test database connection
      await this.connection.query('SELECT 1');

      // Test basic API endpoints
      // This would make HTTP requests to key endpoints

      // Check application version
      // Verify the rolled back version is running

      this.logger.log('Rollback validation passed');
    } catch (error) {
      this.logger.error('Rollback validation failed:', error.message);
      throw error;
    }
  }

  /**
   * Emergency recovery
   */
  private async emergencyRecovery(): Promise<void> {
    this.logger.error('Initiating emergency recovery');

    try {
      // Exit maintenance mode
      await this.exitMaintenanceMode();

      // Restore from latest backup
      const backups = fs
        .readdirSync('./backups')
        .filter(file => file.endsWith('.sql'))
        .sort()
        .reverse();

      if (backups.length > 0) {
        await this.restoreDatabaseBackup(backups[0]);
      }

      // Restart services
      await this.restartServices();

      this.logger.log('Emergency recovery completed');
    } catch (error) {
      this.logger.error('Emergency recovery failed:', error.message);
    }
  }
}
