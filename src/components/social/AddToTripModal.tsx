import React, { useState, useEffect, useCallback } from 'react';

import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';

import * as Haptics from 'expo-haptics';

import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { getCurrentUser } from '@/lib/userUtils';

interface Trip {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
}

interface AddToTripModalProps {
  visible: boolean;
  onClose: () => void;
  placeId: string;
  placeName: string;
  placeGoogleId?: string;
  latitude: number;
  longitude: number;
}

export const AddToTripModal: React.FC<AddToTripModalProps> = ({
  visible,
  onClose,
  placeId,
  placeName,
  placeGoogleId,
  latitude,
  longitude,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);

  const loadTrips = useCallback(async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('trips')
        .select('id, title, destination, start_date, end_date')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrips(data || []);
    } catch (error) {
      console.error('Error loading trips:', error);
      Alert.alert(t('common.error'), t('social.maps.error_loading_trips'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (visible) {
      loadTrips();
    }
  }, [visible, loadTrips]);

  const handleAddToTrip = async (trip: Trip) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setAdding(trip.id);

      const { error } = await supabase.from('trip_places').insert({
        trip_id: trip.id,
        place_id: placeGoogleId || placeId,
        name: placeName,
        latitude,
        longitude,
        order_index: 0,
      });

      if (error) {
        if (error.code === '23505') {
          Alert.alert(t('social.maps.already_added_title'), t('social.maps.already_added_message'));
        } else {
          throw error;
        }
      } else {
        Alert.alert(
          t('common.success'),
          t('social.maps.added_to_trip_success', { trip: trip.title })
        );
        onClose();
      }
    } catch (error) {
      console.error('Error adding to trip:', error);
      Alert.alert(t('common.error'), t('social.maps.error_adding_to_trip'));
    } finally {
      setAdding(null);
    }
  };

  const renderTripItem = ({ item }: { item: Trip }) => {
    const isAdding = adding === item.id;

    return (
      <TouchableOpacity
        style={[
          styles.tripItem,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
        onPress={() => handleAddToTrip(item)}
        disabled={isAdding}
      >
        <View style={styles.tripInfo}>
          <View style={[styles.tripIcon, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="airplane" size={20} color={colors.primary} />
          </View>
          <View style={styles.tripDetails}>
            <Text style={[styles.tripTitle, { color: colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.tripDestination, { color: colors.textMuted }]} numberOfLines={1}>
              {item.destination}
            </Text>
          </View>
        </View>
        {isAdding ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View
          style={[styles.container, { backgroundColor: colors.card }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {t('social.maps.add_to_trip')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.placeInfo}>
            <Ionicons name="location" size={20} color={colors.primary} />
            <Text style={[styles.placeName, { color: colors.text }]} numberOfLines={2}>
              {placeName}
            </Text>
          </View>

          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : trips.length === 0 ? (
            <View style={styles.centerContainer}>
              <Ionicons name="sad-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {t('social.maps.no_trips')}
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                {t('social.maps.create_trip_first')}
              </Text>
            </View>
          ) : (
            <FlatList
              data={trips}
              renderItem={renderTripItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 34,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#C4C4C4',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  placeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  placeName: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  centerContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  tripItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  tripInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  tripIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tripDetails: {
    flex: 1,
  },
  tripTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  tripDestination: {
    fontSize: 14,
  },
});
