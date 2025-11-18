// src/types/social.types.ts
// Type definitions for social features

export type PostStatus = 'draft' | 'published' | 'archived' | 'removed';

export type ModerationStatus = 'pending' | 'approved' | 'rejected';

export interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  website: string | null;
  posts_count: number;
  followers_count: number;
  following_count: number;
  is_private: boolean;
  is_verified: boolean;
  is_banned: boolean;
  ban_reason: string | null;
  banned_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  place_id: string;
  caption: string | null;
  status: PostStatus;
  is_moderated: boolean;
  moderation_status: ModerationStatus | null;
  moderation_reason: string | null;
  created_at: string;
  updated_at: string;
  published_at: string;
}

export interface PostImage {
  id: string;
  post_id: string;
  thumbnail_url: string;
  main_url: string;
  blurhash: string | null;
  width: number | null;
  height: number | null;
  order_index: number;
  is_moderated: boolean;
  moderation_labels: Record<string, unknown> | null;
  created_at: string;
}

export interface PostLike {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  text: string;
  parent_id: string | null;
  is_deleted: boolean;
  is_hidden: boolean;
  is_moderated: boolean;
  moderation_status: ModerationStatus | null;
  created_at: string;
  updated_at: string;
}

export interface CommentLike {
  id: string;
  comment_id: string;
  user_id: string;
  created_at: string;
}

export interface UserFollow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface PostSave {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'inappropriate'
  | 'violence'
  | 'false_info'
  | 'other';

export type ReportStatus = 'pending' | 'reviewed' | 'actioned' | 'dismissed';

export interface PostReport {
  id: string;
  post_id: string;
  reporter_id: string;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

// Extended types for UI

export interface PostWithDetails extends Post {
  user: UserProfile;
  images: PostImage[];
  place: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
  };
  likes_count: number;
  comments_count: number;
  user_has_liked: boolean;
  user_has_saved: boolean;
}

export interface CommentWithUser extends Comment {
  user: UserProfile;
  likes_count: number;
  user_has_liked: boolean;
}

export interface FeedPost {
  post_id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  place_id: string;
  caption: string | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
  user_has_liked: boolean;
}

// API Response types

export interface CreatePostInput {
  place_id: string;
  caption?: string;
  images: {
    thumbnail_url: string;
    main_url: string;
    blurhash?: string;
    width?: number;
    height?: number;
    order_index: number;
  }[];
}

export interface UpdateProfileInput {
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  website?: string;
}

export interface CreateCommentInput {
  post_id: string;
  text: string;
  parent_id?: string;
}

// Pagination

export interface PaginationParams {
  limit?: number;
  offset?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}
