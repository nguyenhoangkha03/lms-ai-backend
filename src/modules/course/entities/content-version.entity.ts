import { BaseEntity } from '@/common/entities/base.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Lesson } from './lesson.entity';
import { User } from '@/modules/user/entities/user.entity';

@Entity('content_versions')
export class ContentVersion extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Phiên bản này thuộc về bài học nào',
  })
  lessonId: string;

  @Column({
    type: 'int',
    comment: 'Số thứ tự tăng dần của phiên bản',
  })
  versionNumber: number;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Nội dung của bài học tại thời điểm của phiên bản này',
  })
  content?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Mô tả của bài học tại thời điểm của phiên bản này',
  })
  description?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment:
      'Ghi chú của giảng viên về những thay đổi trong phiên bản này (ví dụ: "Cập nhật video, sửa lỗi chính tả").',
  })
  versionNote?: string;

  @Column({
    type: 'boolean',
    default: false,
    comment:
      'Cờ (true/false) để đánh dấu đây có phải là phiên bản đang được hiển thị cho sinh viên hay không',
  })
  isActive: boolean;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON lưu trữ các cài đặt và metadata của nội dung tại phiên bản này',
  })
  contentMetadata?: {
    wordCount?: number;
    readingTime?: number;
    videoDuration?: number;
    attachmentCount?: number;
    lastModified?: Date;
    checksum?: string;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON tóm tắt những thay đổi so với phiên bản trước',
  })
  changesSummary?: {
    contentChanged?: boolean;
    titleChanged?: boolean;
    descriptionChanged?: boolean;
    attachmentsChanged?: boolean;
    settingsChanged?: boolean;
    additions?: string[];
    deletions?: string[];
    modifications?: string[];
  };

  @Column({
    type: 'enum',
    enum: ['major', 'minor', 'patch', 'draft'],
    default: 'minor',
    comment:
      'Phân loại mức độ thay đổi (major - thay đổi lớn, minor - thay đổi nhỏ, patch - sửa lỗi nhỏ)',
  })
  versionType: 'major' | 'minor' | 'patch' | 'draft';

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Dữ liệu meta',
  })
  metadata?: Record<string, any>;

  // === RELATIONSHIPS === //

  @ManyToOne(() => Lesson, lesson => lesson.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lessonId' })
  lesson: Lesson;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'updatedBy' })
  updater?: User;
}
