import React, { useCallback, useState, useEffect } from 'react';

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';

import { useRouter } from 'expo-router';

import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { FeedPost } from '@/components/social';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { getCurrentUser } from '@/lib/userUtils';
import type { PostWithDetails } from '@/types/social.types';

const PAGE_SIZE = 10;

export const SocialFeedScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();

  const [posts, setPosts] = useState<PostWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const loadPosts = useCallback(async (pageNumber: number, isRefreshing = false) => {
    try {
      if (!isRefreshing && pageNumber === 0) {
        setLoading(true);
      }

      const user = await getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const offset = pageNumber * PAGE_SIZE;

      // Usar la función SQL optimizada
      const { data: feedData, error: fetchError } = await supabase.rpc('get_user_feed', {
        p_user_id: user.id,
        p_limit: PAGE_SIZE,
        p_offset: offset,
      });

      if (fetchError) throw fetchError;

      // Obtener imágenes de los posts
      const postIds = (feedData || []).map((post: any) => post.id);
      const { data: imagesData, error: imagesError } = await supabase
        .from('post_images')
        .select('*')
        .in('post_id', postIds)
        .order('order_index', { ascending: true });

      if (imagesError) throw imagesError;

      // Mapear imágenes a posts
      const postsWithImages: PostWithDetails[] = (feedData || []).map((post: any) => ({
        id: post.id,
        user_id: post.user_id,
        place_id: post.place_id,
        caption: post.caption,
        status: post.status,
        is_moderated: true,
        moderation_status: 'approved' as const,
        moderation_reason: null,
        created_at: post.created_at,
        updated_at: post.updated_at,
        published_at: post.published_at,
        user: {
          id: post.user_id,
          username: post.username,
          display_name: post.display_name,
          bio: null,
          avatar_url: post.avatar_url,
          website: null,
          posts_count: 0,
          followers_count: 0,
          following_count: 0,
          is_private: false,
          is_verified: post.is_verified,
          is_banned: false,
          ban_reason: null,
          banned_at: null,
          created_at: post.created_at,
          updated_at: post.updated_at,
        },
        images: (imagesData || [])
          .filter((img: any) => img.post_id === post.id)
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
          id: post.place_id,
          name: post.place_name,
          latitude: post.place_latitude,
          longitude: post.place_longitude,
        },
        likes_count: Number(post.likes_count),
        comments_count: Number(post.comments_count),
        user_has_liked: post.user_has_liked,
        user_has_saved: post.user_has_saved,
      }));

      if (isRefreshing) {
        setPosts(postsWithImages);
        setPage(0);
      } else if (pageNumber === 0) {
        setPosts(postsWithImages);
      } else {
        setPosts((prev) => [...prev, ...postsWithImages]);
      }

      setHasMore(postsWithImages.length === PAGE_SIZE);
      setError(null);
    } catch (err) {
      console.error('Error loading posts:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadPosts(0);
  }, [loadPosts]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPosts(0, true);
  }, [loadPosts]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && !loading && hasMore) {
      setLoadingMore(true);
      const nextPage = page + 1;
      setPage(nextPage);
      loadPosts(nextPage);
    }
  }, [loadingMore, loading, hasMore, page, loadPosts]);

  const handleLike = useCallback(
    async (postId: string) => {
      try {
        const user = await getCurrentUser();
        if (!user) return;

        const post = posts.find((p) => p.id === postId);
        if (!post) return;

        const optimisticPosts = posts.map((p) =>
          p.id === postId
            ? {
                ...p,
                user_has_liked: !p.user_has_liked,
                likes_count: p.user_has_liked ? p.likes_count - 1 : p.likes_count + 1,
              }
            : p
        );
        setPosts(optimisticPosts);

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
        await loadPosts(0, true);
      }
    },
    [posts, loadPosts]
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

        const post = posts.find((p) => p.id === postId);
        if (!post) return;

        const optimisticPosts = posts.map((p) =>
          p.id === postId ? { ...p, user_has_saved: !p.user_has_saved } : p
        );
        setPosts(optimisticPosts);

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
        await loadPosts(0, true);
      }
    },
    [posts, loadPosts]
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

  const renderError = useCallback(() => {
    if (!error) return null;

    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.social.error} />
        <Text style={[styles.errorTitle, { color: colors.text }]}>{t('common.error')}</Text>
        <Text style={[styles.errorMessage, { color: colors.textMuted }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.social.primary }]}
          onPress={() => loadPosts(0)}
        >
          <Text style={styles.retryButtonText}>{t('home.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }, [error, colors, t, loadPosts]);

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.social.primary} />
      </View>
    );
  }, [loadingMore, colors]);

  if (loading && posts.length === 0) {
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

  if (error && posts.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {renderError()}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.social.primary}
            colors={[colors.social.primary]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        updateCellsBatchingPeriod={50}
        windowSize={10}
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.social.primary }]}
        onPress={handleCreatePost}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
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
    color: '#FFFFFF',
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
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
