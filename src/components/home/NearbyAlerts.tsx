import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTravel } from '~/lib/travelStore';
import { getCurrentPosition, getTripPlaces, getSavedPlaces, haversine } from '~/lib/home';
import * as Notifications from 'expo-notifications';
import { supabase } from '~/lib/supabase';
import { sendPush } from '~/lib/push_send';

interface NearbyAlertsProps {
  tripId?: string;
}

const NearbyAlerts = React.memo(function NearbyAlerts({ tripId }: NearbyAlertsProps) {
  const { t } = useTranslation();
  const { enabled, setEnabled } = useTravel();
  const [pos, setPos] = React.useState<{ lat: number; lng: number } | null>(null);
  const [list, setList] = React.useState<any[]>([]);

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
        } catch {}
      })();
    }
  }, [enabled, pos, list]);

  return (
    <View
      style={{
        backgroundColor: '#FEF3C7',
        borderRadius: 16,
        padding: 20,
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
        elevation: 5,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#F59E0B',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <Text style={{ fontSize: 20 }}>🎯</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#92400E', marginBottom: 4 }}>
            Alertas Cercanas
          </Text>
          <Text style={{ fontSize: 14, color: '#A16207' }}>
            Activa el Modo Viaje para ver lugares guardados cercanos
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={{
          backgroundColor: '#F59E0B',
          paddingVertical: 12,
          paddingHorizontal: 20,
          borderRadius: 12,
          alignItems: 'center',
        }}
        onPress={() => setEnabled(!enabled)}
      >
        <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
          {enabled ? 'Desactivar' : 'Activar'}
        </Text>
      </TouchableOpacity>

      {enabled && list.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <Text style={{ fontSize: 14, color: '#92400E', marginBottom: 8 }}>
            {list.length} lugares encontrados cerca
          </Text>
          {list.slice(0, 3).map((item, index) => (
            <View
              key={item.id || item.place_id}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 4,
              }}
            >
              <Text style={{ fontSize: 14, color: '#92400E', flex: 1 }}>
                {index + 1}. {item.name}
              </Text>
              {typeof item.distance_m === 'number' && (
                <Text style={{ fontSize: 12, color: '#A16207' }}>
                  {(item.distance_m / 1000).toFixed(2)} km
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
});

export default NearbyAlerts;
