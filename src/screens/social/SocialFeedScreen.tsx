import React, { useCallback, useState, useEffect } from 'react';

import {
  View,
  Text,
  StyleSheet,
  SectionList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';

import { useRouter } from 'expo-router';

import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { FeedPost } from '@/components/social';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { getCurrentUser } from '@/lib/userUtils';
import type { PostWithDetails } from '@/types/social.types';

const MY_POSTS_LIMIT = 3;
const SOCIAL_POSTS_LIMIT = 5;
const TOTAL_FEED_LIMIT = 8;
const WHITE_COLOR = '#FFFFFF';

interface FeedSection {
  title: string;
  data: PostWithDetails[];
  showViewAll?: boolean;
}

export const SocialFeedScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();

  const [sections, setSections] = useState<FeedSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mapPostData = (postData: any, imagesData: any[]) => {
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
      updated_at: postData.created_at,
      published_at: postData.created_at,
      user: {
        id: postData.user_id,
        username: postData.username,
        display_name: postData.display_name,
        bio: null,
        avatar_url: postData.avatar_url,
        website: null,
        posts_count: 0,
        followers_count: 0,
        following_count: 0,
        is_private: false,
        is_verified: false,
        is_banned: false,
        ban_reason: null,
        banned_at: null,
        created_at: postData.created_at,
        updated_at: postData.created_at,
      },
      images: (imagesData || [])
        .filter((img: { post_id: string }) => img.post_id === postData.post_id)
        .map((img: any) => ({
          id: img.id,
          post_id: img.post_id,
          thumbnail_url: img.thumbnail_url,
          main_url: img.main_url,
          blurhash: img.blurhash,
          width: img.width,
          height: img.height,
          order_index: img.order_index,
          is_moderated: img.is_moderated,
          moderation_labels: img.moderation_labels,
          created_at: img.created_at,
        })),
      place: {
        id: postData.place_id,
        name: postData.place_name,
        latitude: null,
        longitude: null,
      },
      likes_count: Number(postData.likes_count),
      comments_count: Number(postData.comments_count),
      user_has_liked: postData.user_has_liked,
      user_has_saved: false,
    };
  };

  const loadPosts = useCallback(async (isRefreshing = false) => {
    try {
      if (!isRefreshing) {
        setLoading(true);
      }

      const user = await getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Cargar MIS POST (primeros 3)
      const { data: myPostsData, error: myPostsError } = await supabase.rpc('get_my_posts', {
        p_user_id: user.id,
        p_limit: MY_POSTS_LIMIT,
        p_offset: 0,
      });

      if (myPostsError) throw myPostsError;

      // Cargar GOVELING SOCIAL (posts dinámicos)
      const remainingSlots = TOTAL_FEED_LIMIT - (myPostsData?.length || 0);
      const { data: socialPostsData, error: socialPostsError } = await supabase.rpc(
        'get_dynamic_social_feed',
        {
          p_user_id: user.id,
          p_limit: Math.max(remainingSlots, SOCIAL_POSTS_LIMIT),
          p_offset: 0,
        }
      );

      if (socialPostsError) throw socialPostsError;

      // Obtener imágenes de todos los posts
      const allPostIds = [
        ...(myPostsData || []).map((p: { post_id: string }) => p.post_id),
        ...(socialPostsData || []).map((p: { post_id: string }) => p.post_id),
      ];

      const { data: imagesData, error: imagesError } = await supabase
        .from('post_images')
        .select('*')
        .in('post_id', allPostIds)
        .order('order_index', { ascending: true });

      if (imagesError) throw imagesError;

      // Mapear posts a estructura completa
      const myPosts: PostWithDetails[] = (myPostsData || [])
        .map((post: any) => mapPostData(post, imagesData))
        .filter((post: PostWithDetails) => post.images.length > 0);

      const socialPosts: PostWithDetails[] = (socialPostsData || [])
        .map((post: any) => mapPostData(post, imagesData))
        .filter(
          (post: PostWithDetails) =>
            post.images.length > 0 && !myPosts.find((mp) => mp.id === post.id)
        )
        .slice(0, TOTAL_FEED_LIMIT - myPosts.length);

      // Crear secciones
      const newSections: FeedSection[] = [];

      console.log('Feed Debug:', {
        myPostsCount: myPosts.length,
        socialPostsCount: socialPosts.length,
        myPostsDataLength: myPostsData?.length || 0,
        socialPostsDataLength: socialPostsData?.length || 0,
      });

      if (myPosts.length > 0) {
        newSections.push({
          title: 'MY_POSTS',
          data: myPosts,
          showViewAll: true,
        });
      }

      if (socialPosts.length > 0) {
        newSections.push({
          title: 'GOVELING_SOCIAL',
          data: socialPosts,
          showViewAll: false,
        });
      }

      console.log(
        'Sections created:',
        newSections.length,
        newSections.map((s) => s.title)
      );

      setSections(newSections);
      setError(null);
    } catch (err) {
      console.error('Error loading posts:', err);
      console.error('Error details:', JSON.stringify(err, null, 2));
      if (err && typeof err === 'object') {
        console.error('Error code:', (err as any).code);
        console.error('Error message:', (err as any).message);
        console.error('Error details:', (err as any).details);
        console.error('Error hint:', (err as any).hint);
      }
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPosts(true);
  }, [loadPosts]);

  const handleLike = useCallback(
    async (postId: string) => {
      try {
        const user = await getCurrentUser();
        if (!user) return;

        // Actualizar optimistamente
        const updatedSections = sections.map((section) => ({
          ...section,
          data: section.data.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  user_has_liked: !p.user_has_liked,
                  likes_count: p.user_has_liked ? p.likes_count - 1 : p.likes_count + 1,
                }
              : p
          ),
        }));
        setSections(updatedSections);

        // Encontrar el post
        const post = sections.flatMap((s) => s.data).find((p) => p.id === postId);
        if (!post) return;

        if (post.user_has_liked) {
          const { error: deleteError } = await supabase
            .from('post_likes')
            .delete()
            .eq('post_id', postId)
            .eq('user_id', user.id);

          if (deleteError) throw deleteError;
        } else {
          const { error: insertError } = await supabase
            .from('post_likes')
            .insert({ post_id: postId, user_id: user.id });

          if (insertError) throw insertError;
        }
      } catch (err) {
        console.error('Error toggling like:', err);
        await loadPosts(true);
      }
    },
    [sections, loadPosts]
  );

  const handleComment = useCallback((postId: string) => {
    console.log('Comment on post:', postId);
  }, []);

  const handleShare = useCallback((postId: string) => {
    console.log('Share post:', postId);
  }, []);

  const handleSave = useCallback(
    async (postId: string) => {
      try {
        const user = await getCurrentUser();
        if (!user) return;

        // Actualizar optimistamente
        const updatedSections = sections.map((section) => ({
          ...section,
          data: section.data.map((p) =>
            p.id === postId ? { ...p, user_has_saved: !p.user_has_saved } : p
          ),
        }));
        setSections(updatedSections);

        // Encontrar el post
        const post = sections.flatMap((s) => s.data).find((p) => p.id === postId);
        if (!post) return;

        if (post.user_has_saved) {
          const { error: deleteError } = await supabase
            .from('post_saves')
            .delete()
            .eq('post_id', postId)
            .eq('user_id', user.id);

          if (deleteError) throw deleteError;
        } else {
          const { error: insertError } = await supabase
            .from('post_saves')
            .insert({ post_id: postId, user_id: user.id });

          if (insertError) throw insertError;
        }
      } catch (err) {
        console.error('Error toggling save:', err);
        await loadPosts(true);
      }
    },
    [sections, loadPosts]
  );

  const handleUserPress = useCallback((userId: string) => {
    console.log('Navigate to user profile:', userId);
  }, []);

  const handlePlacePress = useCallback((placeId: string) => {
    console.log('Navigate to place:', placeId);
  }, []);

  const handleImagePress = useCallback((postId: string, index: number) => {
    console.log('Open image viewer:', postId, index);
  }, []);

  const handleCreatePost = useCallback(() => {
    router.push('/create-post');
  }, [router]);

  const renderPost = useCallback(
    ({ item }: { item: PostWithDetails }) => (
      <FeedPost
        post={item}
        onLike={handleLike}
        onComment={handleComment}
        onShare={handleShare}
        onSave={handleSave}
        onUserPress={handleUserPress}
        onPlacePress={handlePlacePress}
        onImagePress={handleImagePress}
      />
    ),
    [
      handleLike,
      handleComment,
      handleShare,
      handleSave,
      handleUserPress,
      handlePlacePress,
      handleImagePress,
    ]
  );

  const renderEmpty = useCallback(() => {
    if (loading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="images-outline" size={64} color={colors.textMuted} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          {t('social.empty_feed_title')}
        </Text>
        <Text style={[styles.emptyMessage, { color: colors.textMuted }]}>
          {t('social.empty_feed_message')}
        </Text>
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: colors.social.primary }]}
          onPress={handleCreatePost}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.createButtonText}>{t('social.create_post')}</Text>
        </TouchableOpacity>
      </View>
    );
  }, [loading, colors, t, handleCreatePost]);

  const handleViewAllMyPosts = useCallback(() => {
    router.push('/my-posts');
  }, [router]);

  const renderSectionHeader = useCallback(
    ({ section }: { section: FeedSection }) => {
      if (section.title === 'MY_POSTS') {
        return (
          <View style={[styles.myPostsHeader, { backgroundColor: colors.background }]}>
            <Text style={[styles.myPostsTitle, { color: colors.text }]}>MIS POST</Text>
            {section.showViewAll && (
              <TouchableOpacity
                style={[styles.viewAllButton, { backgroundColor: colors.social.primary }]}
                onPress={handleViewAllMyPosts}
                activeOpacity={0.8}
              >
                <Text style={styles.viewAllButtonText}>Ver todos mis post</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      }

      if (section.title === 'GOVELING_SOCIAL') {
        return (
          <View style={[styles.govelingHeader, { backgroundColor: colors.background }]}>
            <Text style={[styles.govelingTitle, { color: colors.text }]}>GOVELING SOCIAL</Text>
          </View>
        );
      }

      return null;
    },
    [colors, handleViewAllMyPosts]
  );

  const renderError = useCallback(() => {
    if (!error) return null;

    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.social.error} />
        <Text style={[styles.errorTitle, { color: colors.text }]}>{t('common.error')}</Text>
        <Text style={[styles.errorMessage, { color: colors.textMuted }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.social.primary }]}
          onPress={() => loadPosts()}
        >
          <Text style={styles.retryButtonText}>{t('home.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }, [error, colors, t, loadPosts]);

  if (loading && sections.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.social.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            {t('social.loading')}
          </Text>
        </View>
      </View>
    );
  }

  if (error && sections.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {renderError()}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SectionList
        sections={sections}
        renderItem={renderPost}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.social.primary}
            colors={[colors.social.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        updateCellsBatchingPeriod={50}
        windowSize={10}
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.social.primary }]}
        onPress={handleCreatePost}
      >
        <Ionicons name="add" size={28} color={colors.background} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  createButtonText: {
    color: WHITE_COLOR,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 100,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryButtonText: {
    color: WHITE_COLOR,
    fontSize: 16,
    fontWeight: '600',
  },
  myPostsHeader: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  myPostsTitle: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 16,
    textAlign: 'center',
  },
  viewAllButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    marginBottom: 8,
  },
  viewAllButtonText: {
    color: WHITE_COLOR,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  govelingHeader: {
    paddingTop: 32,
    paddingBottom: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  govelingTitle: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
