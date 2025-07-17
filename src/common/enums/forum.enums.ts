export enum ForumPermission {
  VIEW_FORUM = 'view_forum',
  CREATE_THREAD = 'create_thread',
  REPLY_THREAD = 'reply_thread',
  EDIT_OWN_POST = 'edit_own_post',
  DELETE_OWN_POST = 'delete_own_post',
  MODERATE_POSTS = 'moderate_posts',
  MODERATE_USERS = 'moderate_users',
  STICKY_POSTS = 'sticky_posts',
  LOCK_THREADS = 'lock_threads',
  MOVE_THREADS = 'move_threads',
  DELETE_ANY_POST = 'delete_any_post',
  EDIT_ANY_POST = 'edit_any_post',
  BAN_USERS = 'ban_users',
  VIEW_REPORTS = 'view_reports',
  MANAGE_CATEGORIES = 'manage_categories',
}

export enum ForumPostType {
  THREAD = 'thread',
  REPLY = 'reply',
  QUESTION = 'question',
  ANSWER = 'answer',
  COMMENT = 'comment',
}

export enum ForumPostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  HIDDEN = 'hidden',
  LOCKED = 'locked',
  ARCHIVED = 'archived',
}

export enum ForumThreadStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  LOCKED = 'locked',
  RESOLVED = 'resolved',
  PINNED = 'pinned',
  FEATURED = 'featured',
  ARCHIVED = 'archived',
}

export enum ForumReportReason {
  SPAM = 'spam',
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  HARASSMENT = 'harassment',
  COPYRIGHT_VIOLATION = 'copyright_violation',
  MISINFORMATION = 'misinformation',
  OFF_TOPIC = 'off_topic',
  DUPLICATE = 'duplicate',
  TECHNICAL_ISSUE = 'technical_issue',
  OTHER = 'other',
}

export enum ForumVoteType {
  UPVOTE = 'upvote',
  DOWNVOTE = 'downvote',
  HELPFUL = 'helpful',
  NOT_HELPFUL = 'not_helpful',
  AGREE = 'agree',
  DISAGREE = 'disagree',
}

export enum ForumNotificationType {
  NEW_REPLY = 'new_reply',
  THREAD_LOCKED = 'thread_locked',
  POST_MENTIONED = 'post_mentioned',
  ANSWER_ACCEPTED = 'answer_accepted',
  REPUTATION_GAINED = 'reputation_gained',
  MODERATION_ACTION = 'moderation_action',
  EXPERT_INVITED = 'expert_invited',
}

export enum ForumUserRole {
  GUEST = 'guest',
  MEMBER = 'member',
  CONTRIBUTOR = 'contributor',
  EXPERT = 'expert',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
}

export enum ForumBadgeType {
  PARTICIPATION = 'participation',
  QUALITY = 'quality',
  HELPING = 'helping',
  EXPERTISE = 'expertise',
  MODERATION = 'moderation',
  SPECIAL = 'special',
}

export enum ForumSearchType {
  POSTS = 'posts',
  THREADS = 'threads',
  USERS = 'users',
  CATEGORIES = 'categories',
  TAGS = 'tags',
}

export enum ForumSortBy {
  NEWEST = 'newest',
  OLDEST = 'oldest',
  MOST_REPLIES = 'most_replies',
  MOST_VOTES = 'most_votes',
  MOST_VIEWS = 'most_views',
  LAST_ACTIVITY = 'last_activity',
  RELEVANCE = 'relevance',
}
