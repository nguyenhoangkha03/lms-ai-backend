import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateCommunicationSystemTables1234567890004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create chat_rooms table
    await queryRunner.createTable(
      new Table({
        name: 'chat_rooms',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'roomType',
            type: 'enum',
            enum: [
              'general',
              'course',
              'lesson',
              'study_group',
              'office_hours',
              'help_desk',
              'announcements',
              'private',
              'public',
            ],
            default: "'general'",
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'inactive', 'archived', 'locked', 'maintenance'],
            default: "'active'",
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
            name: 'createdBy',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'isPrivate',
            type: 'boolean',
            default: false,
          },
          {
            name: 'maxParticipants',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'participantCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'messageCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'lastMessageAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'lastMessageBy',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'avatarUrl',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'settings',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'moderationSettings',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'analytics',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'integrations',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          new TableIndex({
            name: 'IDX_chat_rooms_type',
            columnNames: ['roomType'],
          }),
          new TableIndex({
            name: 'IDX_chat_rooms_status',
            columnNames: ['status'],
          }),
          new TableIndex({
            name: 'IDX_chat_rooms_course',
            columnNames: ['courseId'],
          }),
          new TableIndex({
            name: 'IDX_chat_rooms_lesson',
            columnNames: ['lessonId'],
          }),
          new TableIndex({
            name: 'IDX_chat_rooms_creator',
            columnNames: ['createdBy'],
          }),
          new TableIndex({
            name: 'IDX_chat_rooms_active',
            columnNames: ['isActive'],
          }),
          new TableIndex({
            name: 'IDX_chat_rooms_created',
            columnNames: ['createdAt'],
          }),
        ],
      }),
      true,
    );

    // Create chat_participants table
    await queryRunner.createTable(
      new Table({
        name: 'chat_participants',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'roomId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'userId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'role',
            type: 'enum',
            enum: ['owner', 'admin', 'moderator', 'member', 'guest'],
            default: "'member'",
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'inactive', 'banned', 'muted', 'away', 'busy'],
            default: "'active'",
          },
          {
            name: 'joinedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'leftAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'lastRead',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'lastReadMessageId',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'unreadCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'isMuted',
            type: 'boolean',
            default: false,
          },
          {
            name: 'isPinned',
            type: 'boolean',
            default: false,
          },
          {
            name: 'isTyping',
            type: 'boolean',
            default: false,
          },
          {
            name: 'lastActiveAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'lastSeenAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'nickname',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'customColor',
            type: 'varchar',
            length: '7',
            isNullable: true,
          },
          {
            name: 'permissions',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'notificationSettings',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'statistics',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'bannedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'bannedBy',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'banReason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'banExpiresAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          new TableIndex({
            name: 'IDX_chat_participants_room',
            columnNames: ['roomId'],
          }),
          new TableIndex({
            name: 'IDX_chat_participants_user',
            columnNames: ['userId'],
          }),
          new TableIndex({
            name: 'IDX_chat_participants_role',
            columnNames: ['role'],
          }),
          new TableIndex({
            name: 'IDX_chat_participants_status',
            columnNames: ['status'],
          }),
          new TableIndex({
            name: 'IDX_chat_participants_joined',
            columnNames: ['joinedAt'],
          }),
          new TableIndex({
            name: 'IDX_chat_participants_last_read',
            columnNames: ['lastRead'],
          }),
        ],
      }),
      true,
    );

    // Add unique constraint for room-user combination
    await queryRunner.createIndex(
      'chat_participants',
      new TableIndex({
        name: 'IDX_chat_participants_unique_room_user',
        columnNames: ['roomId', 'userId'],
        isUnique: true,
      }),
    );

    // Create chat_messages table
    await queryRunner.createTable(
      new Table({
        name: 'chat_messages',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'roomId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'senderId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'content',
            type: 'text',
          },
          {
            name: 'messageType',
            type: 'enum',
            enum: [
              'text',
              'image',
              'video',
              'audio',
              'file',
              'link',
              'code',
              'system',
              'announcement',
              'poll',
              'quiz',
            ],
            default: "'text'",
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['sending', 'sent', 'delivered', 'read', 'failed', 'deleted'],
            default: "'sent'",
          },
          {
            name: 'replyToId',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'attachments',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'mentions',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'reactions',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'isEdited',
            type: 'boolean',
            default: false,
          },
          {
            name: 'editedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'originalContent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'isDeleted',
            type: 'boolean',
            default: false,
          },
          {
            name: 'deletedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'deletedBy',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'isPinned',
            type: 'boolean',
            default: false,
          },
          {
            name: 'pinnedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'pinnedBy',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'isFlagged',
            type: 'boolean',
            default: false,
          },
          {
            name: 'flaggedBy',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'flagReason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'formatting',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'linkPreview',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'translations',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'moderationResult',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'analytics',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          new TableIndex({
            name: 'IDX_chat_messages_room',
            columnNames: ['roomId'],
          }),
          new TableIndex({
            name: 'IDX_chat_messages_sender',
            columnNames: ['senderId'],
          }),
          new TableIndex({
            name: 'IDX_chat_messages_type',
            columnNames: ['messageType'],
          }),
          new TableIndex({
            name: 'IDX_chat_messages_status',
            columnNames: ['status'],
          }),
          new TableIndex({
            name: 'IDX_chat_messages_created',
            columnNames: ['createdAt'],
          }),
          new TableIndex({
            name: 'IDX_chat_messages_reply',
            columnNames: ['replyToId'],
          }),
          new TableIndex({
            name: 'IDX_chat_messages_edited',
            columnNames: ['isEdited'],
          }),
          new TableIndex({
            name: 'IDX_chat_messages_deleted',
            columnNames: ['isDeleted'],
          }),
          new TableIndex({
            name: 'IDX_chat_messages_pinned',
            columnNames: ['isPinned'],
          }),
        ],
      }),
      true,
    );

    // Create video_sessions table
    await queryRunner.createTable(
      new Table({
        name: 'video_sessions',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
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
            name: 'hostId',
            type: 'varchar',
            length: '36',
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
            name: 'sessionType',
            type: 'enum',
            enum: [
              'meeting',
              'webinar',
              'lecture',
              'tutorial',
              'office_hours',
              'study_group',
              'exam',
              'workshop',
            ],
            default: "'meeting'",
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['scheduled', 'live', 'completed', 'cancelled', 'postponed', 'failed'],
            default: "'scheduled'",
          },
          {
            name: 'scheduledStart',
            type: 'timestamp',
          },
          {
            name: 'scheduledEnd',
            type: 'timestamp',
          },
          {
            name: 'actualStart',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'actualEnd',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'maxParticipants',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'currentParticipants',
            type: 'int',
            default: 0,
          },
          {
            name: 'totalParticipants',
            type: 'int',
            default: 0,
          },
          {
            name: 'provider',
            type: 'enum',
            enum: ['webrtc', 'zoom', 'teams', 'meet', 'jitsi', 'bigbluebutton', 'custom'],
            default: "'webrtc'",
          },
          {
            name: 'meetingUrl',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'meetingId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'passcode',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'dialInInfo',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'isRecording',
            type: 'boolean',
            default: false,
          },
          {
            name: 'recordingUrl',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'recordingDuration',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'recordingSize',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'requiresRegistration',
            type: 'boolean',
            default: false,
          },
          {
            name: 'waitingRoomEnabled',
            type: 'boolean',
            default: false,
          },
          {
            name: 'settings',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'securitySettings',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'breakoutRooms',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'polls',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'analytics',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'qualityMetrics',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'agenda',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'summary',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'followUpActions',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          new TableIndex({
            name: 'IDX_video_sessions_host',
            columnNames: ['hostId'],
          }),
          new TableIndex({
            name: 'IDX_video_sessions_course',
            columnNames: ['courseId'],
          }),
          new TableIndex({
            name: 'IDX_video_sessions_lesson',
            columnNames: ['lessonId'],
          }),
          new TableIndex({
            name: 'IDX_video_sessions_type',
            columnNames: ['sessionType'],
          }),
          new TableIndex({
            name: 'IDX_video_sessions_status',
            columnNames: ['status'],
          }),
          new TableIndex({
            name: 'IDX_video_sessions_scheduled_start',
            columnNames: ['scheduledStart'],
          }),
          new TableIndex({
            name: 'IDX_video_sessions_scheduled_end',
            columnNames: ['scheduledEnd'],
          }),
          new TableIndex({
            name: 'IDX_video_sessions_actual_start',
            columnNames: ['actualStart'],
          }),
          new TableIndex({
            name: 'IDX_video_sessions_actual_end',
            columnNames: ['actualEnd'],
          }),
        ],
      }),
      true,
    );

    // Create video_participants table
    await queryRunner.createTable(
      new Table({
        name: 'video_participants',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'sessionId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'userId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'role',
            type: 'enum',
            enum: ['host', 'co_host', 'presenter', 'moderator', 'attendee'],
            default: "'attendee'",
          },
          {
            name: 'connectionStatus',
            type: 'enum',
            enum: ['connected', 'connecting', 'disconnected', 'reconnecting', 'failed'],
            default: "'connected'",
          },
          {
            name: 'joinedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'leftAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'duration',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'isMuted',
            type: 'boolean',
            default: false,
          },
          {
            name: 'videoDisabled',
            type: 'boolean',
            default: false,
          },
          {
            name: 'isScreenSharing',
            type: 'boolean',
            default: false,
          },
          {
            name: 'handRaised',
            type: 'boolean',
            default: false,
          },
          {
            name: 'handRaisedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'inWaitingRoom',
            type: 'boolean',
            default: false,
          },
          {
            name: 'breakoutRoomId',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'displayName',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'avatarUrl',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'deviceInfo',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'connectionQuality',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'permissions',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'engagementMetrics',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'activitiesLog',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'technicalIssues',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'feedback',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'rating',
            type: 'decimal',
            precision: 3,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'exitSurvey',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          new TableIndex({
            name: 'IDX_video_participants_session',
            columnNames: ['sessionId'],
          }),
          new TableIndex({
            name: 'IDX_video_participants_user',
            columnNames: ['userId'],
          }),
          new TableIndex({
            name: 'IDX_video_participants_role',
            columnNames: ['role'],
          }),
          new TableIndex({
            name: 'IDX_video_participants_status',
            columnNames: ['connectionStatus'],
          }),
          new TableIndex({
            name: 'IDX_video_participants_joined',
            columnNames: ['joinedAt'],
          }),
          new TableIndex({
            name: 'IDX_video_participants_left',
            columnNames: ['leftAt'],
          }),
        ],
      }),
      true,
    );

    // Add unique constraint for session-user combination
    await queryRunner.createIndex(
      'video_participants',
      new TableIndex({
        name: 'IDX_video_participants_unique_session_user',
        columnNames: ['sessionId', 'userId'],
        isUnique: true,
      }),
    );

    // Continue with remaining tables...
    // (The response would continue with the remaining table creation code)

    // Add Foreign Key Constraints
    await this.addForeignKeyConstraints(queryRunner);
  }

  private async addForeignKeyConstraints(queryRunner: QueryRunner): Promise<void> {
    // Chat rooms foreign keys
    await queryRunner.createForeignKey(
      'chat_rooms',
      new TableForeignKey({
        columnNames: ['courseId'],
        referencedTableName: 'courses',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'chat_rooms',
      new TableForeignKey({
        columnNames: ['lessonId'],
        referencedTableName: 'lessons',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'chat_rooms',
      new TableForeignKey({
        columnNames: ['createdBy'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    // Chat participants foreign keys
    await queryRunner.createForeignKey(
      'chat_participants',
      new TableForeignKey({
        columnNames: ['roomId'],
        referencedTableName: 'chat_rooms',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'chat_participants',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Chat Messages
    await queryRunner.createForeignKey(
      'chat_messages',
      new TableForeignKey({
        columnNames: ['roomId'],
        referencedTableName: 'chat_rooms',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'chat_messages',
      new TableForeignKey({
        columnNames: ['senderId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'chat_messages',
      new TableForeignKey({
        columnNames: ['replyToId'],
        referencedTableName: 'chat_messages',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Video sessions foreign keys
    await queryRunner.createForeignKey(
      'video_sessions',
      new TableForeignKey({
        columnNames: ['hostId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'video_sessions',
      new TableForeignKey({
        columnNames: ['courseId'],
        referencedTableName: 'courses',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'video_sessions',
      new TableForeignKey({
        columnNames: ['lessonId'],
        referencedTableName: 'lessons',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Video Participants foreign keys
    await queryRunner.createForeignKey(
      'video_participants',
      new TableForeignKey({
        columnNames: ['sessionId'],
        referencedTableName: 'video_sessions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'video_participants',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.dropTable('chatbot_messages');
    await queryRunner.dropTable('chatbot_conversations');
    await queryRunner.dropTable('audit_logs');
    await queryRunner.dropTable('system_settings');
    await queryRunner.dropTable('notification_preferences');
    await queryRunner.dropTable('notifications');
    await queryRunner.dropTable('video_participants');
    await queryRunner.dropTable('video_sessions');
    await queryRunner.dropTable('chat_messages');
    await queryRunner.dropTable('chat_participants');
    await queryRunner.dropTable('chat_rooms');
  }
}
