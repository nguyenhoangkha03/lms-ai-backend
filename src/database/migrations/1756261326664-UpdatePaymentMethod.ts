import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdatePaymentMethod1756261326664 implements MigrationInterface {
    name = 'UpdatePaymentMethod1756261326664'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`payments\` CHANGE \`paymentMethod\` \`paymentMethod\` enum ('momo', 'stripe') NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`payments\` CHANGE \`paymentMethod\` \`paymentMethod\` enum ('vnpay', 'momo', 'zalopay', 'credit_card', 'bank_transfer') NOT NULL`);
    }

}
