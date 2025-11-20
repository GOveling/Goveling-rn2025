-- Migration: Add UPDATE policy for post_images table
-- This allows users to update (reorder) their own post images

CREATE POLICY "Users can update images for their posts"
  ON post_images FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_images.post_id
      AND posts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_images.post_id
      AND posts.user_id = auth.uid()
    )
  );

COMMENT ON POLICY "Users can update images for their posts" ON post_images IS 
  'Allows users to update images (e.g., reorder via order_index) for their own posts';
