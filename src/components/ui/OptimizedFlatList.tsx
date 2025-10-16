import React from 'react';

import { FlatList, FlatListProps, View, Text } from 'react-native';

// Optimized FlatList with better performance for large datasets
interface OptimizedFlatListProps<T> extends Omit<FlatListProps<T>, 'getItemLayout'> {
  data: T[];
  renderItem: ({ item, index }: { item: T; index: number }) => React.ReactElement;
  keyExtractor: (item: T, index: number) => string;
  itemHeight?: number;
  estimatedItemSize?: number;
}

export function OptimizedFlatList<T>({
  data,
  renderItem,
  keyExtractor,
  itemHeight,
  estimatedItemSize = 80,
  ...props
}: OptimizedFlatListProps<T>) {
  // Memoize the render item to prevent unnecessary re-renders
  const memoizedRenderItem = React.useCallback(renderItem, []);

  // Get item layout for better performance with fixed heights
  const getItemLayout = React.useMemo(() => {
    if (itemHeight) {
      return (data: any, index: number) => ({
        length: itemHeight,
        offset: itemHeight * index,
        index,
      });
    }
    return undefined;
  }, [itemHeight]);

  return (
    <FlatList
      data={data}
      renderItem={memoizedRenderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={10}
      windowSize={10}
      {...props}
    />
  );
}

// Optimized component for rendering large text lists
interface OptimizedTextListProps {
  items: Array<{ id: string; title: string; subtitle?: string; onPress?: () => void }>;
  loading?: boolean;
}

export const OptimizedTextList = React.memo<OptimizedTextListProps>(function OptimizedTextList({
  items,
  loading = false,
}) {
  type ItemType = { id: string; title: string; subtitle?: string; onPress?: () => void };

  const renderItem = React.useCallback(
    ({ item }: { item: ItemType }) => (
      <View
        style={{
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderBottomColor: '#f0f0f0',
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '600' }}>{item.title}</Text>
        {item.subtitle && (
          <Text style={{ fontSize: 14, color: '#666', marginTop: 4 }}>{item.subtitle}</Text>
        )}
      </View>
    ),
    []
  );

  const keyExtractor = React.useCallback((item: ItemType) => item.id, []);

  if (loading) {
    return (
      <View style={{ padding: 16 }}>
        <Text style={{ textAlign: 'center', color: '#666' }}>Cargando...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={10}
      windowSize={10}
    />
  );
});
