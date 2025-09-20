import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Skeleton } from '~/components/ui/Skeleton';
import { Trip, getActiveOrNextTrip } from '~/lib/home';

const daysDiff = (a: Date, b: Date): number => Math.ceil((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));

const CurrentTripCard = React.memo(function CurrentTripCard() {
  const { t } = useTranslation();

  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [trip, setTrip] = React.useState<Trip|null>(null);
  const [mode, setMode] = React.useState<'none'|'future'|'active'>('none');
  const [countdown, setCountdown] = React.useState<number|null>(null);

  React.useEffect(()=>{
    (async()=>{
      setLoading(true);
      const t = await getActiveOrNextTrip();
      setTrip(t);
      if (!t){ setMode('none'); }
      else {
        const now = new Date();
        if (t.start_date && new Date(t.start_date) > now){ setMode('future'); setCountdown(daysDiff(new Date(t.start_date), now)); }
        else { setMode('active'); setCountdown(null); }
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return (
    <View style={{ 
      backgroundColor: 'white',
      borderRadius: 16,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5
    }}>
      <Skeleton width="50%" height={18} />
      <Skeleton width="80%" height={14} />
      <Skeleton width="40%" height={14} />
    </View>
  );

  if (!trip) return (
    <View style={{
      backgroundColor: 'white',
      borderRadius: 16,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5
    }}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 8 }}>
        {t('No tienes viajes')}
      </Text>
      <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>
        {t('Crea tu primer trip para comenzar')}
      </Text>
      <TouchableOpacity onPress={()=>router.push('/trips/new')}>
        <LinearGradient
          colors={['#10B981', '#059669']}
          style={{
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: 'center'
          }}
        >
          <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
            {t('+ New Trip')}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );



  const memoizedContent = React.useMemo(() => {
    const title = mode === 'active' ? '✈️ Viaje Activo' : `Próximo trip en ${countdown} días`;
    const tripName = trip?.name || 'ChileFranceJapan';

    return (
      <TouchableOpacity
        onPress={() => router.push(`/trips/${trip.id}`)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#10B981', '#3B82F6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            borderRadius: 16,
            padding: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ 
                fontSize: 16, 
                fontWeight: '600', 
                color: 'white', 
                marginBottom: 4 
              }}>
                {title}
              </Text>
              <Text style={{ 
                fontSize: 18, 
                fontWeight: '700', 
                color: 'white' 
              }}>
                {tripName}
              </Text>
            </View>
            
            <View style={{ alignItems: 'center' }}>
              <Text style={{ 
                fontSize: 16, 
                fontWeight: '600', 
                color: 'white' 
              }}>
                📍 Test SA
              </Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }, [trip, mode, countdown, router, t]);

  return memoizedContent;
});

export default CurrentTripCard;
