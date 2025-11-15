import React from 'react';

import { View, Text, StyleSheet } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';

import { useTranslation } from 'react-i18next';

import { COLORS } from '~/constants/colors';
import { useTravelMode } from '~/contexts/TravelModeContext';
import { getCurrentPosition, getTripPlaces, getSavedPlaces, haversine } from '~/lib/home';
import { sendPush } from '~/lib/push_send';
import { supabase } from '~/lib/supabase';
import { useDistanceUnit } from '~/utils/units';

// Color constants for styling
const PLACE_ITEM_BG = 'rgba(255, 255, 255, 0.6)';
const CLOSEST_PLACE_BG = 'rgba(255, 255, 255, 0.9)';

interface NearbyAlertsProps {
  tripId?: string;
}

interface Place {
  id?: string;
  place_id?: string;
  name: string;
  lat: number;
  lng: number;
  distance_m?: number;
}

const NearbyAlerts = React.memo(function NearbyAlerts({ tripId }: NearbyAlertsProps) {
  const { t } = useTranslation();
  const { state } = useTravelMode();
  const enabled = state.isActive;
  const distance = useDistanceUnit();
  const [pos, setPos] = React.useState<{ lat: number; lng: number } | null>(null);
  const [list, setList] = React.useState<Place[]>([]);

  // Format distance using user's preferred units
  const formatDistance = (distanceInMeters: number): string => {
    return distance.formatMeters(distanceInMeters);
  };

  React.useEffect(() => {
    (async () => {
      const p = await getCurrentPosition();
      setPos(p);
    })();
  }, []);

  React.useEffect(() => {
    (async () => {
      if (!enabled) {
        setList([]);
        return;
      }
      let places: Place[] = [];
      if (tripId) {
        places = await getTripPlaces(tripId);
      } else {
        places = await getSavedPlaces();
      }
      if (pos) {
        places = places
          .map((pl) => ({ ...pl, distance_m: haversine(pos.lat, pos.lng, pl.lat, pl.lng) }))
          .filter((pl) => pl.lat && pl.lng && Math.abs(pl.lat) > 0.001 && Math.abs(pl.lng) > 0.001)
          .sort((a, b) => (a.distance_m || 0) - (b.distance_m || 0))
          .slice(0, 20);
      }
      setList(places);
    })();
  }, [enabled, pos, tripId]);

  // Notify when closest place is under dynamic arrival radius (simple heuristic 60-150m)
  React.useEffect(() => {
    if (!enabled || !pos || !list.length) return;
    const nearest = list[0];
    const r = Math.max(60, Math.min(150, Math.round((nearest.distance_m || 200) / 3)));
    if ((nearest.distance_m || 1e9) <= r) {
      Notifications.scheduleNotificationAsync({
        content: {
          title: t('home.youre_close'),
          body: t('home.arriving_at', { place: nearest.name }),
        },
        trigger: null,
      });
      // Optional: notify collaborators (best‑effort)
      (async () => {
        try {
          const { data: u } = await supabase.auth.getUser();
          const uid = u?.user?.id;
          if (!uid) return;
          // fetch collaborators for active trip if provided
          // NOTE: if you want this always, pass tripId a NearbyAlerts
          // We keep the call guarded
          // const { data: collabs } = await supabase.from('trip_collaborators').select('user_id').eq('trip_id', tripId||'null');
          // const ids = (collabs||[]).map((c:any)=>c.user_id).filter((x:string)=>x!==uid);
          const ids: string[] = [];
          if (ids.length)
            await sendPush(
              ids,
              t('home.near_a_place'),
              t('home.companion_arriving_at', { place: nearest.name }),
              { type: 'nearby', place_id: nearest.place_id }
            );
        } catch {
          // Ignore notification errors
        }
      })();
    }
  }, [enabled, pos, list, t]);

  // Don't render anything if travel mode is not enabled
  if (!enabled) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="alert-circle" size={20} color="#FFFFFF" />
          </View>

          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{t('home.nearby_alerts')}</Text>
            <Text style={styles.headerSubtitle}>{t('home.enable_travel_mode_to_see_places')}</Text>
          </View>
        </View>
      </View>
    );
  }

  // Travel mode is enabled, show nearby places
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="alert-circle" size={20} color="#FFFFFF" />
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{t('home.nearby_alerts')}</Text>
          <Text style={styles.headerSubtitle}>
            {list.length > 0
              ? `${list.length} ${list.length === 1 ? t('home.place_found') : t('home.places_found')} ${t('home.near')}`
              : t('home.searching_nearby_places')}
          </Text>
        </View>
      </View>

      {list.length > 0 && (
        <View style={styles.placesContainer}>
          {list.slice(0, 5).map((item, index) => {
            // Calculate font size based on proximity - closest is largest
            const baseFontSize = 22;
            const fontSize = Math.max(14, baseFontSize - index * 2);
            const distanceFontSize = Math.max(12, 16 - index * 1);

            return (
              <View
                key={item.id || item.place_id}
                style={[styles.placeItem, index === 0 && styles.closestPlaceItem]}
              >
                <View style={styles.placeInfo}>
                  <Text
                    style={[styles.placeName, { fontSize }, index === 0 && styles.closestPlaceName]}
                    numberOfLines={2}
                  >
                    {item.name}
                  </Text>
                  {typeof item.distance_m === 'number' && (
                    <View style={styles.distanceContainer}>
                      <Ionicons
                        name="location-outline"
                        size={12}
                        color={COLORS.secondary.amberDark}
                      />
                      <Text
                        style={[
                          styles.placeDistance,
                          { fontSize: distanceFontSize },
                          index === 0 && styles.closestPlaceDistance,
                        ]}
                      >
                        {formatDistance(item.distance_m)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  // Main Container
  container: {
    backgroundColor: COLORS.background.amber.light,
    borderRadius: 16,
    padding: 20,
    elevation: 5,
  },

  // Header Section
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.secondary.amber,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.secondary.amberDark,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.secondary.amberMedium,
  },

  // Places List
  placesContainer: {
    marginTop: 16,
    gap: 12,
  },
  placeItem: {
    backgroundColor: PLACE_ITEM_BG,
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary.amber,
  },
  closestPlaceItem: {
    backgroundColor: CLOSEST_PLACE_BG,
    borderLeftWidth: 6,
    borderLeftColor: COLORS.secondary.amberDark,
    elevation: 3,
    shadowColor: COLORS.secondary.amberDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    color: COLORS.secondary.amberDark,
    fontWeight: '700',
    marginBottom: 6,
    lineHeight: 26,
  },
  closestPlaceName: {
    color: COLORS.primary.main,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  distanceIcon: {
    fontSize: 14,
  },
  placeDistance: {
    color: COLORS.secondary.amberDark,
    fontWeight: '600',
  },
  closestPlaceDistance: {
    color: COLORS.primary.main,
    fontWeight: '700',
  },
});

export default NearbyAlerts;
