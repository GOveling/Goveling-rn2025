import { supabase } from '@/lib/supabase';
import type { PostWithDetails, UserProfile } from '@/types/social.types';

export interface UserProfileData {
  profile: UserProfile;
  posts: PostWithDetails[];
  isFollowing: boolean;
}

export const UserProfileService = {
  async getUserProfile(userId: string): Promise<{
    success: boolean;
    data?: UserProfileData;
    error?: string;
  }> {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        return { success: false, error: 'Not authenticated' };
      }

      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError || !profileData) {
        return { success: false, error: profileError?.message || 'Profile not found' };
      }

      const { data: postsData, error: postsError } = await supabase.rpc('get_user_posts', {
        p_user_id: userId,
        p_limit: 50,
        p_offset: 0,
      });

      console.log('🔍 get_user_posts response:', {
        dataLength: postsData?.length,
        error: postsError,
        firstItem: postsData?.[0],
      });

      if (postsError) {
        return { success: false, error: postsError.message };
      }

      const postsMap = new Map<string, any>();
      const imagesMap = new Map<string, any[]>();

      postsData?.forEach((item: any) => {
        if (!postsMap.has(item.post_id)) {
          postsMap.set(item.post_id, item);
          imagesMap.set(item.post_id, []);
        }
        if (item.image_id) {
          imagesMap.get(item.post_id)?.push({
            id: item.image_id,
            post_id: item.post_id,
            thumbnail_url: item.thumbnail_url,
            main_url: item.main_url,
            blurhash: item.blurhash,
            width: item.width,
            height: item.height,
            order_index: item.order_index,
            is_moderated: item.image_is_moderated,
            moderation_labels: item.moderation_labels,
            created_at: item.image_created_at,
          });
        }
      });

      const posts: PostWithDetails[] = Array.from(postsMap.values()).map((postData) => {
        const images = imagesMap.get(postData.post_id) || [];
        images.sort((a, b) => a.order_index - b.order_index);

        return {
          id: postData.post_id,
          user_id: postData.user_id,
          place_id: postData.place_id,
          caption: postData.caption,
          status: 'published' as const,
          is_moderated: true,
          moderation_status: 'approved' as const,
          moderation_reason: null,
          created_at: postData.created_at,
          updated_at: postData.updated_at || postData.created_at,
          published_at: postData.created_at,
          user: {
            id: postData.user_id,
            username: postData.username,
            display_name: postData.display_name,
            bio: profileData.bio,
            avatar_url: postData.avatar_url,
            website: profileData.website,
            posts_count: profileData.posts_count,
            followers_count: profileData.followers_count,
            following_count: profileData.following_count,
            is_private: profileData.is_private,
            is_verified: profileData.is_verified,
            is_banned: profileData.is_banned,
            ban_reason: profileData.ban_reason,
            banned_at: profileData.banned_at,
            created_at: profileData.created_at,
            updated_at: profileData.updated_at,
          },
          place: {
            id: postData.place_id,
            name: postData.place_name || 'Unknown',
            latitude: postData.latitude || 0,
            longitude: postData.longitude || 0,
          },
          images,
          likes_count: postData.likes_count || 0,
          comments_count: postData.comments_count || 0,
          saves_count: postData.saves_count || 0,
          user_has_liked: postData.user_has_liked || false,
          user_has_saved: postData.user_has_saved || false,
        };
      });

      const { data: followData } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', currentUser.user.id)
        .eq('following_id', userId)
        .single();

      return {
        success: true,
        data: {
          profile: profileData as UserProfile,
          posts,
          isFollowing: !!followData,
        },
      };
    } catch (error: any) {
      console.error('Error fetching user profile:', error);
      return { success: false, error: error.message };
    }
  },
};
