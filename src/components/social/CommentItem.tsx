import React, { useMemo, useState, useEffect } from 'react';

import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/lib/theme';
import { getCurrentUser } from '@/lib/userUtils';
import type { Comment } from '@/services/commentService';

interface CommentItemProps {
  comment: Comment;
  onDelete: (commentId: string) => void;
}

export const CommentItem: React.FC<CommentItemProps> = ({ comment, onDelete }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const user = await getCurrentUser();
      setCurrentUserId(user?.id || null);
    };
    loadUser();
  }, []);

  const isOwnComment = currentUserId === comment.user_id;

  const timeAgo = useMemo(() => {
    const now = new Date();
    const commentDate = new Date(comment.created_at);
    const diffInMinutes = Math.floor((now.getTime() - commentDate.getTime()) / 60000);

    if (diffInMinutes < 1) return t('social.post.just_now');
    if (diffInMinutes < 60) return t('social.post.minutes_ago', { count: diffInMinutes });
    if (diffInMinutes < 1440) {
      return t('social.post.hours_ago', { count: Math.floor(diffInMinutes / 60) });
    }
    if (diffInMinutes < 10080) {
      return t('social.post.days_ago', { count: Math.floor(diffInMinutes / 1440) });
    }
    return t('social.post.weeks_ago', { count: Math.floor(diffInMinutes / 10080) });
  }, [comment.created_at, t]);

  const handleDelete = () => {
    Alert.alert(
      t('social.comments.delete_title'),
      t('social.comments.delete_message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => onDelete(comment.id),
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.avatarContainer}>
        {comment.avatar_url ? (
          <Image source={{ uri: comment.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.border }]}>
            <Ionicons name="person" size={16} color={colors.textMuted} />
          </View>
        )}
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={[styles.username, { color: colors.text }]} numberOfLines={1}>
            {comment.display_name || comment.username}
          </Text>
          <Text style={[styles.timeAgo, { color: colors.textMuted }]}>{timeAgo}</Text>
        </View>

        <Text style={[styles.content, { color: colors.text }]}>{comment.content}</Text>

        {isOwnComment && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={16} color="#FF3B30" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  timeAgo: {
    fontSize: 12,
  },
  content: {
    fontSize: 14,
    lineHeight: 18,
  },
  deleteButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    padding: 4,
  },
});
