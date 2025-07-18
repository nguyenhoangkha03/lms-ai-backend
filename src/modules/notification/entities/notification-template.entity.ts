import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { NotificationType, TemplateType, DeliveryChannel } from '@/common/enums/notification.enums';

@Entity('notification_templates')
@Index(['type'])
@Index(['channel'])
@Index(['templateType'])
@Index(['isActive'])
export class NotificationTemplate extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Template name',
  })
  name: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Template description',
  })
  description?: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
    comment: 'Notification type this template is for',
  })
  type: NotificationType;

  @Column({
    type: 'enum',
    enum: DeliveryChannel,
    comment: 'Delivery channel for this template',
  })
  channel: DeliveryChannel;

  @Column({
    type: 'enum',
    enum: TemplateType,
    comment: 'Template format type',
  })
  templateType: TemplateType;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Template subject (for email/push)',
  })
  subject: string;

  @Column({
    type: 'longtext',
    comment: 'Template body content with placeholders',
  })
  body: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'HTML version of template body',
  })
  htmlBody?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Template variables and their descriptions',
  })
  variables?: {
    name: string;
    description: string;
    type: 'string' | 'number' | 'date' | 'boolean' | 'object';
    required: boolean;
    defaultValue?: any;
  }[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Template styling configuration',
  })
  styling?: {
    theme?: string;
    colors?: Record<string, string>;
    fonts?: Record<string, string>;
    layout?: string;
    customCss?: string;
  };

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Template language/locale',
  })
  locale?: string;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Whether template is active',
  })
  isActive: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether template is system default',
  })
  isDefault: boolean;

  @Column({
    type: 'int',
    default: 1,
    comment: 'Template version number',
  })
  version: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'A/B testing configuration',
  })
  abTesting?: {
    enabled: boolean;
    variants: {
      name: string;
      weight: number;
      subject?: string;
      body?: string;
      htmlBody?: string;
    }[];
    metrics: string[];
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Template validation rules',
  })
  validationRules?: {
    maxLength?: number;
    requiredFields?: string[];
    allowedTags?: string[];
    prohibitedWords?: string[];
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional template metadata',
  })
  metadata?: Record<string, any>;
}
