import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Column,
} from 'typeorm';

export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    comment: 'Tự động ghi nhận thời điểm được tạo',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
    comment: 'Tự động cập nhật mỗi khi thông tin có sự thay đổi.',
  })
  updatedAt: Date;

  @DeleteDateColumn({
    type: 'timestamp',
    nullable: true,
    comment:
      'Hỗ trợ xóa mềm (soft delete). Thay vì xóa vĩnh viễn, cột này sẽ được cập nhật thời gian, giữ lại dữ liệu để có thể khôi phục',
  })
  deletedAt?: Date;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID của người tạo',
  })
  createdBy?: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID của người cập nhật cuối',
  })
  updatedBy?: string;
}
