import {
  ForumNotificationType,
  ForumPostType,
  ForumSortBy,
  ForumThreadStatus,
} from '../enums/forum.enums';

export interface ForumSearchFilters {
  categoryIds?: string[];
  tags?: string[];
  authorId?: string;
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  hasAcceptedAnswer?: boolean;
  minVotes?: number;
  maxVotes?: number;
  status?: ForumThreadStatus[];
  postType?: ForumPostType[];
}

export interface ForumSearchOptions {
  query?: string;
  filters?: ForumSearchFilters;
  sortBy?: ForumSortBy;
  page?: number;
  limit?: number;
}

export interface ForumReputationChange {
  userId: string;
  points: number;
  reason: string;
  relatedPostId?: string;
  relatedUserId?: string;
  multiplier?: number;
}

export interface ForumModerationAction {
  action: string;
  reason: string;
  moderatorId: string;
  targetType: 'post' | 'thread' | 'user';
  targetId: string;
  duration?: number;
  additionalInfo?: Record<string, any>;
}

export interface ForumNotificationData {
  type: ForumNotificationType;
  recipientId: string;
  actorId: string;
  resourceType: 'post' | 'thread' | 'user';
  resourceId: string;
  title: string;
  message: string;
  url: string;
  metadata?: Record<string, any>;
}

export interface ForumStatistics {
  totalPosts: number;
  totalThreads: number;
  totalUsers: number;
  totalCategories: number;
  postsToday: number;
  threadsToday: number;
  activeUsers: number;
  topContributors: Array<{
    userId: string;
    username: string;
    postCount: number;
    reputation: number;
  }>;
  popularTags: Array<{
    name: string;
    count: number;
  }>;
  categoryStats: Array<{
    categoryId: string;
    name: string;
    threadCount: number;
    postCount: number;
    lastActivity: Date;
  }>;
}
