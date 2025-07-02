import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { SettingCategory, SettingType } from '@/common/enums/system.enums';

@Entity('system_settings')
// @Unique(['key'])
@Index(['category'])
// @Index(['type'])
@Index(['isPublic'])
@Index(['isActive'])
export class SystemSetting extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
    comment: 'Setting key identifier',
  })
  key: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Human-readable setting name',
  })
  name: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Setting description',
  })
  description?: string;

  @Column({
    type: 'enum',
    enum: SettingCategory,
    comment: 'Setting category',
  })
  category: SettingCategory;

  @Column({
    type: 'enum',
    enum: SettingType,
    comment: 'Data type of the setting',
  })
  type: SettingType;

  @Column({
    type: 'text',
    comment: 'Setting value (stored as string)',
  })
  value: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Default value',
  })
  defaultValue?: string;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Whether setting is active',
  })
  isActive: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether setting is public (visible to frontend)',
  })
  isPublic: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether setting is read-only',
  })
  isReadOnly: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether setting is encrypted',
  })
  isEncrypted: boolean;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Validation rules for the setting',
  })
  validationRules?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    minValue?: number;
    maxValue?: number;
    pattern?: string;
    allowedValues?: any[];
    customValidator?: string;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'UI configuration for setting display',
  })
  uiConfig?: {
    displayOrder?: number;
    group?: string;
    label?: string;
    placeholder?: string;
    helpText?: string;
    inputType?:
      | 'text'
      | 'password'
      | 'number'
      | 'email'
      | 'url'
      | 'textarea'
      | 'select'
      | 'multiselect'
      | 'checkbox'
      | 'radio'
      | 'file';
    options?: { value: any; label: string }[];
    hidden?: boolean;
    disabled?: boolean;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Dependencies on other settings',
  })
  dependencies?: {
    dependsOn?: string[];
    conditionalDisplay?: {
      settingKey: string;
      operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
      value: any;
    }[];
  };

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'User who last modified the setting',
  })
  lastModifiedBy?: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When setting was last modified',
  })
  lastModifiedAt?: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Value history for audit trail',
  })
  valueHistory?: {
    value: string;
    modifiedBy: string;
    modifiedAt: Date;
    reason?: string;
  }[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Environment-specific overrides',
  })
  environmentOverrides?: {
    development?: string;
    staging?: string;
    production?: string;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional setting metadata',
  })
  metadata?: Record<string, any>;

  // Virtual properties
  get parsedValue(): any {
    switch (this.type) {
      case SettingType.BOOLEAN:
        return this.value.toLowerCase() === 'true';
      case SettingType.NUMBER:
        return parseFloat(this.value);
      case SettingType.INTEGER:
        return parseInt(this.value, 10);
      case SettingType.JSON:
        try {
          return JSON.parse(this.value);
        } catch {
          return null;
        }
      case SettingType.ARRAY:
        try {
          return JSON.parse(this.value);
        } catch {
          return [];
        }
      case SettingType.STRING:
      case SettingType.TEXT:
      case SettingType.EMAIL:
      case SettingType.URL:
      default:
        return this.value;
    }
  }

  get isModified(): boolean {
    return this.value !== this.defaultValue;
  }

  get canBeModified(): boolean {
    return this.isActive && !this.isReadOnly;
  }
}
