import React from 'react';

import { View, Text, StyleSheet } from 'react-native';

import { InterestLevel, INTEREST_LEVEL_CONFIG } from '~/types/place';

interface InterestLevelBadgeProps {
  level?: InterestLevel;
  size?: 'small' | 'medium';
  showLabel?: boolean;
}

const InterestLevelBadge: React.FC<InterestLevelBadgeProps> = ({
  level = 'maybe',
  size = 'medium',
  showLabel = false,
}) => {
  const config = INTEREST_LEVEL_CONFIG[level];
  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.badge,
        isSmall ? styles.badgeSmall : styles.badgeMedium,
        { backgroundColor: `${config.color}20`, borderColor: config.color },
      ]}
    >
      <Text style={[styles.stars, isSmall && styles.starsSmall]}>{config.icon}</Text>
      {showLabel && !isSmall && <Text style={[styles.label, { color: config.color }]} />}
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeMedium: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stars: {
    fontSize: 14,
  },
  starsSmall: {
    fontSize: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default InterestLevelBadge;
