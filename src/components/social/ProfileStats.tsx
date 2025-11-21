import React from 'react';

import { View, Text, StyleSheet } from 'react-native';

import { useTranslation } from 'react-i18next';

import { useTheme } from '@/lib/theme';

interface ProfileStatsProps {
  postsCount: number;
  followersCount: number;
  followingCount: number;
  onFollowersPress?: () => void;
  onFollowingPress?: () => void;
}

export const ProfileStats: React.FC<ProfileStatsProps> = ({
  postsCount,
  followersCount,
  followingCount,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.statItem}>
        <Text style={[styles.statNumber, { color: colors.text }]}>{postsCount}</Text>
        <Text style={[styles.statLabel, { color: colors.textMuted }]}>
          {t('social.profile.posts')}
        </Text>
      </View>

      <View style={styles.statItem}>
        <Text style={[styles.statNumber, { color: colors.text }]}>{followersCount}</Text>
        <Text style={[styles.statLabel, { color: colors.textMuted }]}>
          {t('social.profile.followers')}
        </Text>
      </View>

      <View style={styles.statItem}>
        <Text style={[styles.statNumber, { color: colors.text }]}>{followingCount}</Text>
        <Text style={[styles.statLabel, { color: colors.textMuted }]}>
          {t('social.profile.following')}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
  },
});
