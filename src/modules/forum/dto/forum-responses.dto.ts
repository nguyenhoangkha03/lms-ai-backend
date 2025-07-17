import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ForumPostType, ForumThreadStatus, ForumVoteType } from '@/common/enums/forum.enums';
import { ForumThreadTag } from '../entities/forum-thread-tag.entity';

export class ForumCategoryResponseDto {
  @ApiProperty({ description: 'Category ID' })
  id: string;

  @ApiProperty({ description: 'Category name' })
  name: string;

  @ApiProperty({ description: 'Category slug' })
  slug: string;

  @ApiPropertyOptional({ description: 'Category description' })
  description?: string;

  @ApiPropertyOptional({ description: 'Parent category ID' })
  parentId?: string;

  @ApiPropertyOptional({ description: 'Category icon URL' })
  iconUrl?: string;

  @ApiPropertyOptional({ description: 'Category banner URL' })
  bannerUrl?: string;

  @ApiProperty({ description: 'Category color' })
  color: string;

  @ApiProperty({ description: 'Order index' })
  orderIndex: number;

  @ApiProperty({ description: 'Is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Is featured' })
  isFeatured: boolean;

  @ApiProperty({ description: 'Is private' })
  isPrivate: boolean;

  @ApiProperty({ description: 'Thread count' })
  threadCount: number;

  @ApiProperty({ description: 'Post count' })
  postCount: number;

  @ApiPropertyOptional({ description: 'Last activity timestamp' })
  lastActivityAt?: Date;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Child categories' })
  children?: ForumCategoryResponseDto[];
}

export class ForumPostResponseDto {
  @ApiProperty({ description: 'Post ID' })
  id: string;

  @ApiProperty({ description: 'Thread ID' })
  threadId: string;

  @ApiProperty({ description: 'Author ID' })
  authorId: string;

  @ApiPropertyOptional({ description: 'Parent post ID' })
  parentId?: string;

  @ApiProperty({ description: 'Post content' })
  content: string;

  @ApiPropertyOptional({ description: 'Post HTML content' })
  contentHtml?: string;

  @ApiProperty({ description: 'Post type', enum: ForumPostType })
  type: ForumPostType;

  @ApiProperty({ description: 'Is accepted' })
  isAccepted: boolean;

  @ApiProperty({ description: 'Is edited' })
  isEdited: boolean;

  @ApiProperty({ description: 'Upvote count' })
  upvoteCount: number;

  @ApiProperty({ description: 'Downvote count' })
  downvoteCount: number;

  @ApiProperty({ description: 'Post score' })
  score: number;

  @ApiProperty({ description: 'Reply count' })
  replyCount: number;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Post author' })
  author?: any;

  @ApiPropertyOptional({ description: 'Parent post' })
  parent?: ForumPostResponseDto;

  @ApiPropertyOptional({ description: 'Post replies' })
  replies?: ForumPostResponseDto[];

  @ApiPropertyOptional({ description: 'User vote on this post' })
  userVote?: ForumVoteType;

  @ApiPropertyOptional({ description: 'Post attachments' })
  attachments?: any[];
}

export class ForumThreadResponseDto {
  @ApiProperty({ description: 'Thread ID' })
  id: string;

  @ApiProperty({ description: 'Thread title' })
  title: string;

  @ApiProperty({ description: 'Thread slug' })
  slug: string;

  @ApiPropertyOptional({ description: 'Thread summary' })
  summary?: string;

  @ApiProperty({ description: 'Author ID' })
  authorId: string;

  @ApiProperty({ description: 'Category ID' })
  categoryId: string;

  @ApiProperty({ description: 'Thread type', enum: ForumPostType })
  type: ForumPostType;

  @ApiProperty({ description: 'Thread status', enum: ForumThreadStatus })
  status: ForumThreadStatus;

  @ApiProperty({ description: 'Is pinned' })
  isPinned: boolean;

  @ApiProperty({ description: 'Is featured' })
  isFeatured: boolean;

  @ApiProperty({ description: 'Is locked' })
  isLocked: boolean;

  @ApiProperty({ description: 'Is resolved' })
  isResolved: boolean;

  @ApiProperty({ description: 'View count' })
  viewCount: number;

  @ApiProperty({ description: 'Reply count' })
  replyCount: number;

  @ApiProperty({ description: 'Upvote count' })
  upvoteCount: number;

  @ApiProperty({ description: 'Downvote count' })
  downvoteCount: number;

  @ApiProperty({ description: 'Thread score' })
  score: number;

  @ApiPropertyOptional({ description: 'Last activity timestamp' })
  lastActivityAt?: Date;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Thread author' })
  author?: any;

  @ApiPropertyOptional({ description: 'Thread category' })
  category?: ForumCategoryResponseDto;

  @ApiPropertyOptional({ description: 'Thread tags' })
  threadTags?: ForumThreadTag[];

  @ApiPropertyOptional({ description: 'First post content' })
  firstPost?: ForumPostResponseDto;
}

export class ForumSearchResponseDto {
  @ApiProperty({ description: 'Total result count' })
  total: number;

  @ApiProperty({ description: 'Current page' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total pages' })
  totalPages: number;

  @ApiProperty({ description: 'Search results' })
  results: any[];

  @ApiPropertyOptional({ description: 'Search suggestions' })
  suggestions?: string[];

  @ApiPropertyOptional({ description: 'Search facets' })
  facets?: Record<string, any>;
}

export class ForumStatisticsResponseDto {
  @ApiProperty({ description: 'Total posts' })
  totalPosts: number;

  @ApiProperty({ description: 'Total threads' })
  totalThreads: number;

  @ApiProperty({ description: 'Total users' })
  totalUsers: number;

  @ApiProperty({ description: 'Total categories' })
  totalCategories: number;

  @ApiProperty({ description: 'Posts today' })
  postsToday: number;

  @ApiProperty({ description: 'Threads today' })
  threadsToday: number;

  @ApiProperty({ description: 'Active users' })
  activeUsers: number;

  @ApiProperty({ description: 'Top contributors' })
  topContributors: Array<{
    userId: string;
    username: string;
    postCount: number;
    reputation: number;
  }>;

  @ApiProperty({ description: 'Popular tags' })
  popularTags: Array<{
    name: string;
    count: number;
  }>;

  @ApiProperty({ description: 'Category statistics' })
  categoryStats: Array<{
    categoryId: string;
    name: string;
    threadCount: number;
    postCount: number;
    lastActivity: Date;
  }>;
}
