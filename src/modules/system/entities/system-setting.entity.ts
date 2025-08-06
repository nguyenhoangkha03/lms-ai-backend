import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { SettingCategory, SettingType } from '@/common/enums/system.enums';

@Entity('system_settings')
@Index(['key'])
@Index(['category'])
@Index(['type'])
@Index(['isPublic'])
@Index(['isActive'])
export class SystemSetting extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Tên định danh duy nhất của cài đặt ',
  })
  key: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Tên cài đặt sẽ hiển thị trên giao diện',
  })
  name: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Giải thích rõ ràng về chức năng và ảnh hưởng của cài đặt này',
  })
  description?: string;

  @Column({
    type: 'enum',
    enum: SettingCategory,
    comment: 'Phân loại cài đặt để nhóm lại trong trang',
  })
  category: SettingCategory;

  @Column({
    type: 'enum',
    enum: SettingType,
    comment: 'Kiểu dữ liệu của giá trị cài đặt',
  })
  type: SettingType;

  @Column({
    type: 'text',
    comment: 'Giá trị thực tế của cài đặt đang được áp dụng',
  })
  value: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Giá trị mặc định của cài đặt nếu không có giá trị nào được thiết lập',
  })
  defaultValue?: string;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Cờ (true/false) cho biết cài đặt này có đang được áp dụng hay không',
  })
  isActive: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment:
      'Cờ (true/false) xác định giá trị của cài đặt có thể được gửi xuống cho giao diện người dùng (frontend) hay không',
  })
  isPublic: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment:
      'Cờ (true/false) xác định giá trị của cài đặt có thể được gửi xuống cho giao diện người dùng (frontend) hay không',
  })
  isReadOnly: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Cờ (true/false) xác định giá trị có nên được mã hóa trong cơ sở dữ liệu hay không',
  })
  isEncrypted: boolean;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON chứa các quy tắc với giá trị cài đặt',
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
    comment: 'Trường JSON để giúp giao diện hiển thị cài đặt một cách phù hợp',
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
    comment: 'Trường JSON định nghĩa các phụ thuộc của cài đặt này vào các cài đặt khác',
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
    comment: 'Người sửa đổi cuối',
  })
  lastModifiedBy?: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thời điểm sửa đổi cuối',
  })
  lastModifiedAt?: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON ghi lại lịch sử thay đổi của giá trị, rất hữu ích cho việc kiểm toán',
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
    comment: 'Trường JSON cho phép định nghĩa các giá trị khác nhau cho các môi trường khác nhau',
  })
  environmentOverrides?: {
    development?: string;
    staging?: string;
    production?: string;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Dữ liệu meta',
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
