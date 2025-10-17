import React from 'react';

import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';

import { useRouter } from 'expo-router';

import { useTranslation } from 'react-i18next';

import { getTodayISO } from '~/lib/dates';
import { supabase } from '~/lib/supabase';

type RouteCache = { day_iso: string; places: any[]; summary?: any };

async function fetchActiveTrip() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  // Trip más cercano activo (start<=today<=end)
  const { data } = await supabase
    .from('trips')
    .select('*')
    .eq('user_id', user.id)
    .order('start_date', { ascending: true });
  const today = new Date();
  const active = (data || []).find(
    (t: any) => new Date(t.start_date) <= today && today <= new Date(t.end_date)
  );
  return active || null;
}

async function fetchRouteCache(trip_id: string, day_iso: string) {
  const { data } = await supabase
    .from('route_cache')
    .select('*')
    .eq('trip_id', trip_id)
    .eq('day_iso', day_iso)
    .maybeSingle();
  return data;
}

const HomeDaySummary = React.memo(function HomeDaySummary() {
  const { t } = useTranslation();

  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [trip, setTrip] = React.useState<any>(null);
  const [cache, setCache] = React.useState<RouteCache | null>(null);
  const [progress, setProgress] = React.useState<{ done: number; total: number; next?: any }>({
    done: 0,
    total: 0,
  });

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      const t = await fetchActiveTrip();
      if (!t) {
        setTrip(null);
        setCache(null);
        setLoading(false);
        return;
      }
      setTrip(t);
      const dayISO = getTodayISO(t.timezone || 'UTC');
      const rc: any = await fetchRouteCache(t.id, dayISO);
      setCache(rc);
      const items = (rc?.places || []).filter((p: any) => p.type === 'place');
      const total = items.length;
      let done = 0;
      let next = null;
      for (const it of items) {
        if (it.visited_at) done++;
        else {
          next = next || it;
        }
      }
      setProgress({ done, total, next });
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingSkeleton1} />
        <View style={styles.loadingSkeleton2} />
      </View>
    );
  }

  if (!trip || !cache) return null;

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('Resumen de hoy')}</Text>
      <Text style={styles.subtitle}>
        {trip.title || 'Trip'} — {progress.done}/{progress.total} visitados ({pct}%)
      </Text>
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
      </View>
      {progress.next ? (
        <View style={styles.rowContainer}>
          <View>
            <Text style={styles.nextLabel}>{t('Siguiente:')}</Text>
            <Text style={styles.nextName}>{progress.next.name}</Text>
          </View>
          <TouchableOpacity
            onPress={() =>
              Alert.alert('Live Mode', 'Funcionalidad de modo live próximamente disponible')
            }
            style={styles.travelModeButton}
          >
            <Text style={styles.travelModeButtonText}>{t('Abrir Travel Mode')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.rowContainer}>
          <Text style={styles.completedText}>{t('¡Itinerario completado! 🎉')}</Text>
          <TouchableOpacity
            onPress={() => Alert.alert('Route', 'Funcionalidad de rutas próximamente disponible')}
            style={styles.routeButton}
          >
            <Text style={styles.routeButtonText}>{t('Ver ruta')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  // Loading State
  loadingContainer: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
  },
  loadingSkeleton1: {
    width: '45%',
    height: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    marginBottom: 8,
  },
  loadingSkeleton2: {
    width: '80%',
    height: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
  },

  // Main Container
  container: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
    gap: 10,
  },

  // Text Styles
  title: {
    fontWeight: '900',
    fontSize: 16,
  },
  subtitle: {
    opacity: 0.8,
  },

  // Progress Bar
  progressBarContainer: {
    height: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarFill: {
    backgroundColor: '#34c759',
    height: 8,
  },

  // Next/Completed Section
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextLabel: {
    fontWeight: '700',
  },
  nextName: {
    opacity: 0.8,
  },
  completedText: {
    fontWeight: '700',
  },

  // Buttons
  travelModeButton: {
    backgroundColor: '#007aff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  travelModeButtonText: {
    color: '#fff',
    fontWeight: '800',
  },
  routeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  routeButtonText: {
    fontWeight: '800',
  },
});

export default HomeDaySummary;
