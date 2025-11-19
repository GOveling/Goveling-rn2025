import React, { useCallback, useEffect, useState } from 'react';

import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { getCurrentUser } from '@/lib/userUtils';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const IMAGE_SIZE = (width - 4) / COLUMN_COUNT; // 4px total spacing (1px between each)

interface MyPost {
  post_id: string;
  caption: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  image_url: string;
}

export const MyPostsScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [posts, setPosts] = useState<MyPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const PAGE_SIZE = 30;

  const loadMyPosts = useCallback(async (pageNumber: number, isRefreshing = false) => {
    try {
      if (!isRefreshing && pageNumber === 0) {
        setLoading(true);
      } else if (pageNumber > 0) {
        setLoadingMore(true);
      }

      const user = await getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const offset = pageNumber * PAGE_SIZE;

      // Obtener posts del usuario
      const { data: postsData, error: postsError } = await supabase.rpc('get_my_posts', {
        p_user_id: user.id,
        p_limit: PAGE_SIZE,
        p_offset: offset,
      });

      if (postsError) throw postsError;

      // Obtener imágenes de los posts
      const postIds = (postsData || []).map((post: { post_id: string }) => post.post_id);
      const { data: imagesData, error: imagesError } = await supabase
        .from('post_images')
        .select('post_id, main_url')
        .in('post_id', postIds)
        .order('order_index', { ascending: true });

      if (imagesError) throw imagesError;

      // Mapear posts con su primera imagen
      const postsWithImages: MyPost[] = (postsData || [])
        .map(
          (post: {
            post_id: string;
            caption: string;
            created_at: string;
            likes_count: number;
            comments_count: number;
          }) => {
            const postImage = (imagesData || []).find(
              (img: { post_id: string; main_url: string }) => img.post_id === post.post_id
            );
            if (!postImage) return null;

            return {
              post_id: post.post_id,
              caption: post.caption,
              created_at: post.created_at,
              likes_count: post.likes_count,
              comments_count: post.comments_count,
              image_url: postImage.main_url,
            };
          }
        )
        .filter(Boolean) as MyPost[];

      if (isRefreshing) {
        setPosts(postsWithImages);
        setPage(0);
      } else if (pageNumber === 0) {
        setPosts(postsWithImages);
      } else {
        setPosts((prev) => [...prev, ...postsWithImages]);
      }

      setHasMore(postsWithImages.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error loading my posts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadMyPosts(0);
  }, [loadMyPosts]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadMyPosts(0, true);
  }, [loadMyPosts]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadMyPosts(nextPage);
    }
  }, [loadingMore, hasMore, page, loadMyPosts]);

  const handlePostPress = useCallback((postId: string) => {
    // TODO: Navigate to post detail screen
    console.log('Navigate to post:', postId);
  }, []);

  const renderGridItem = ({ item }: { item: MyPost }) => (
    <TouchableOpacity
      style={styles.gridItem}
      onPress={() => handlePostPress(item.post_id)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item.image_url }} style={styles.gridImage} />

      {/* Overlay con stats */}
      <View style={styles.overlay}>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="heart" size={16} color="#FFFFFF" />
            <Text style={styles.statText}>{item.likes_count}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="chatbubble" size={16} color="#FFFFFF" />
            <Text style={styles.statText}>{item.comments_count}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="images-outline" size={64} color={colors.textMuted} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {t('social.myPosts.empty.title')}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
        {t('social.myPosts.empty.subtitle')}
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={posts}
        renderItem={renderGridItem}
        keyExtractor={(item) => item.post_id}
        numColumns={COLUMN_COUNT}
        contentContainerStyle={styles.gridContainer}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContainer: {
    flexGrow: 1,
  },
  gridItem: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    margin: 0.5,
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    opacity: 0,
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 120,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
