import React, { useEffect, useState, useCallback, useRef } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  FlatList,
} from 'react-native';

import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/lib/theme';
import { CommentService, type Comment } from '@/services/commentService';

import { CommentInput } from './CommentInput';
import { CommentItem } from './CommentItem';

interface CommentsSheetProps {
  postId: string;
  isVisible: boolean;
  onClose: () => void;
  onCommentAdded?: () => void;
}

export const CommentsSheet: React.FC<CommentsSheetProps> = ({
  postId,
  isVisible,
  onClose,
  onCommentAdded,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const snapPoints = ['60%', '90%'];

  const loadComments = useCallback(async () => {
    setIsLoading(true);
    const { success, comments: fetchedComments } = await CommentService.getComments(postId);
    if (success) {
      setComments(fetchedComments);
    }
    setIsLoading(false);
  }, [postId]);

  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.expand();
      loadComments();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isVisible, loadComments]);

  const handleAddComment = useCallback(
    async (text: string) => {
      const { success, comment, error } = await CommentService.addComment(postId, text);

      if (success && comment) {
        setComments((prev) => [...prev, comment]);
        onCommentAdded?.();
      } else {
        const errorMessage =
          error === 'inappropriate_content'
            ? t('social.moderation.comment_rejected')
            : t('social.comments.error_adding');

        Alert.alert(t('common.error'), errorMessage);
      }
    },
    [postId, onCommentAdded, t]
  );

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      const { success } = await CommentService.deleteComment(commentId);
      if (success) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      } else {
        Alert.alert(t('common.error'), t('social.comments.error_deleting'));
      }
    },
    [t]
  );

  const renderComment = useCallback(
    ({ item }: { item: Comment }) => <CommentItem comment={item} onDelete={handleDeleteComment} />,
    [handleDeleteComment]
  );

  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    return (
      <View style={styles.centerContainer}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          {t('social.comments.no_comments')}
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
          {t('social.comments.be_first')}
        </Text>
      </View>
    );
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={{ backgroundColor: colors.background }}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t('social.comments.title', { count: comments.length })}
          </Text>
        </View>

        <BottomSheetScrollView contentContainerStyle={styles.scrollContent}>
          <FlatList
            data={comments}
            renderItem={renderComment}
            keyExtractor={(item) => item.id}
            contentContainerStyle={comments.length === 0 ? styles.emptyContainer : undefined}
            ListEmptyComponent={renderEmptyState}
            scrollEnabled={false}
          />
        </BottomSheetScrollView>

        <CommentInput onSubmit={handleAddComment} />
      </KeyboardAvoidingView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollContent: {
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
  },
});
