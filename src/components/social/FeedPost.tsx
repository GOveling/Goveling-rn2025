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
import { SocialInteractionService } from '@/services/socialInteractionService';
import type { PostWithDetails } from '@/types/social.types';

import { AddToTripModal } from './AddToTripModal';
import { CommentsSheet } from './CommentsSheet';
import { FollowButton } from './FollowButton';
import { LikeButton } from './LikeButton';
import { PlaceMiniMap } from './PlaceMiniMap';
import { ShareSheet } from './ShareSheet';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_SIZE = SCREEN_WIDTH;
const BLACK_COLOR = '#000000';
const WHITE_COLOR = '#FFFFFF';

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
  const [isLiked, setIsLiked] = useState(post.user_has_liked);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showAddToTrip, setShowAddToTrip] = useState(false);

  const handleLike = useCallback(async () => {
    // Optimistic update
    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikesCount((prev) => (newIsLiked ? prev + 1 : prev - 1));

    const { success, isLiked: serverIsLiked } = await SocialInteractionService.toggleLike(post.id);

    if (!success) {
      // Revert on failure
      setIsLiked(!newIsLiked);
      setLikesCount((prev) => (!newIsLiked ? prev + 1 : prev - 1));
    } else {
      // Sync with server state just in case
      setIsLiked(serverIsLiked);
      onLike(post.id); // Notify parent if needed
    }
  }, [post.id, isLiked, onLike]);

  const handleFollow = useCallback(async () => {
    const { success, isFollowing: serverIsFollowing } = await SocialInteractionService.toggleFollow(
      post.user_id
    );
    if (success) {
      setIsFollowing(serverIsFollowing);
    }
  }, [post.user_id]);

  const handleComment = useCallback(() => {
    setShowComments(true);
    onComment(post.id);
  }, [post.id, onComment]);

  const handleCloseComments = useCallback(() => {
    setShowComments(false);
  }, []);

  const handleCommentAdded = useCallback(() => {
    setCommentsCount((prev) => prev + 1);
  }, []);

  const handleShare = useCallback(() => {
    setShowShare(true);
    onShare(post.id);
  }, [post.id, onShare]);

  const handleCloseShare = useCallback(() => {
    setShowShare(false);
  }, []);

  const handleAddToTrip = useCallback(() => {
    setShowAddToTrip(true);
  }, []);

  const handleCloseAddToTrip = useCallback(() => {
    setShowAddToTrip(false);
  }, []);

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

  const shouldTruncateCaption = useMemo(() => {
    return post.caption && post.caption.length > 150;
  }, [post.caption]);

  const displayCaption = useMemo(() => {
    if (!post.caption) return '';
    if (!shouldTruncateCaption || showFullCaption) return post.caption;
    return post.caption.substring(0, 150) + '...';
  }, [post.caption, shouldTruncateCaption, showFullCaption]);

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
            <Text style={[styles.username, { color: '#000000' }]} numberOfLines={1}>
              {post.user.display_name || post.user.username || 'Unknown User'}
            </Text>
            {post.place.name && (
              <TouchableOpacity onPress={handlePlacePress}>
                <Text style={[styles.place, { color: '#666666' }]} numberOfLines={1}>
                  <Ionicons name="location" size={12} color="#666666" /> {post.place.name}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.headerRight}>
          <FollowButton isFollowing={isFollowing} onPress={handleFollow} compact />
        </View>
      </View>

      {hasImages && (
        <View style={styles.imagesContainer}>
          <Pressable onPress={handleImagePress}>
            <Image
              source={{ uri: post.images[currentImageIndex].main_url }}
              style={styles.image}
              resizeMode="contain"
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

      {post.place.latitude && post.place.longitude && (
        <PlaceMiniMap
          placeId={post.place_id}
          placeName={post.place.name}
          latitude={post.place.latitude}
          longitude={post.place.longitude}
          onPress={handlePlacePress}
          onAddToTrip={handleAddToTrip}
        />
      )}

      <View style={styles.actionsContainer}>
        <View style={styles.actionsLeft}>
          <View style={styles.actionButton}>
            <LikeButton isLiked={isLiked} onPress={handleLike} size={28} />
          </View>

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
        {likesCount > 0 && (
          <TouchableOpacity onPress={handleComment}>
            <Text style={[styles.likes, { color: colors.text }]}>
              {t('social.post.likes_count', { count: likesCount })}
            </Text>
          </TouchableOpacity>
        )}

        {post.caption && (
          <View style={styles.captionContainer}>
            <Text style={[styles.caption, { color: colors.text }]}>
              <Text style={styles.captionUsername}>
                {post.user.display_name || post.user.username}{' '}
              </Text>
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

        {commentsCount > 0 && (
          <TouchableOpacity onPress={handleComment}>
            <Text style={[styles.viewComments, { color: colors.textMuted }]}>
              {t('social.post.view_all_comments', { count: commentsCount })}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <CommentsSheet
        postId={post.id}
        isVisible={showComments}
        onClose={handleCloseComments}
        onCommentAdded={handleCommentAdded}
      />

      <ShareSheet visible={showShare} onClose={handleCloseShare} postId={post.id} />

      {post.place.latitude && post.place.longitude && (
        <AddToTripModal
          visible={showAddToTrip}
          onClose={handleCloseAddToTrip}
          placeId={post.place_id}
          placeName={post.place.name}
          latitude={post.place.latitude}
          longitude={post.place.longitude}
        />
      )}
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
  imagesContainer: {
    position: 'relative',
    width: IMAGE_SIZE,
    backgroundColor: BLACK_COLOR,
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
    color: WHITE_COLOR,
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
