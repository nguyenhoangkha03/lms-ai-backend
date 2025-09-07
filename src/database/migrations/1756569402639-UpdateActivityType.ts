import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateActivityType1756569402639 implements MigrationInterface {
    name = 'UpdateActivityType1756569402639'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_7331684c0c5b063803a425001a\` ON \`permissions\``);
        await queryRunner.query(`ALTER TABLE \`permissions\` CHANGE \`resource\` \`resource\` enum ('user', 'course', 'lesson', 'assessment', 'grade', 'analytics', 'system', 'wishlist', '*') NOT NULL COMMENT 'Đối tượng mà quyền này tác động đến, ví dụ: user (người dùng), course (khóa học), system (hệ thống).'`);
        await queryRunner.query(`ALTER TABLE \`learning_activities\` CHANGE \`activityType\` \`activityType\` enum ('login', 'logout', 'course_view', 'lesson_start', 'lesson_complete', 'lesson_progress', 'video_play', 'video_start', 'video_resume', 'video_pause', 'video_seek', 'video_complete', 'video_speed_change', 'video_quality_change', 'quiz_start', 'quiz_submit', 'quiz_complete', 'assignment_start', 'assignment_submit', 'discussion_post', 'chat_message', 'file_download', 'search', 'bookmark_add', 'note_create', 'help_request', 'course_complete', 'certificate_earn', 'assessment_start', 'forum_post', 'content_read', 'content_scroll', 'content_focus', 'content_blur', 'tab_switch', 'window_blur', 'window_focus', 'note_updated', 'bookmark_created', 'resource_download', 'interactive_completed', 'quiz_attempt') NOT NULL COMMENT 'Cột quan trọng nhất, phân loại hành động đã diễn ra. Ví dụ: video_play (bắt đầu xem video), video_pause (tạm dừng), video_seek (tua video), quiz_submit (nộp bài quiz).'`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_7331684c0c5b063803a425001a\` ON \`permissions\` (\`resource\`, \`action\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_7331684c0c5b063803a425001a\` ON \`permissions\``);
        await queryRunner.query(`ALTER TABLE \`learning_activities\` CHANGE \`activityType\` \`activityType\` enum ('login', 'logout', 'course_view', 'lesson_start', 'lesson_complete', 'lesson_progress', 'video_play', 'video_pause', 'video_seek', 'video_complete', 'quiz_start', 'quiz_submit', 'quiz_complete', 'assignment_start', 'assignment_submit', 'discussion_post', 'chat_message', 'file_download', 'search', 'bookmark_add', 'note_create', 'help_request', 'course_complete', 'certificate_earn', 'assessment_start', 'forum_post', 'content_read', 'quiz_attempt') NOT NULL COMMENT 'Cột quan trọng nhất, phân loại hành động đã diễn ra. Ví dụ: video_play (bắt đầu xem video), video_pause (tạm dừng), video_seek (tua video), quiz_submit (nộp bài quiz).'`);
        await queryRunner.query(`ALTER TABLE \`permissions\` CHANGE \`resource\` \`resource\` enum ('user', 'course', 'lesson', 'assessment', 'grade', 'analytics', 'system', '*') NOT NULL COMMENT 'Đối tượng mà quyền này tác động đến, ví dụ: user (người dùng), course (khóa học), system (hệ thống).'`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_7331684c0c5b063803a425001a\` ON \`permissions\` (\`resource\`, \`action\`)`);
    }

}
