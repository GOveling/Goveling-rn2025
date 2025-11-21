import React from 'react';

import { View, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';

import type { PostWithDetails } from '@/types/social.types';

const { width } = Dimensions.get('window');
const ITEM_SIZE = width / 3;
const SPACING = 2;

interface PostsGridProps {
  posts: PostWithDetails[];
  onPostPress: (post: PostWithDetails) => void;
}

export const PostsGrid: React.FC<PostsGridProps> = ({ posts, onPostPress }) => {
  // Group posts into rows of 3
  const rows: PostWithDetails[][] = [];
  for (let i = 0; i < posts.length; i += 3) {
    rows.push(posts.slice(i, i + 3));
  }

  return (
    <View style={styles.container}>
      {rows.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {row.map((item) => {
            const firstImage = item.images?.[0];
            if (!firstImage) return null;

            return (
              <TouchableOpacity
                key={item.id}
                style={styles.item}
                onPress={() => onPostPress(item)}
                activeOpacity={0.8}
              >
                <Image source={{ uri: firstImage.thumbnail_url }} style={styles.image} />
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
  row: {
    flexDirection: 'row',
    marginBottom: SPACING,
  },
  item: {
    width: ITEM_SIZE - SPACING,
    height: ITEM_SIZE - SPACING,
    marginRight: SPACING,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
  },
});
