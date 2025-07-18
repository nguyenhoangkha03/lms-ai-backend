import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateRealtimeTables1234567891234 implements MigrationInterface {
  name = 'CreateRealtimeTables1234567891234';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create realtime_events table
    await queryRunner.createTable(
      new Table({
        name: 'realtime_events',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'deletedAt',
            type: 'timestamp',
            precision: 6,
            isNullable: true,
          },
          {
            name: 'eventType',
            type: 'enum',
            enum: [
              'lesson_started',
              'lesson_completed',
              'course_progress_updated',
              'assignment_submitted',
              'grade_received',
              'user_login',
              'user_logout',
              'user_online',
              'user_offline',
              'user_typing',
              'course_enrolled',
              'course_created',
              'course_updated',
              'new_announcement',
              'new_message',
              'message_edited',
              'message_deleted',
              'reaction_added',
              'quiz_started',
              'quiz_submitted',
              'quiz_graded',
              'system_notification',
              'maintenance_mode',
              'broadcast_message',
            ],
          },
          {
            name: 'scope',
            type: 'enum',
            enum: ['global', 'user', 'course', 'group', 'room', 'role'],
          },
          {
            name: 'targetId',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'triggeredBy',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'payload',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'actionUrl',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'iconUrl',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'priority',
            type: 'int',
            default: '1',
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'channels',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'deliveryStatus',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'reachCount',
            type: 'int',
            default: '0',
          },
          {
            name: 'interactionCount',
            type: 'int',
            default: '0',
          },
          {
            name: 'tags',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create activity_feeds table
    await queryRunner.createTable(
      new Table({
        name: 'activity_feeds',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'deletedAt',
            type: 'timestamp',
            precision: 6,
            isNullable: true,
          },
          {
            name: 'userId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'activityType',
            type: 'enum',
            enum: [
              'course_enrolled',
              'lesson_completed',
              'assignment_submitted',
              'quiz_completed',
              'certificate_earned',
              'comment_posted',
              'discussion_started',
              'answer_provided',
              'question_asked',
              'group_joined',
              'project_shared',
              'note_shared',
              'peer_review_completed',
              'badge_earned',
              'milestone_reached',
              'streak_achieved',
              'goal_completed',
              'profile_updated',
              'settings_changed',
            ],
          },
          {
            name: 'visibility',
            type: 'enum',
            enum: ['public', 'friends', 'course_members', 'group_members', 'private'],
            default: "'public'",
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'courseId',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'lessonId',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'assignmentId',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'groupId',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'relatedId',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'relatedType',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'activityData',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'actionUrl',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'imageUrl',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'isVisible',
            type: 'boolean',
            default: true,
          },
          {
            name: 'likesCount',
            type: 'int',
            default: '0',
          },
          {
            name: 'commentsCount',
            type: 'int',
            default: '0',
          },
          {
            name: 'sharesCount',
            type: 'int',
            default: '0',
          },
          {
            name: 'likedBy',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'tags',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'importance',
            type: 'int',
            default: '1',
          },
          {
            name: 'occurredAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create user_presence table
    await queryRunner.createTable(
      new Table({
        name: 'user_presence',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'deletedAt',
            type: 'timestamp',
            precision: 6,
            isNullable: true,
          },
          {
            name: 'userId',
            type: 'varchar',
            length: '36',
            isUnique: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['online', 'offline', 'away', 'busy', 'do_not_disturb', 'invisible'],
            default: "'offline'",
          },
          {
            name: 'activityStatus',
            type: 'enum',
            enum: [
              'studying',
              'in_lesson',
              'taking_quiz',
              'in_chat',
              'in_video_call',
              'idle',
              'browsing',
            ],
            default: "'idle'",
          },
          {
            name: 'isOnline',
            type: 'boolean',
            default: false,
          },
          {
            name: 'lastSeenAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'onlineAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'statusMessage',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'currentCourseId',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'currentLessonId',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'currentChatRoomId',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'currentVideoSessionId',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'deviceInfo',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'locationInfo',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'activityDetails',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'sessionDuration',
            type: 'int',
            default: '0',
          },
          {
            name: 'pageViews',
            type: 'int',
            default: '0',
          },
          {
            name: 'interactionCount',
            type: 'int',
            default: '0',
          },
          {
            name: 'lastActivityAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'connections',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'preferences',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'realtime_events',
      new TableIndex({
        name: 'IDX_realtime_events_type',
        columnNames: ['eventType'],
      }),
    );
    await queryRunner.createIndex(
      'realtime_events',
      new TableIndex({
        name: 'IDX_realtime_events_scope',
        columnNames: ['scope'],
      }),
    );
    await queryRunner.createIndex(
      'realtime_events',
      new TableIndex({
        name: 'IDX_realtime_events_target',
        columnNames: ['targetId'],
      }),
    );
    await queryRunner.createIndex(
      'realtime_events',
      new TableIndex({
        name: 'IDX_realtime_events_created',
        columnNames: ['createdAt'],
      }),
    );
    await queryRunner.createIndex(
      'realtime_events',
      new TableIndex({
        name: 'IDX_realtime_events_active',
        columnNames: ['isActive'],
      }),
    );

    await queryRunner.createIndex(
      'activity_feeds',
      new TableIndex({
        name: 'IDX_activity_feeds_user',
        columnNames: ['userId'],
      }),
    );
    await queryRunner.createIndex(
      'activity_feeds',
      new TableIndex({
        name: 'IDX_activity_feeds_type',
        columnNames: ['activityType'],
      }),
    );
    await queryRunner.createIndex(
      'activity_feeds',
      new TableIndex({
        name: 'IDX_activity_feeds_course',
        columnNames: ['courseId'],
      }),
    );
    await queryRunner.createIndex(
      'activity_feeds',
      new TableIndex({
        name: 'IDX_activity_feeds_created',
        columnNames: ['createdAt'],
      }),
    );
    await queryRunner.createIndex(
      'activity_feeds',
      new TableIndex({
        name: 'IDX_activity_feeds_visible',
        columnNames: ['isVisible'],
      }),
    );

    await queryRunner.createIndex(
      'user_presence',
      new TableIndex({
        name: 'IDX_user_presence_user',
        columnNames: ['userId'],
      }),
    );
    await queryRunner.createIndex(
      'user_presence',
      new TableIndex({
        name: 'IDX_user_presence_status',
        columnNames: ['status'],
      }),
    );
    await queryRunner.createIndex(
      'user_presence',
      new TableIndex({
        name: 'IDX_user_presence_online',
        columnNames: ['isOnline'],
      }),
    );
    await queryRunner.createIndex(
      'user_presence',
      new TableIndex({
        name: 'IDX_user_presence_last_seen',
        columnNames: ['lastSeenAt'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('user_presence');
    await queryRunner.dropTable('activity_feeds');
    await queryRunner.dropTable('realtime_events');
  }
}
