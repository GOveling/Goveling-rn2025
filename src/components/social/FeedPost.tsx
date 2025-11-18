import React, { useState, useCallback, useMemo } from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Pressable,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/lib/theme';
import type { PostWithDetails } from '@/types/social.types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_SIZE = SCREEN_WIDTH;

interface FeedPostProps {
  post: PostWithDetails;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onShare: (postId: string) => void;
  onSave: (postId: string) => void;
  onUserPress: (userId: string) => void;
  onPlacePress: (placeId: string) => void;
  onImagePress?: (postId: string, index: number) => void;
}

export const FeedPost: React.FC<FeedPostProps> = ({
  post,
  onLike,
  onComment,
  onShare,
  onSave,
  onUserPress,
  onPlacePress,
  onImagePress,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showFullCaption, setShowFullCaption] = useState(false);

  const handleLike = useCallback(() => {
    onLike(post.id);
  }, [post.id, onLike]);

  const handleComment = useCallback(() => {
    onComment(post.id);
  }, [post.id, onComment]);

  const handleShare = useCallback(() => {
    onShare(post.id);
  }, [post.id, onShare]);

  const handleSave = useCallback(() => {
    onSave(post.id);
  }, [post.id, onSave]);

  const handleUserPress = useCallback(() => {
    onUserPress(post.user_id);
  }, [post.user_id, onUserPress]);

  const handlePlacePress = useCallback(() => {
    if (post.place_id) {
      onPlacePress(post.place_id);
    }
  }, [post.place_id, onPlacePress]);

  const handleImagePress = useCallback(() => {
    if (onImagePress) {
      onImagePress(post.id, currentImageIndex);
    }
  }, [post.id, currentImageIndex, onImagePress]);

  const timeAgo = useMemo(() => {
    const now = new Date();
    const postDate = new Date(post.created_at);
    const diffInMinutes = Math.floor((now.getTime() - postDate.getTime()) / 60000);

    if (diffInMinutes < 1) return t('social.post.just_now');
    if (diffInMinutes < 60) return t('social.post.minutes_ago', { count: diffInMinutes });
    if (diffInMinutes < 1440) {
      return t('social.post.hours_ago', { count: Math.floor(diffInMinutes / 60) });
    }
    if (diffInMinutes < 10080) {
      return t('social.post.days_ago', { count: Math.floor(diffInMinutes / 1440) });
    }
    return t('social.post.weeks_ago', { count: Math.floor(diffInMinutes / 10080) });
  }, [post.created_at, t]);

  const shouldTruncateCaption = useMemo(() => {
    return post.caption && post.caption.length > 150;
  }, [post.caption]);

  const displayCaption = useMemo(() => {
    if (!post.caption) return '';
    if (!shouldTruncateCaption || showFullCaption) return post.caption;
    return post.caption.substring(0, 150) + '...';
  }, [post.caption, shouldTruncateCaption, showFullCaption]);

  const likeCount = post.likes_count || 0;
  const commentCount = post.comments_count || 0;
  const hasImages = post.images && post.images.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.userInfo} onPress={handleUserPress}>
          {post.user.avatar_url ? (
            <Image source={{ uri: post.user.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.border }]}>
              <Ionicons name="person" size={20} color={colors.textMuted} />
            </View>
          )}
          <View style={styles.userTextContainer}>
            <Text style={[styles.username, { color: colors.text }]} numberOfLines={1}>
              {post.user.username || 'Unknown User'}
            </Text>
            {post.place.name && (
              <TouchableOpacity onPress={handlePlacePress}>
                <Text style={[styles.place, { color: colors.textMuted }]} numberOfLines={1}>
                  <Ionicons name="location" size={12} color={colors.textMuted} /> {post.place.name}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.headerRight}>
          <Text style={[styles.timeAgo, { color: colors.textMuted }]}>{timeAgo}</Text>
        </View>
      </View>

      {hasImages && (
        <View style={styles.imagesContainer}>
          <Pressable onPress={handleImagePress}>
            <Image
              source={{ uri: post.images[currentImageIndex].main_url }}
              style={styles.image}
              resizeMode="cover"
            />
          </Pressable>

          {post.images.length > 1 && (
            <View style={styles.imageIndicatorContainer}>
              <View style={[styles.imageIndicator, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
                <Text style={styles.imageIndicatorText}>
                  {currentImageIndex + 1} / {post.images.length}
                </Text>
              </View>
            </View>
          )}

          {post.images.length > 1 && currentImageIndex > 0 && (
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonLeft]}
              onPress={() => setCurrentImageIndex(currentImageIndex - 1)}
            >
              <View style={[styles.navButtonInner, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
                <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          )}

          {post.images.length > 1 && currentImageIndex < post.images.length - 1 && (
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonRight]}
              onPress={() => setCurrentImageIndex(currentImageIndex + 1)}
            >
              <View style={[styles.navButtonInner, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
                <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.actionsContainer}>
        <View style={styles.actionsLeft}>
          <TouchableOpacity onPress={handleLike} style={styles.actionButton}>
            <Ionicons
              name={post.user_has_liked ? 'heart' : 'heart-outline'}
              size={28}
              color={post.user_has_liked ? colors.social.like : colors.text}
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleComment} style={styles.actionButton}>
            <Ionicons name="chatbubble-outline" size={26} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
            <Ionicons name="paper-plane-outline" size={26} color={colors.text} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={handleSave}>
          <Ionicons
            name={post.user_has_saved ? 'bookmark' : 'bookmark-outline'}
            size={26}
            color={post.user_has_saved ? colors.social.save : colors.text}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.contentContainer}>
        {likeCount > 0 && (
          <TouchableOpacity onPress={handleComment}>
            <Text style={[styles.likes, { color: colors.text }]}>
              {t('social.post.likes_count', { count: likeCount })}
            </Text>
          </TouchableOpacity>
        )}

        {post.caption && (
          <View style={styles.captionContainer}>
            <Text style={[styles.caption, { color: colors.text }]}>
              <Text style={styles.captionUsername}>{post.user.username} </Text>
              {displayCaption}
            </Text>
            {shouldTruncateCaption && !showFullCaption && (
              <TouchableOpacity onPress={() => setShowFullCaption(true)}>
                <Text style={[styles.showMore, { color: colors.textMuted }]}>
                  {t('social.post.show_more')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {commentCount > 0 && (
          <TouchableOpacity onPress={handleComment}>
            <Text style={[styles.viewComments, { color: colors.textMuted }]}>
              {t('social.post.view_all_comments', { count: commentCount })}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  place: {
    fontSize: 12,
  },
  headerRight: {
    marginLeft: 8,
  },
  timeAgo: {
    fontSize: 12,
  },
  imagesContainer: {
    position: 'relative',
  },
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
  },
  imageIndicatorContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  imageIndicator: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageIndicatorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
  },
  navButtonLeft: {
    left: 12,
  },
  navButtonRight: {
    right: 12,
  },
  navButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  actionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginRight: 16,
  },
  contentContainer: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 8,
  },
  likes: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  captionContainer: {
    marginTop: 4,
  },
  caption: {
    fontSize: 14,
    lineHeight: 18,
  },
  captionUsername: {
    fontWeight: '600',
  },
  showMore: {
    fontSize: 14,
    marginTop: 4,
  },
  viewComments: {
    fontSize: 14,
    marginTop: 8,
  },
});
