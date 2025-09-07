import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCart1756192677357 implements MigrationInterface {
    name = 'CreateCart1756192677357'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`cart\` (\`id\` varchar(36) NOT NULL, \`createdAt\` timestamp(6) NOT NULL COMMENT 'Tự động ghi nhận thời điểm được tạo' DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` timestamp(6) NOT NULL COMMENT 'Tự động cập nhật mỗi khi thông tin có sự thay đổi.' DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deletedAt\` timestamp(6) NULL COMMENT 'Hỗ trợ xóa mềm (soft delete). Thay vì xóa vĩnh viễn, cột này sẽ được cập nhật thời gian, giữ lại dữ liệu để có thể khôi phục', \`createdBy\` varchar(36) NULL COMMENT 'ID của người tạo', \`updatedBy\` varchar(36) NULL COMMENT 'ID của người cập nhật cuối', \`userId\` varchar(36) NOT NULL COMMENT 'ID của user sở hữu giỏ hàng', \`courseId\` varchar(36) NOT NULL COMMENT 'ID của khóa học trong giỏ hàng', \`priceAtAdd\` decimal(10,2) NOT NULL COMMENT 'Giá khóa học tại thời điểm thêm vào giỏ hàng', \`currency\` varchar(3) NOT NULL COMMENT 'Mã tiền tệ' DEFAULT 'USD', \`addedAt\` timestamp NOT NULL COMMENT 'Ngày thêm vào giỏ hàng' DEFAULT CURRENT_TIMESTAMP, \`metadata\` json NULL COMMENT 'Metadata bổ sung (discount, coupon, etc.)', UNIQUE INDEX \`IDX_57c22d31b0d27a1787421921ed\` (\`userId\`, \`courseId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`student_profiles\` CHANGE \`onboardingCompleted\` \`onboardingCompleted\` tinyint NOT NULL COMMENT 'Sinh viên đã hoàn thành quy trình onboarding' DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE \`file_uploads\` CHANGE \`relatedType\` \`relatedType\` enum ('course_thumbnail', 'course_trailer', 'lesson_video', 'lesson_attachment', 'user_avatar', 'user_cover', 'assignment_submission', 'certificate', 'chat_attachment', 'video_recording', 'teacher_resume', 'teacher_degree', 'teacher_certification', 'teacher_id_document', 'teacher_portfolio', 'course_promotional', 'course_material') NOT NULL COMMENT 'xác định mục đích của tệp, ví dụ: course_thumbnail (ảnh bìa khóa học), lesson_video (video bài học), user_avatar (ảnh đại diện)'`);
        await queryRunner.query(`ALTER TABLE \`cart\` ADD CONSTRAINT \`FK_756f53ab9466eb52a52619ee019\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`cart\` ADD CONSTRAINT \`FK_6b4865936c3f0de933cc0b2d7e9\` FOREIGN KEY (\`courseId\`) REFERENCES \`courses\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`cart\` DROP FOREIGN KEY \`FK_6b4865936c3f0de933cc0b2d7e9\``);
        await queryRunner.query(`ALTER TABLE \`cart\` DROP FOREIGN KEY \`FK_756f53ab9466eb52a52619ee019\``);
        await queryRunner.query(`ALTER TABLE \`file_uploads\` CHANGE \`relatedType\` \`relatedType\` enum ('course_thumbnail', 'course_trailer', 'lesson_video', 'lesson_attachment', 'user_avatar', 'user_cover', 'assignment_submission', 'certificate', 'chat_attachment', 'video_recording', 'teacher_resume', 'teacher_degree', 'teacher_certification', 'teacher_id_document', 'teacher_portfolio') NOT NULL COMMENT 'xác định mục đích của tệp, ví dụ: course_thumbnail (ảnh bìa khóa học), lesson_video (video bài học), user_avatar (ảnh đại diện)'`);
        await queryRunner.query(`ALTER TABLE \`student_profiles\` CHANGE \`onboardingCompleted\` \`onboardingCompleted\` tinyint(1) NOT NULL COMMENT 'Sinh viên đã hoàn thành quy trình onboarding' DEFAULT '0'`);
        await queryRunner.query(`DROP INDEX \`IDX_57c22d31b0d27a1787421921ed\` ON \`cart\``);
        await queryRunner.query(`DROP TABLE \`cart\``);
    }

}
