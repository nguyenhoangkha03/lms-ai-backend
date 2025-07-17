import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { CacheModule } from '@nestjs/cache-manager';

// Entities
import { ForumCategory } from './entities/forum-category.entity';
import { ForumThread } from './entities/forum-thread.entity';
import { ForumPost } from './entities/forum-post.entity';
import { ForumPostVote } from './entities/forum-post-vote.entity';
import { ForumTag } from './entities/forum-tag.entity';
import { ForumThreadTag } from './entities/forum-thread-tag.entity';
import { ForumUserReputation } from './entities/forum-user-reputation.entity';
import { ForumReputationHistory } from './entities/forum-reputation-history.entity';
import { ForumPostAttachment } from './entities/forum-post-attachment.entity';
import { ForumCategoryPermission } from './entities/forum-category-permission.entity';
import { ForumPostReport } from './entities/forum-post-report.entity';
import { ForumUserBadge } from './entities/forum-user-badge.entity';

// Controllers
import { ForumCategoryController } from './controllers/forum-category.controller';
import { ForumThreadController } from './controllers/forum-thread.controller';
import { ForumPostController } from './controllers/forum-post.controller';
import { ForumVoteController } from './controllers/forum-vote.controller';
import { ForumSearchController } from './controllers/forum-search.controller';
import { ForumModerationController } from './controllers/forum-moderation.controller';
import { ForumTagController } from './controllers/forum-tag.controller';
import { ForumStatisticsController } from './controllers/forum-statistics.controller';

// Services
import { ForumCategoryService } from './services/forum-category.service';
import { ForumThreadService } from './services/forum-thread.service';
import { ForumVoteService } from './services/forum-vote.service';
import { ForumTagService } from './services/forum-tag.service';
import { ForumReputationService } from './services/forum-reputation.service';
import { ForumPostService } from './services/forum-post.service';
import { ForumSearchService } from './services/forum-search.service';
import { ForumModerationService } from './services/forum-moderation.service';
import { ForumStatisticsService } from './services/forum-statistics.service';

// Processors
import { ForumNotificationProcessor } from './processors/forum-notification.processor';
import { ForumSearchIndexProcessor } from './processors/forum-search-index.processor';
import { ForumAnalyticsProcessor } from './processors/forum-analytics.processor';

// Guards
import { ForumPermissionGuard } from './guards/forum-permission.guard';

// External modules
import { UserModule } from '../user/user.module';
import { NotificationModule } from '../notification/notification.module';
import { FileManagementModule } from '../file-management/file-management.module';
import { AuthModule } from '../auth/auth.module';
import { CustomCacheModule } from '@/cache/cache.module';
import { WinstonModule } from '@/logger/winston.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Forum Entities
      ForumCategory,
      ForumThread,
      ForumPost,
      ForumPostVote,
      ForumTag,
      ForumThreadTag,
      ForumUserReputation,
      ForumReputationHistory,
      ForumPostAttachment,
      ForumCategoryPermission,
      ForumPostReport,
      ForumUserBadge,
    ]),
    BullModule.registerQueue(
      { name: 'forum-notification' },
      { name: 'forum-search-index' },
      { name: 'forum-analytics' },
      { name: 'forum-reputation' },
    ),
    CacheModule.register({
      ttl: 300,
    }),
    UserModule,
    NotificationModule,
    FileManagementModule,
    AuthModule,
    CustomCacheModule,
    WinstonModule,
  ],
  controllers: [
    ForumCategoryController,
    ForumThreadController,
    ForumPostController,
    ForumVoteController,
    ForumSearchController,
    ForumModerationController,
    ForumTagController,
    ForumStatisticsController,
  ],
  providers: [
    // Services
    ForumCategoryService,
    ForumThreadService,
    ForumPostService,
    ForumVoteService,
    ForumTagService,
    ForumReputationService,
    ForumSearchService,
    ForumModerationService,
    ForumStatisticsService,
    ForumSearchService,
    ForumModerationService,
    ForumStatisticsService,
    // Processors
    ForumNotificationProcessor,
    ForumSearchIndexProcessor,
    ForumAnalyticsProcessor,
    // Guards
    ForumPermissionGuard,
  ],
  exports: [
    TypeOrmModule,
    ForumCategoryService,
    ForumThreadService,
    ForumPostService,
    ForumVoteService,
    ForumTagService,
    ForumReputationService,
    ForumSearchService,
    ForumModerationService,
    ForumStatisticsService,
  ],
})
export class ForumModule {}
