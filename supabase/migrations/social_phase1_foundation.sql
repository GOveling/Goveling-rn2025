-- =====================================================
-- GOVELING SOCIAL - PHASE 1: FOUNDATION & MODERATION
-- =====================================================
-- Created: 2025-11-18
-- Description: Core tables for social features with built-in moderation

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: user_profiles
-- Extended user profiles for social features
-- =====================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  website TEXT,
  
  -- Stats (updated via triggers)
  posts_count INTEGER DEFAULT 0,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  
  -- Privacy
  is_private BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  
  -- Moderation
  is_banned BOOLEAN DEFAULT false,
  ban_reason TEXT,
  banned_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 30),
  CONSTRAINT bio_length CHECK (char_length(bio) <= 500),
  CONSTRAINT website_length CHECK (char_length(website) <= 200)
);

-- Indexes for user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON user_profiles(created_at DESC);

-- =====================================================
-- TABLE: posts
-- Main posts table
-- =====================================================
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  place_id UUID NOT NULL,
  
  -- Content
  caption TEXT,
  
  -- Stats (computed in queries, not stored)
  -- likes_count computed via COUNT
  -- comments_count computed via COUNT
  
  -- Status
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived', 'removed')),
  
  -- Moderation
  is_moderated BOOLEAN DEFAULT false,
  moderation_status TEXT CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  moderation_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT caption_length CHECK (char_length(caption) <= 2200)
);

-- Indexes for posts
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_place_id ON posts(place_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_posts_user_created ON posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_place_created ON posts(place_id, created_at DESC);

-- =====================================================
-- TABLE: post_images
-- Images for each post (1-10 images per post)
-- =====================================================
CREATE TABLE IF NOT EXISTS post_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  
  -- Image URLs
  thumbnail_url TEXT NOT NULL,
  main_url TEXT NOT NULL,
  
  -- Metadata
  blurhash TEXT,
  width INTEGER,
  height INTEGER,
  order_index INTEGER NOT NULL DEFAULT 0,
  
  -- Moderation
  is_moderated BOOLEAN DEFAULT false,
  moderation_labels JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT order_index_positive CHECK (order_index >= 0)
);

-- Indexes for post_images
CREATE INDEX IF NOT EXISTS idx_post_images_post_id ON post_images(post_id);
CREATE INDEX IF NOT EXISTS idx_post_images_order ON post_images(post_id, order_index);

-- =====================================================
-- TABLE: post_likes
-- Likes on posts
-- =====================================================
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(post_id, user_id)
);

-- Indexes for post_likes
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_created_at ON post_likes(created_at DESC);

-- =====================================================
-- TABLE: comments
-- Comments on posts
-- =====================================================
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Content
  text TEXT NOT NULL,
  
  -- Threading (for future replies feature)
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  
  -- Status
  is_deleted BOOLEAN DEFAULT false,
  is_hidden BOOLEAN DEFAULT false,
  
  -- Moderation
  is_moderated BOOLEAN DEFAULT false,
  moderation_status TEXT CHECK (moderation_status IN ('approved', 'rejected', 'pending_review')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT text_length CHECK (char_length(text) > 0 AND char_length(text) <= 500)
);

-- Indexes for comments
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id) WHERE parent_id IS NOT NULL;

-- =====================================================
-- TABLE: comment_likes
-- Likes on comments
-- =====================================================
CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(comment_id, user_id)
);

-- Indexes for comment_likes
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);

-- =====================================================
-- TABLE: user_follows
-- User follow relationships
-- =====================================================
CREATE TABLE IF NOT EXISTS user_follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

-- Indexes for user_follows
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_created_at ON user_follows(created_at DESC);

-- =====================================================
-- TABLE: post_saves
-- Saved/bookmarked posts
-- =====================================================
CREATE TABLE IF NOT EXISTS post_saves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(post_id, user_id)
);

-- Indexes for post_saves
CREATE INDEX IF NOT EXISTS idx_post_saves_user_id ON post_saves(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_saves_post_id ON post_saves(post_id);

-- =====================================================
-- TABLE: post_reports
-- User reports on posts
-- =====================================================
CREATE TABLE IF NOT EXISTS post_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'violence', 'false_info', 'other')),
  description TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(post_id, reporter_id),
  CONSTRAINT description_length CHECK (char_length(description) <= 500)
);

-- Indexes for post_reports
CREATE INDEX IF NOT EXISTS idx_post_reports_post_id ON post_reports(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reports_status ON post_reports(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_post_reports_created_at ON post_reports(created_at DESC);

-- =====================================================
-- TABLE: moderation_logs
-- Comprehensive moderation logging
-- =====================================================
CREATE TABLE IF NOT EXISTS moderation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Content info
  content_type TEXT NOT NULL CHECK (content_type IN ('post', 'comment', 'bio', 'avatar', 'username')),
  content_id UUID,
  content_text TEXT,
  image_urls TEXT[],
  
  -- Moderation result
  status TEXT NOT NULL CHECK (status IN ('approved', 'rejected', 'pending_review')),
  reason TEXT,
  
  -- Detection details
  text_violations JSONB,
  image_violations JSONB,
  confidence_score NUMERIC(5,2),
  
  -- Metadata
  auto_moderated BOOLEAN DEFAULT true,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for moderation_logs
CREATE INDEX IF NOT EXISTS idx_moderation_logs_user_id ON moderation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_status ON moderation_logs(status);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_content_type ON moderation_logs(content_type);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_created_at ON moderation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_rejected ON moderation_logs(user_id, created_at DESC) WHERE status = 'rejected';

-- =====================================================
-- UPDATE: trip_places table
-- Add columns to link posts with trips
-- =====================================================
ALTER TABLE trip_places ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE trip_places ADD COLUMN IF NOT EXISTS source_post_id UUID REFERENCES posts(id) ON DELETE SET NULL;
ALTER TABLE trip_places ADD COLUMN IF NOT EXISTS added_from_social BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_trip_places_source_post ON trip_places(source_post_id) WHERE source_post_id IS NOT NULL;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS: user_profiles
-- =====================================================
CREATE POLICY "Public profiles are viewable by everyone"
  ON user_profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- =====================================================
-- RLS: posts
-- =====================================================
CREATE POLICY "Published posts are viewable by everyone"
  ON posts FOR SELECT
  USING (status = 'published' OR user_id = auth.uid());

CREATE POLICY "Users can insert their own posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
  ON posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
  ON posts FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- RLS: post_images
-- =====================================================
CREATE POLICY "Post images are viewable with their post"
  ON post_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_images.post_id
      AND (posts.status = 'published' OR posts.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert images for their posts"
  ON post_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_images.post_id
      AND posts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete images from their posts"
  ON post_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_images.post_id
      AND posts.user_id = auth.uid()
    )
  );

-- =====================================================
-- RLS: post_likes
-- =====================================================
CREATE POLICY "Post likes are viewable by everyone"
  ON post_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like posts"
  ON post_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts"
  ON post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- RLS: comments
-- =====================================================
CREATE POLICY "Comments on published posts are viewable"
  ON comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = comments.post_id
      AND posts.status = 'published'
    )
  );

CREATE POLICY "Users can insert their own comments"
  ON comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON comments FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- RLS: comment_likes
-- =====================================================
CREATE POLICY "Comment likes are viewable by everyone"
  ON comment_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like comments"
  ON comment_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike comments"
  ON comment_likes FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- RLS: user_follows
-- =====================================================
CREATE POLICY "Follows are viewable by everyone"
  ON user_follows FOR SELECT
  USING (true);

CREATE POLICY "Users can follow others"
  ON user_follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON user_follows FOR DELETE
  USING (auth.uid() = follower_id);

-- =====================================================
-- RLS: post_saves
-- =====================================================
CREATE POLICY "Users can view their own saves"
  ON post_saves FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save posts"
  ON post_saves FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave posts"
  ON post_saves FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- RLS: post_reports
-- =====================================================
CREATE POLICY "Users can view their own reports"
  ON post_reports FOR SELECT
  USING (auth.uid() = reporter_id);

CREATE POLICY "Users can report posts"
  ON post_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- =====================================================
-- RLS: moderation_logs
-- =====================================================
CREATE POLICY "Users can view their own moderation logs"
  ON moderation_logs FOR SELECT
  USING (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update user stats on follow
CREATE OR REPLACE FUNCTION update_follow_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE user_profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    UPDATE user_profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_profiles SET followers_count = GREATEST(0, followers_count - 1) WHERE id = OLD.following_id;
    UPDATE user_profiles SET following_count = GREATEST(0, following_count - 1) WHERE id = OLD.follower_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_follow_stats_trigger
  AFTER INSERT OR DELETE ON user_follows
  FOR EACH ROW
  EXECUTE FUNCTION update_follow_stats();

-- Update posts count
CREATE OR REPLACE FUNCTION update_posts_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'published' THEN
    UPDATE user_profiles SET posts_count = posts_count + 1 WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'published' THEN
    UPDATE user_profiles SET posts_count = GREATEST(0, posts_count - 1) WHERE id = OLD.user_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'published' AND NEW.status != 'published' THEN
      UPDATE user_profiles SET posts_count = GREATEST(0, posts_count - 1) WHERE id = NEW.user_id;
    ELSIF OLD.status != 'published' AND NEW.status = 'published' THEN
      UPDATE user_profiles SET posts_count = posts_count + 1 WHERE id = NEW.user_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_posts_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_posts_count();

-- =====================================================
-- FUNCTIONS FOR FEED QUERIES
-- =====================================================

-- Get feed for a user (posts from followed users)
CREATE OR REPLACE FUNCTION get_user_feed(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  post_id UUID,
  user_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  place_id UUID,
  caption TEXT,
  created_at TIMESTAMPTZ,
  likes_count BIGINT,
  comments_count BIGINT,
  user_has_liked BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as post_id,
    p.user_id,
    up.username,
    up.display_name,
    up.avatar_url,
    p.place_id,
    p.caption,
    p.created_at,
    COUNT(DISTINCT pl.id) as likes_count,
    COUNT(DISTINCT c.id) as comments_count,
    EXISTS(
      SELECT 1 FROM post_likes 
      WHERE post_id = p.id AND user_id = p_user_id
    ) as user_has_liked
  FROM posts p
  INNER JOIN user_profiles up ON p.user_id = up.id
  LEFT JOIN post_likes pl ON p.id = pl.post_id
  LEFT JOIN comments c ON p.id = c.post_id
  WHERE p.status = 'published'
  AND (
    p.user_id IN (
      SELECT following_id FROM user_follows WHERE follower_id = p_user_id
    )
    OR p.user_id = p_user_id
  )
  GROUP BY p.id, p.user_id, up.username, up.display_name, up.avatar_url, p.place_id, p.caption, p.created_at
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Run the following to verify:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%post%' OR tablename LIKE '%comment%' OR tablename LIKE '%user_%';
