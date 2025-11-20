import React, { useCallback, useEffect, useState, useRef } from 'react';

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
  Modal,
  TextInput,
  Alert,
  ScrollView,
  Animated,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { getCurrentUser } from '@/lib/userUtils';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const IMAGE_SIZE = (width - 4) / COLUMN_COUNT;

interface PostImage {
  id: string;
  post_id: string;
  main_url: string;
  thumbnail_url: string;
  order_index: number;
}

interface MyPost {
  post_id: string;
  caption: string;
  created_at: string;
  updated_at: string;
  likes_count: number;
  comments_count: number;
  image_url: string;
  all_images?: PostImage[];
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

  // Edit modal states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<MyPost | null>(null);
  const [editedCaption, setEditedCaption] = useState('');
  const [reorderedImages, setReorderedImages] = useState<PostImage[]>([]);
  const [savingChanges, setSavingChanges] = useState(false);

  // Reorder modal states
  const [reorderModalVisible, setReorderModalVisible] = useState(false);
  const [tempReorderedImages, setTempReorderedImages] = useState<PostImage[]>([]);
  const [hasReordered, setHasReordered] = useState(false);

  // Toast notification state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastOpacity = useRef(new Animated.Value(0)).current;

  // Debug: Log when reorder modal visibility changes
  useEffect(() => {
    console.log('🔍 Reorder modal visible:', reorderModalVisible);
    console.log('📸 Temp images count:', tempReorderedImages.length);
  }, [reorderModalVisible, tempReorderedImages]);

  // Show toast with auto-dismiss and animation
  const showToast = useCallback(
    (message: string) => {
      setToastMessage(message);
      setToastVisible(true);

      // Fade in
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Auto-dismiss after 2 seconds
      setTimeout(() => {
        // Fade out
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setToastVisible(false);
        });
      }, 2000);
    },
    [toastOpacity]
  );

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
      console.log(
        '📥 Loading images for posts:',
        postIds.map((id) => id.substring(0, 8))
      );

      const { data: imagesData, error: imagesError } = await supabase
        .from('post_images')
        .select('post_id, main_url, order_index')
        .in('post_id', postIds)
        .order('post_id', { ascending: true })
        .order('order_index', { ascending: true });

      if (imagesError) throw imagesError;

      console.log(
        '📸 Images loaded:',
        imagesData?.map(
          (img) =>
            `${img.post_id.substring(0, 8)}:order_${img.order_index}:${img.main_url.substring(img.main_url.length - 15)}`
        )
      );

      // Mapear posts con su primera imagen (ordenada por order_index)
      const postsWithImages: MyPost[] = (postsData || [])
        .map(
          (post: {
            post_id: string;
            caption: string;
            created_at: string;
            likes_count: number;
            comments_count: number;
          }) => {
            // Filter all images for this post and take the first one (lowest order_index)
            const postImages = (imagesData || []).filter(
              (img: { post_id: string; main_url: string; order_index: number }) =>
                img.post_id === post.post_id
            );

            if (postImages.length === 0) return null;

            // The first image in the filtered array is the cover (already sorted by order_index)
            const coverImage = postImages[0];
            console.log(
              `🖼️ Post ${post.post_id.substring(0, 8)} cover:`,
              `order_${(coverImage as any).order_index}`,
              coverImage.main_url.substring(coverImage.main_url.length - 15)
            );

            return {
              post_id: post.post_id,
              caption: post.caption,
              created_at: post.created_at,
              likes_count: post.likes_count,
              comments_count: post.comments_count,
              image_url: coverImage.main_url,
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

  const handlePostPress = useCallback(
    async (postId: string) => {
      try {
        const post = posts.find((p) => p.post_id === postId);
        if (!post) return;

        const { data: allImages, error } = await supabase
          .from('post_images')
          .select('id, post_id, main_url, thumbnail_url, order_index')
          .eq('post_id', postId)
          .order('order_index', { ascending: true });

        if (error) throw error;

        const postWithImages = {
          ...post,
          all_images: allImages || [],
        };

        setSelectedPost(postWithImages);
        setEditedCaption(post.caption || '');
        setReorderedImages(allImages || []);
        setHasReordered(false); // Reset reorder flag when opening edit modal
        setEditModalVisible(true);
      } catch (error) {
        console.error('Error loading post details:', error);
        Alert.alert(t('common.error'), t('social.myPosts.errors.loadFailed'));
      }
    },
    [posts, t]
  );

  const handleDeletePost = useCallback(
    async (postId: string) => {
      Alert.alert(t('social.myPosts.delete.title'), t('social.myPosts.delete.message'), [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('posts').delete().eq('id', postId);

              if (error) throw error;

              setPosts((prev) => prev.filter((p) => p.post_id !== postId));
              Alert.alert(t('common.success'), t('social.myPosts.delete.success'));
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert(t('common.error'), t('social.myPosts.errors.deleteFailed'));
            }
          },
        },
      ]);
    },
    [t]
  );

  const handleSaveChanges = useCallback(async () => {
    if (!selectedPost) return;

    try {
      setSavingChanges(true);

      if (editedCaption !== selectedPost.caption) {
        const { error: captionError } = await supabase
          .from('posts')
          .update({ caption: editedCaption })
          .eq('id', selectedPost.post_id);

        if (captionError) throw captionError;
      }

      // If user used the reorder modal, save the new order
      if (hasReordered) {
        console.log('🔄 Saving reordered images to database...');

        // Update order_index for all images
        for (let i = 0; i < reorderedImages.length; i++) {
          const img = reorderedImages[i];
          console.log(
            `  - Updating ${img.id.substring(0, 8)} (${img.main_url.substring(img.main_url.length - 15)}) to order_index: ${i}`
          );
          const { data: updateData, error: reorderError } = await supabase
            .from('post_images')
            .update({ order_index: i })
            .eq('id', img.id)
            .select();

          if (reorderError) {
            console.error('  ❌ Error updating order:', reorderError);
            throw reorderError;
          }
          console.log(`  ✅ Updated ${img.id.substring(0, 8)}. Rows affected:`, updateData?.length);
        }

        // Update the post's updated_at timestamp to trigger "edited" indicator
        const { error: updatePostError } = await supabase
          .from('posts')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', selectedPost.post_id);

        if (updatePostError) {
          console.error('  ❌ Error updating post timestamp:', updatePostError);
          throw updatePostError;
        }
        console.log('✅ Post timestamp updated');

        console.log('✅ All images reordered successfully!');
        setHasReordered(false); // Reset flag after saving
      }

      // Update local state with new caption, cover image, and updated_at
      const now = new Date().toISOString();
      setPosts((prev) =>
        prev.map((p) => {
          if (p.post_id === selectedPost.post_id) {
            // The first image in reorderedImages is the new cover
            const newCoverImage = reorderedImages[0]?.main_url || p.image_url;
            console.log('📸 New cover image:', newCoverImage);
            return {
              ...p,
              caption: editedCaption,
              image_url: newCoverImage,
              all_images: reorderedImages,
              updated_at: now,
            };
          }
          return p;
        })
      );

      setEditModalVisible(false);

      // Show success toast with auto-dismiss
      showToast(t('social.myPosts.edit.success'));
    } catch (error) {
      console.error('Error saving changes:', error);
      Alert.alert(t('common.error'), t('social.myPosts.errors.saveFailed'));
    } finally {
      setSavingChanges(false);
    }
  }, [selectedPost, editedCaption, reorderedImages, hasReordered, t, showToast]);

  const renderGridItem = ({ item }: { item: MyPost }) => (
    <TouchableOpacity
      style={styles.gridItem}
      onPress={() => handlePostPress(item.post_id)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item.image_url }} style={styles.gridImage} />

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

      <TouchableOpacity
        style={[styles.editButton, { backgroundColor: colors.primary }]}
        onPress={() => handlePostPress(item.post_id)}
        hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
      >
        <Ionicons name="create-outline" size={16} color="#FFFFFF" />
      </TouchableOpacity>
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

      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => setEditModalVisible(false)}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t('social.myPosts.edit.title')}
            </Text>
            <TouchableOpacity
              onPress={handleSaveChanges}
              disabled={savingChanges}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              {savingChanges ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="checkmark" size={28} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={styles.modalContentContainer}
            showsVerticalScrollIndicator={false}
          >
            {reorderedImages.length > 0 && (
              <View style={styles.section}>
                <View style={styles.photosSectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    {reorderedImages.length === 1
                      ? t('social.myPosts.edit.photo')
                      : t('social.myPosts.edit.photos')}
                  </Text>
                  {reorderedImages.length > 1 && (
                    <TouchableOpacity
                      style={[styles.reorderButton, { backgroundColor: colors.primary }]}
                      onPress={() => {
                        console.log('🔄 Reorder button pressed!');
                        console.log('📷 Images to reorder:', reorderedImages.length);
                        setTempReorderedImages([...reorderedImages]);
                        // Close edit modal first, then open reorder modal with a small delay
                        setEditModalVisible(false);
                        setTimeout(() => {
                          setReorderModalVisible(true);
                          console.log('✅ Reorder modal opened');
                        }, 300);
                      }}
                    >
                      <Ionicons name="swap-vertical" size={16} color="#FFFFFF" />
                      <Text style={styles.reorderButtonText}>
                        {t('social.myPosts.edit.reorder')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.photoCarousel}
                >
                  {reorderedImages.map((item, index) => (
                    <View key={item.id} style={styles.carouselImageContainer}>
                      <Image
                        source={{ uri: item.thumbnail_url || item.main_url }}
                        style={styles.carouselImage}
                        resizeMode="cover"
                      />
                      <View style={styles.carouselImageNumber}>
                        <Text style={styles.carouselImageNumberText}>{index + 1}</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('social.myPosts.edit.caption')}
              </Text>
              <TextInput
                style={[
                  styles.captionInput,
                  {
                    backgroundColor: colors.card,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={editedCaption}
                onChangeText={setEditedCaption}
                placeholder={t('social.myPosts.edit.captionPlaceholder')}
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={2200}
                textAlignVertical="top"
              />
              <Text style={[styles.characterCount, { color: colors.textMuted }]}>
                {editedCaption.length}/2200
              </Text>
            </View>

            <View style={[styles.dangerZone, { borderTopColor: 'rgba(239, 68, 68, 0.2)' }]}>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => {
                  setEditModalVisible(false);
                  setTimeout(() => {
                    if (selectedPost) {
                      handleDeletePost(selectedPost.post_id);
                    }
                  }, 300);
                }}
              >
                <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
                <Text style={styles.deleteButtonText}>{t('social.myPosts.edit.deletePost')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ========== REORDER MODAL - VERSION 2.0 ========== */}
      <Modal
        visible={reorderModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setReorderModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 60 }}>
          {/* Header - FIXED SIMPLE VERSION */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              height: 44,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: colors.border,
            }}
          >
            <TouchableOpacity
              onPress={() => {
                console.log('❌ Closing reorder modal without saving');
                setHasReordered(false); // Reset flag when canceling
                setReorderModalVisible(false);
                setTimeout(() => {
                  setEditModalVisible(true);
                }, 300);
              }}
              style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}
            >
              <Ionicons name="chevron-back" size={28} color={colors.text} />
            </TouchableOpacity>
            <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>
              {t('social.myPosts.edit.reorderPhotos')}
            </Text>
            <TouchableOpacity
              onPress={() => {
                console.log('✅ Saving reordered images');
                setReorderedImages(tempReorderedImages);
                setReorderModalVisible(false);
                setTimeout(() => {
                  setEditModalVisible(true);
                }, 300);
              }}
              style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}
            >
              <Ionicons name="checkmark" size={28} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Instructions */}
          <View style={styles.reorderInstructions}>
            <Text style={[styles.reorderInstructionsText, { color: colors.textMuted }]}>
              {t('social.myPosts.edit.reorderInstructions')}
            </Text>
          </View>

          {/* Draggable List - WITH WORKING DRAG & DROP */}
          <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
            <DraggableFlatList
              data={tempReorderedImages}
              renderItem={({ item, drag, isActive, getIndex }) => {
                const index = getIndex() ?? 0;
                const imageUrl = item.thumbnail_url || item.main_url;
                const itemId = item.id;
                console.log(`� Rendering simple item ${index}:`, imageUrl);

                return (
                  <ScaleDecorator>
                    <View
                      style={{
                        width: width - 32,
                        height: 200,
                        marginHorizontal: 16,
                        marginBottom: 16,
                        borderRadius: 12,
                        backgroundColor: '#E0E0E0',
                        overflow: 'hidden',
                        opacity: isActive ? 0.8 : 1,
                        transform: isActive ? [{ scale: 1.05 }] : [{ scale: 1 }],
                      }}
                    >
                      <Image
                        source={{ uri: imageUrl }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                        onLoadStart={() => console.log(`🔄 Loading ${itemId.substring(0, 8)}...`)}
                        onLoad={() => console.log(`✅ Loaded ${itemId.substring(0, 8)}`)}
                        onError={(error) =>
                          console.log(
                            `❌ Error ${itemId.substring(0, 8)}:`,
                            error.nativeEvent.error
                          )
                        }
                      />
                      <View
                        style={{
                          position: 'absolute',
                          top: 8,
                          left: 8,
                          backgroundColor: 'rgba(0, 0, 0, 0.7)',
                          borderRadius: 14,
                          width: 28,
                          height: 28,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>
                          {index + 1}
                        </Text>
                      </View>
                      {index === 0 && (
                        <View
                          style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            backgroundColor: colors.primary,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 6,
                          }}
                        >
                          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>
                            Cover
                          </Text>
                        </View>
                      )}
                      <TouchableOpacity
                        onLongPress={drag}
                        disabled={isActive}
                        style={{
                          position: 'absolute',
                          bottom: 8,
                          right: 8,
                          backgroundColor: 'rgba(0, 0, 0, 0.5)',
                          borderRadius: 8,
                          padding: 4,
                        }}
                      >
                        <Ionicons name="reorder-two" size={24} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  </ScaleDecorator>
                );
              }}
              keyExtractor={(item) => item.id}
              onDragEnd={({ data }) => {
                console.log(
                  '📦 New order:',
                  data.map((img, idx) => `${idx + 1}`)
                );
                // Update order_index for each image based on new position
                const updatedData = data.map((img, index) => ({
                  ...img,
                  order_index: index,
                }));
                console.log(
                  '✅ Updated order_index:',
                  updatedData.map((img) => `${img.id.substring(0, 8)}:${img.order_index}`)
                );
                setTempReorderedImages(updatedData);
                setHasReordered(true); // Mark that reordering happened
              }}
              containerStyle={{ paddingTop: 16 }}
            />
          </GestureHandlerRootView>

          {/* Footer Buttons */}
          <View
            style={[
              styles.reorderFooter,
              { borderTopColor: colors.border, backgroundColor: colors.background },
            ]}
          >
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => {
                console.log('🔄 Reset to original order');
                if (selectedPost) {
                  setTempReorderedImages([...selectedPost.all_images]);
                }
              }}
            >
              <Text style={[styles.resetButtonText, { color: colors.textMuted }]}>Reset order</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.doneButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                console.log('💾 Saving changes and returning to edit');
                console.log(
                  '📸 Saving reordered images:',
                  tempReorderedImages.map((img) => `${img.id.substring(0, 8)}:${img.order_index}`)
                );
                setReorderedImages(tempReorderedImages);
                // Keep hasReordered flag - it's already set by onDragEnd
                setReorderModalVisible(false);
                setTimeout(() => {
                  setEditModalVisible(true);
                }, 300);
              }}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Success Toast Notification */}
      {toastVisible && (
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 100,
            left: 20,
            right: 20,
            backgroundColor: '#4CAF50',
            borderRadius: 12,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
            opacity: toastOpacity,
          }}
        >
          <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" style={{ marginRight: 12 }} />
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600', flex: 1 }}>
            {toastMessage}
          </Text>
        </Animated.View>
      )}
    </View>
  );
};

const REORDER_IMAGE_SIZE = (width - 48) / 3;

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
    color: '#FFFFFF',
  },
  editButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  photosSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reorderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  reorderButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  photoCarousel: {
    paddingRight: 16,
  },
  carouselImageContainer: {
    width: 220,
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginRight: 12,
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  carouselImageNumber: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselImageNumberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  captionInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    minHeight: 120,
  },
  characterCount: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'right',
  },
  reorderGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  reorderImageContainer: {
    width: REORDER_IMAGE_SIZE,
    height: REORDER_IMAGE_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  reorderImage: {
    width: '100%',
    height: '100%',
  },
  imageNumber: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  singlePhoto: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    backgroundColor: '#000000',
  },
  dangerZone: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    backgroundColor: '#EF4444',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Reorder Modal Styles
  reorderModalContainer: {
    flex: 1,
  },
  gestureRoot: {
    flex: 1,
  },
  reorderSafeArea: {
    flex: 0,
  },
  reorderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    height: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  reorderHeaderButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reorderHeaderTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: -44,
  },
  reorderInstructions: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  reorderInstructionsText: {
    fontSize: 14,
    lineHeight: 20,
  },
  reorderScrollView: {
    flex: 1,
  },
  reorderList: {
    padding: 16,
  },
  reorderItem: {
    width: width - 32,
    height: 200,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  reorderItemActive: {
    opacity: 0.8,
    transform: [{ scale: 1.05 }],
  },
  reorderItemImage: {
    width: width - 32,
    height: 200,
  },
  reorderItemNumber: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reorderItemNumberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  coverBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  coverBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  reorderItemHandle: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    padding: 4,
  },
  reorderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  doneButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
