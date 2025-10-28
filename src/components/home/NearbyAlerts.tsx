import React from 'react';

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import * as Notifications from 'expo-notifications';

import { useTranslation } from 'react-i18next';

import { COLORS } from '~/constants/colors';
import { getCurrentPosition, getTripPlaces, getSavedPlaces, haversine } from '~/lib/home';
import { sendPush } from '~/lib/push_send';
import { supabase } from '~/lib/supabase';
import { useTravel } from '~/lib/travelStore';

interface NearbyAlertsProps {
  tripId?: string;
}

const NearbyAlerts = React.memo(function NearbyAlerts({ tripId }: NearbyAlertsProps) {
  const { t } = useTranslation();
  const { enabled, setEnabled } = useTravel();
  const [pos, setPos] = React.useState<{ lat: number; lng: number } | null>(null);
  const [list, setList] = React.useState<any[]>([]);

  // Format distance: >= 1km as "1.0 Km", < 1km as "900m"
  const formatDistance = (distanceInMeters: number): string => {
    if (distanceInMeters >= 1000) {
      return `${(distanceInMeters / 1000).toFixed(1)} Km`;
    }
    return `${Math.round(distanceInMeters)}m`;
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
      let places: any[] = [];
      if (tripId) {
        places = await getTripPlaces(tripId);
      } else {
        places = await getSavedPlaces();
      }
      if (pos) {
        places = places
          .map((pl) => ({ ...pl, distance_m: haversine(pos.lat, pos.lng, pl.lat, pl.lng) }))
          .filter((pl) => pl.lat && pl.lng && Math.abs(pl.lat) > 0.001 && Math.abs(pl.lng) > 0.001)
          .sort((a, b) => a.distance_m - b.distance_m)
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
        content: { title: 'Estás cerca', body: `Llegando a ${nearest.name}` },
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
              'Cerca de un lugar',
              `Tu compañero está llegando a ${nearest.name}`,
              { type: 'nearby', place_id: nearest.place_id }
            );
        } catch {
          // Ignore notification errors
        }
      })();
    }
  }, [enabled, pos, list]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>🎯</Text>
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Alertas Cercanas</Text>
          <Text style={styles.headerSubtitle}>
            Activa el Modo Viaje para ver lugares guardados cercanos
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.toggleButton} onPress={() => setEnabled(!enabled)}>
        <Text style={styles.toggleButtonText}>{enabled ? 'Desactivar' : 'Activar'}</Text>
      </TouchableOpacity>

      {enabled && list.length > 0 && (
        <View style={styles.placesContainer}>
          <Text style={styles.placesHeader}>{list.length} lugares encontrados cerca</Text>
          {list.slice(0, 3).map((item, index) => (
            <View key={item.id || item.place_id} style={styles.placeItem}>
              <Text style={styles.placeName}>
                {index + 1}. {item.name}
              </Text>
              {typeof item.distance_m === 'number' && (
                <Text style={styles.placeDistance}>{formatDistance(item.distance_m)}</Text>
              )}
            </View>
          ))}
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
  iconText: {
    fontSize: 20,
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

  // Toggle Button
  toggleButton: {
    backgroundColor: COLORS.secondary.amber,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  toggleButtonText: {
    color: COLORS.text.white,
    fontSize: 16,
    fontWeight: '600',
  },

  // Places List
  placesContainer: {
    marginTop: 12,
  },
  placesHeader: {
    fontSize: 14,
    color: COLORS.secondary.amberDark,
    marginBottom: 8,
  },
  placeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  placeName: {
    fontSize: 14,
    color: COLORS.secondary.amberDark,
    flex: 1,
  },
  placeDistance: {
    fontSize: 12,
    color: COLORS.secondary.amberMedium,
  },
});

export default NearbyAlerts;
