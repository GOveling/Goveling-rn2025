import { supabase } from '@/lib/supabase';

export const SocialInteractionService = {
  async toggleLike(postId: string): Promise<{ success: boolean; isLiked: boolean }> {
    try {
      const { data, error } = await supabase.rpc('toggle_like', { p_post_id: postId });

      if (error) throw error;

      return { success: true, isLiked: data };
    } catch (error) {
      console.error('Error toggling like:', error);
      return { success: false, isLiked: false };
    }
  },

  async toggleFollow(targetUserId: string): Promise<{ success: boolean; isFollowing: boolean }> {
    try {
      const { data, error } = await supabase.rpc('toggle_follow', {
        p_target_user_id: targetUserId,
      });

      if (error) throw error;

      return { success: true, isFollowing: data };
    } catch (error) {
      console.error('Error toggling follow:', error);
      return { success: false, isFollowing: false };
    }
  },
};
