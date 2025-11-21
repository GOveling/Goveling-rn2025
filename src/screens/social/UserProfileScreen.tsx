import React, { useEffect, useState, useCallback } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';

import { useRouter, useLocalSearchParams } from 'expo-router';

import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FollowButton, PostsGrid, ProfileStats } from '@/components/social';
import { useTheme } from '@/lib/theme';
import { UserProfileService, type UserProfileData } from '@/services/userProfileService';
import type { PostWithDetails } from '@/types/social.types';

export const UserProfileScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ userId: string }>();
  const userId = params.userId;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(
    async (isRefreshing = false) => {
      console.log('📱 UserProfileScreen - userId:', userId);

      if (!userId) {
        console.error('❌ UserProfileScreen - No userId provided');
        setError('User ID is required');
        setLoading(false);
        return;
      }

      try {
        if (!isRefreshing) setLoading(true);
        setError(null);

        const {
          success,
          data,
          error: fetchError,
        } = await UserProfileService.getUserProfile(userId);

        console.log('📊 Profile data received:', {
          success,
          postsCount: data?.posts?.length,
          profilePostsCount: data?.profile?.posts_count,
        });

        if (!success || !data) {
          setError(fetchError || 'Failed to load profile');
          return;
        }

        setProfileData(data);
      } catch (err) {
        console.error('❌ Error loading profile:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadProfile(true);
  }, [loadProfile]);

  const handleFollow = useCallback(async () => {
    if (!profileData) return;

    const newIsFollowing = !profileData.isFollowing;
    setProfileData({
      ...profileData,
      isFollowing: newIsFollowing,
      profile: {
        ...profileData.profile,
        followers_count: profileData.profile.followers_count + (newIsFollowing ? 1 : -1),
      },
    });
  }, [profileData]);

  const handlePostPress = useCallback((post: PostWithDetails) => {
    console.log('Open post:', post.id);
  }, []);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !profileData) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle" size={48} color={colors.textMuted} />
        <Text style={[styles.errorText, { color: colors.text }]}>
          {error || t('social.profile.error_loading')}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={() => loadProfile()}
        >
          <Text style={[styles.retryButtonText, { color: colors.background }]}>
            {t('common.retry')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { profile, posts, isFollowing } = profileData;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View
        style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
      >
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {t('social.profile.title')}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.border }]}>
                <Ionicons name="person" size={40} color={colors.textMuted} />
              </View>
            )}
          </View>

          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.displayName, { color: colors.text }]}>
                {profile.display_name || profile.username}
              </Text>
              {profile.is_verified && (
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              )}
            </View>
            {profile.display_name && (
              <Text style={[styles.username, { color: colors.textMuted }]}>
                @{profile.username}
              </Text>
            )}
          </View>
        </View>

        {profile.bio && !profile.bio.includes('Updated at') && !profile.bio.includes('CRUD') && (
          <View style={styles.bioContainer}>
            <Text style={[styles.bioText, { color: colors.text }]}>{profile.bio}</Text>
          </View>
        )}

        {profile.website && (
          <View style={styles.websiteContainer}>
            <Ionicons name="link" size={16} color={colors.textMuted} />
            <Text style={[styles.websiteText, { color: colors.primary }]} numberOfLines={1}>
              {profile.website}
            </Text>
          </View>
        )}

        <ProfileStats
          postsCount={profile.posts_count}
          followersCount={profile.followers_count}
          followingCount={profile.following_count}
        />

        <View style={styles.actionContainer}>
          <FollowButton isFollowing={isFollowing} onPress={handleFollow} />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {posts.length > 0 ? (
          <PostsGrid posts={posts} onPostPress={handlePostPress} />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="images-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {t('social.profile.no_posts')}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerRight: {
    width: 32,
  },
  profileHeader: {
    padding: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  displayName: {
    fontSize: 20,
    fontWeight: '700',
  },
  username: {
    fontSize: 14,
    marginTop: 4,
  },
  bioContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  bioText: {
    fontSize: 15,
    lineHeight: 20,
    textAlign: 'center',
  },
  websiteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  websiteText: {
    fontSize: 14,
    maxWidth: '80%',
  },
  actionContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  divider: {
    height: 1,
    marginBottom: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  errorText: {
    fontSize: 16,
    marginTop: 12,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
