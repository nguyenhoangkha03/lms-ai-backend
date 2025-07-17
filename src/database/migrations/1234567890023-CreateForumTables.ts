import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateForumTables1234567890023 implements MigrationInterface {
  name = 'CreateForumTables1234567890023';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create forum_categories table
    await queryRunner.createTable(
      new Table({
        name: 'forum_categories',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid()',
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
            name: 'createdBy',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'updatedBy',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'parentId',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'iconUrl',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'bannerUrl',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'color',
            type: 'varchar',
            length: '20',
            default: "'#3B82F6'",
          },
          {
            name: 'orderIndex',
            type: 'int',
            default: 0,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'isFeatured',
            type: 'boolean',
            default: false,
          },
          {
            name: 'isPrivate',
            type: 'boolean',
            default: false,
          },
          {
            name: 'requiresApproval',
            type: 'boolean',
            default: false,
          },
          {
            name: 'threadCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'postCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'lastActivityAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'lastPostId',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'lastPostUserId',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'settings',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
        ],
        indices: [
          new TableIndex({
            name: 'IDX_forum_categories_parent_id',
            columnNames: ['parentId'],
          }),
          new TableIndex({
            name: 'IDX_forum_categories_slug',
            columnNames: ['slug'],
          }),
          new TableIndex({
            name: 'IDX_forum_categories_order_index',
            columnNames: ['orderIndex'],
          }),
          new TableIndex({
            name: 'IDX_forum_categories_is_active',
            columnNames: ['isActive'],
          }),
        ],
      }),
    );

    // Create forum_threads table
    await queryRunner.createTable(
      new Table({
        name: 'forum_threads',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid()',
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
            name: 'createdBy',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'updatedBy',
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
            name: 'slug',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'summary',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'authorId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'categoryId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['thread', 'reply', 'question', 'answer', 'comment'],
            default: "'thread'",
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['open', 'closed', 'locked', 'resolved', 'pinned', 'featured', 'archived'],
            default: "'open'",
          },
          {
            name: 'isPinned',
            type: 'boolean',
            default: false,
          },
          {
            name: 'isFeatured',
            type: 'boolean',
            default: false,
          },
          {
            name: 'isLocked',
            type: 'boolean',
            default: false,
          },
          {
            name: 'isResolved',
            type: 'boolean',
            default: false,
          },
          {
            name: 'acceptedAnswerId',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'viewCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'replyCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'upvoteCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'downvoteCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'score',
            type: 'int',
            default: 0,
          },
          {
            name: 'lastActivityAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'lastPostId',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'lastPostUserId',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'lockedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'lockedBy',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'lockReason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
        ],
        indices: [
          new TableIndex({
            name: 'IDX_forum_threads_category_id',
            columnNames: ['categoryId'],
          }),
          new TableIndex({
            name: 'IDX_forum_threads_author_id',
            columnNames: ['authorId'],
          }),
          new TableIndex({
            name: 'IDX_forum_threads_status',
            columnNames: ['status'],
          }),
          new TableIndex({
            name: 'IDX_forum_threads_is_pinned',
            columnNames: ['isPinned'],
          }),
          new TableIndex({
            name: 'IDX_forum_threads_is_featured',
            columnNames: ['isFeatured'],
          }),
          new TableIndex({
            name: 'IDX_forum_threads_is_locked',
            columnNames: ['isLocked'],
          }),
          new TableIndex({
            name: 'IDX_forum_threads_last_activity_at',
            columnNames: ['lastActivityAt'],
          }),
        ],
      }),
    );

    // Create forum_posts table
    await queryRunner.createTable(
      new Table({
        name: 'forum_posts',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid()',
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
            name: 'createdBy',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'updatedBy',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'threadId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'authorId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'parentId',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'content',
            type: 'text',
          },
          {
            name: 'contentHtml',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['thread', 'reply', 'question', 'answer', 'comment'],
            default: "'reply'",
          },
          {
            name: 'status',
            type: 'enum',
            enum: [
              'draft',
              'published',
              'pending_approval',
              'approved',
              'rejected',
              'hidden',
              'locked',
              'archived',
            ],
            default: "'published'",
          },
          {
            name: 'isAccepted',
            type: 'boolean',
            default: false,
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
            name: 'editedBy',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'editReason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'upvoteCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'downvoteCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'score',
            type: 'int',
            default: 0,
          },
          {
            name: 'helpfulCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'replyCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'isReported',
            type: 'boolean',
            default: false,
          },
          {
            name: 'reportCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'mentions',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
        ],
        indices: [
          new TableIndex({
            name: 'IDX_forum_posts_thread_id',
            columnNames: ['threadId'],
          }),
          new TableIndex({
            name: 'IDX_forum_posts_author_id',
            columnNames: ['authorId'],
          }),
          new TableIndex({
            name: 'IDX_forum_posts_type',
            columnNames: ['type'],
          }),
          new TableIndex({
            name: 'IDX_forum_posts_status',
            columnNames: ['status'],
          }),
          new TableIndex({
            name: 'IDX_forum_posts_parent_id',
            columnNames: ['parentId'],
          }),
          new TableIndex({
            name: 'IDX_forum_posts_created_at',
            columnNames: ['createdAt'],
          }),
          new TableIndex({
            name: 'IDX_forum_posts_is_accepted',
            columnNames: ['isAccepted'],
          }),
        ],
      }),
    );

    // Create forum_post_votes table
    await queryRunner.createTable(
      new Table({
        name: 'forum_post_votes',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid()',
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
            name: 'createdBy',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'updatedBy',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'postId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'userId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'voteType',
            type: 'enum',
            enum: ['upvote', 'downvote', 'helpful', 'not_helpful', 'agree', 'disagree'],
          },
          {
            name: 'value',
            type: 'int',
            default: 0,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
        ],
        indices: [
          new TableIndex({
            name: 'IDX_forum_post_votes_post_user',
            columnNames: ['postId', 'userId'],
            isUnique: true,
          }),
          new TableIndex({
            name: 'IDX_forum_post_votes_post_id',
            columnNames: ['postId'],
          }),
          new TableIndex({
            name: 'IDX_forum_post_votes_user_id',
            columnNames: ['userId'],
          }),
          new TableIndex({
            name: 'IDX_forum_post_votes_vote_type',
            columnNames: ['voteType'],
          }),
        ],
      }),
    );

    // Create forum_tags table
    await queryRunner.createTable(
      new Table({
        name: 'forum_tags',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid()',
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
            name: 'createdBy',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'updatedBy',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isUnique: true,
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '100',
            isUnique: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'color',
            type: 'varchar',
            length: '20',
            default: "'#6B7280'",
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'isFeatured',
            type: 'boolean',
            default: false,
          },
          {
            name: 'usageCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
        ],
        indices: [
          new TableIndex({
            name: 'IDX_forum_tags_name',
            columnNames: ['name'],
            isUnique: true,
          }),
          new TableIndex({
            name: 'IDX_forum_tags_slug',
            columnNames: ['slug'],
          }),
          new TableIndex({
            name: 'IDX_forum_tags_is_active',
            columnNames: ['isActive'],
          }),
        ],
      }),
    );

    // Create forum_thread_tags table
    await queryRunner.createTable(
      new Table({
        name: 'forum_thread_tags',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid()',
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
            name: 'createdBy',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'updatedBy',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'threadId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'tagId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'addedBy',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
        ],
        indices: [
          new TableIndex({
            name: 'IDX_forum_thread_tags_thread_tag',
            columnNames: ['threadId', 'tagId'],
            isUnique: true,
          }),
          new TableIndex({
            name: 'IDX_forum_thread_tags_thread_id',
            columnNames: ['threadId'],
          }),
          new TableIndex({
            name: 'IDX_forum_thread_tags_tag_id',
            columnNames: ['tagId'],
          }),
        ],
      }),
    );

    // Create forum_user_reputations table
    await queryRunner.createTable(
      new Table({
        name: 'forum_user_reputations',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid()',
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
            name: 'createdBy',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'updatedBy',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'userId',
            type: 'varchar',
            length: '36',
            isUnique: true,
          },
          {
            name: 'score',
            type: 'int',
            default: 0,
          },
          {
            name: 'rank',
            type: 'int',
            default: 0,
          },
          {
            name: 'totalPosts',
            type: 'int',
            default: 0,
          },
          {
            name: 'totalThreads',
            type: 'int',
            default: 0,
          },
          {
            name: 'totalUpvotes',
            type: 'int',
            default: 0,
          },
          {
            name: 'totalDownvotes',
            type: 'int',
            default: 0,
          },
          {
            name: 'totalAcceptedAnswers',
            type: 'int',
            default: 0,
          },
          {
            name: 'totalHelpfulVotes',
            type: 'int',
            default: 0,
          },
          {
            name: 'bestAnswerStreak',
            type: 'int',
            default: 0,
          },
          {
            name: 'currentAnswerStreak',
            type: 'int',
            default: 0,
          },
          {
            name: 'lastActivityDate',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'todayPoints',
            type: 'int',
            default: 0,
          },
          {
            name: 'weekPoints',
            type: 'int',
            default: 0,
          },
          {
            name: 'monthPoints',
            type: 'int',
            default: 0,
          },
          {
            name: 'history',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'badges',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
        ],
        indices: [
          new TableIndex({
            name: 'IDX_forum_user_reputations_user_id',
            columnNames: ['userId'],
            isUnique: true,
          }),
          new TableIndex({
            name: 'IDX_forum_user_reputations_score',
            columnNames: ['score'],
          }),
          new TableIndex({
            name: 'IDX_forum_user_reputations_rank',
            columnNames: ['rank'],
          }),
        ],
      }),
    );

    // Add remaining tables...
    // Continue with forum_reputation_history, forum_post_attachments, etc.

    // Add foreign key constraints
    await queryRunner.createForeignKey(
      'forum_categories',
      new TableForeignKey({
        columnNames: ['parentId'],
        referencedTableName: 'forum_categories',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'forum_threads',
      new TableForeignKey({
        columnNames: ['authorId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'forum_threads',
      new TableForeignKey({
        columnNames: ['categoryId'],
        referencedTableName: 'forum_categories',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'forum_posts',
      new TableForeignKey({
        columnNames: ['threadId'],
        referencedTableName: 'forum_threads',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'forum_posts',
      new TableForeignKey({
        columnNames: ['authorId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'forum_posts',
      new TableForeignKey({
        columnNames: ['parentId'],
        referencedTableName: 'forum_posts',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'forum_post_votes',
      new TableForeignKey({
        columnNames: ['postId'],
        referencedTableName: 'forum_posts',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'forum_post_votes',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'forum_thread_tags',
      new TableForeignKey({
        columnNames: ['threadId'],
        referencedTableName: 'forum_threads',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'forum_thread_tags',
      new TableForeignKey({
        columnNames: ['tagId'],
        referencedTableName: 'forum_tags',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'forum_user_reputations',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    const tables = [
      'forum_user_reputations',
      'forum_thread_tags',
      'forum_post_votes',
      'forum_posts',
      'forum_threads',
      'forum_categories',
    ];

    for (const tableName of tables) {
      const table = await queryRunner.getTable(tableName);
      if (table) {
        const foreignKeys = table.foreignKeys;
        for (const foreignKey of foreignKeys) {
          await queryRunner.dropForeignKey(tableName, foreignKey);
        }
      }
    }

    // Drop tables
    await queryRunner.dropTable('forum_user_reputations', true);
    await queryRunner.dropTable('forum_thread_tags', true);
    await queryRunner.dropTable('forum_tags', true);
    await queryRunner.dropTable('forum_post_votes', true);
    await queryRunner.dropTable('forum_posts', true);
    await queryRunner.dropTable('forum_threads', true);
    await queryRunner.dropTable('forum_categories', true);
  }
}
