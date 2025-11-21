import { supabase } from '@/lib/supabase';

import { ModerationService } from './moderationService';

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export const CommentService = {
  async getComments(postId: string): Promise<{ success: boolean; comments: Comment[] }> {
    try {
      const { data, error } = await supabase.rpc('get_post_comments', { p_post_id: postId });

      if (error) throw error;

      return { success: true, comments: data || [] };
    } catch (error) {
      console.error('Error fetching comments:', error);
      return { success: false, comments: [] };
    }
  },

  async addComment(
    postId: string,
    content: string
  ): Promise<{ success: boolean; comment?: Comment; error?: string }> {
    try {
      // Moderar el contenido antes de enviarlo
      const moderationResult = await ModerationService.moderateContent({
        content_type: 'comment',
        text: content,
        user_id: (await supabase.auth.getUser()).data.user?.id || '',
      });

      if (!moderationResult.approved) {
        return {
          success: false,
          error: moderationResult.reason || 'inappropriate_content',
        };
      }

      const { data, error } = await supabase.rpc('add_comment', {
        p_post_id: postId,
        p_content: content.trim(),
      });

      if (error) throw error;

      if (data && data.length > 0) {
        return { success: true, comment: data[0] };
      }

      return { success: false, error: 'failed_to_create' };
    } catch (error) {
      console.error('Error adding comment:', error);
      const errorMessage = error instanceof Error ? error.message : 'unknown_error';
      return { success: false, error: errorMessage };
    }
  },

  async deleteComment(commentId: string): Promise<{ success: boolean }> {
    try {
      const { data, error } = await supabase.rpc('delete_comment', {
        p_comment_id: commentId,
      });

      if (error) throw error;

      return { success: data === true };
    } catch (error) {
      console.error('Error deleting comment:', error);
      return { success: false };
    }
  },
};
