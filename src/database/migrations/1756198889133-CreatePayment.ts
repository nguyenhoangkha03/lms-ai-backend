import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePayment1756198889133 implements MigrationInterface {
    name = 'CreatePayment1756198889133'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`payments\` (\`id\` varchar(36) NOT NULL, \`createdAt\` timestamp(6) NOT NULL COMMENT 'Tự động ghi nhận thời điểm được tạo' DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` timestamp(6) NOT NULL COMMENT 'Tự động cập nhật mỗi khi thông tin có sự thay đổi.' DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deletedAt\` timestamp(6) NULL COMMENT 'Hỗ trợ xóa mềm (soft delete). Thay vì xóa vĩnh viễn, cột này sẽ được cập nhật thời gian, giữ lại dữ liệu để có thể khôi phục', \`createdBy\` varchar(36) NULL COMMENT 'ID của người tạo', \`updatedBy\` varchar(36) NULL COMMENT 'ID của người cập nhật cuối', \`userId\` varchar(255) NOT NULL, \`orderCode\` varchar(255) NOT NULL, \`paymentMethod\` enum ('vnpay', 'momo', 'zalopay', 'credit_card', 'bank_transfer') NOT NULL, \`status\` enum ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded') NOT NULL DEFAULT 'pending', \`totalAmount\` decimal(10,2) NOT NULL, \`discountAmount\` decimal(10,2) NULL, \`finalAmount\` decimal(10,2) NOT NULL, \`currency\` varchar(3) NOT NULL DEFAULT 'USD', \`couponCode\` varchar(255) NULL, \`gatewayTransactionId\` varchar(255) NULL, \`gatewayOrderCode\` varchar(255) NULL, \`gatewayResponse\` text NULL, \`failureReason\` text NULL, \`paidAt\` datetime NULL, \`expiredAt\` datetime NULL, \`description\` text NULL, \`metadata\` json NULL, UNIQUE INDEX \`IDX_a28f9de43c3c1299c065e64018\` (\`orderCode\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`payment_items\` (\`id\` varchar(36) NOT NULL, \`createdAt\` timestamp(6) NOT NULL COMMENT 'Tự động ghi nhận thời điểm được tạo' DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` timestamp(6) NOT NULL COMMENT 'Tự động cập nhật mỗi khi thông tin có sự thay đổi.' DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deletedAt\` timestamp(6) NULL COMMENT 'Hỗ trợ xóa mềm (soft delete). Thay vì xóa vĩnh viễn, cột này sẽ được cập nhật thời gian, giữ lại dữ liệu để có thể khôi phục', \`createdBy\` varchar(36) NULL COMMENT 'ID của người tạo', \`updatedBy\` varchar(36) NULL COMMENT 'ID của người cập nhật cuối', \`paymentId\` varchar(255) NOT NULL, \`courseId\` varchar(255) NOT NULL, \`price\` decimal(10,2) NOT NULL, \`originalPrice\` decimal(10,2) NULL, \`discountAmount\` decimal(10,2) NULL, \`currency\` varchar(3) NOT NULL DEFAULT 'USD', \`courseTitle\` text NULL, \`courseThumbnail\` text NULL, \`metadata\` json NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`payments\` ADD CONSTRAINT \`FK_d35cb3c13a18e1ea1705b2817b1\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`payment_items\` ADD CONSTRAINT \`FK_a474343291bff7e09f9ff2cf614\` FOREIGN KEY (\`paymentId\`) REFERENCES \`payments\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`payment_items\` ADD CONSTRAINT \`FK_d4404fc934de6a0a81a3c268b99\` FOREIGN KEY (\`courseId\`) REFERENCES \`courses\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`payment_items\` DROP FOREIGN KEY \`FK_d4404fc934de6a0a81a3c268b99\``);
        await queryRunner.query(`ALTER TABLE \`payment_items\` DROP FOREIGN KEY \`FK_a474343291bff7e09f9ff2cf614\``);
        await queryRunner.query(`ALTER TABLE \`payments\` DROP FOREIGN KEY \`FK_d35cb3c13a18e1ea1705b2817b1\``);
        await queryRunner.query(`DROP TABLE \`payment_items\``);
        await queryRunner.query(`DROP INDEX \`IDX_a28f9de43c3c1299c065e64018\` ON \`payments\``);
        await queryRunner.query(`DROP TABLE \`payments\``);
    }

}
