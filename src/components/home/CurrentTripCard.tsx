import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SkeletonLine } from '~/components/ui/Skeleton';
import { Trip, getActiveOrNextTrip } from '~/lib/home';

function daysDiff(a:Date, b:Date){ return Math.ceil((a.getTime()-b.getTime())/(1000*60*60*24)); }

export default function CurrentTripCard(){
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
    <View style={{ borderWidth:1, borderColor:'#eee', borderRadius:12, padding:14 }}>
      <SkeletonLine w="50%" h={18} />
      <SkeletonLine w="80%" />
      <SkeletonLine w="40%" />
    </View>
  );

  if (!trip) return (
    <View style={{ borderWidth:1, borderColor:'#ee{t('auto.No tienes viajes')}ding:14, gap:8 }}>
      <Text style{t('auto.Crea tu primer trip para comenzar')}/Text>
      <Text style={{ opacity:0.7 }}>Crea tu primer trip para comenzar</Text>
      <TouchableOpacity onPress={()=>router.push('/trips/new')} style={{ marginTop:6, backgroundColor:'#007aff', paddingVertical:10, borderRadius{t('auto.+ New Trip')}xt style={{ color:'#fff', textAlign:'center', fontWeight:'800' }}>+ New Trip</Text>
      </TouchableOpacity>
    </View>
  );

  const flag = '🏳️'; // Placeholder: puedes derivar del primer lugar del trip
  const title = mode==='active' ? 'Trip activo' : `Próximo trip en ${countdown} días`;

  return (
    <View style={{ borderWidth:1, borderColor:'#eee', borderRadius:12, padding:14, gap:8 }}>
      <Text style={{ fontWeight:'800' }}>{title}</Text>
      <Text style={{ opacity:0.7 }}>{flag} {trip.name}</Text>
      <View style={{ flexDirection:'row', gap:8 }}>
        <TouchableOpacity onPress={()=>router.push(`/trips/${trip.id}/places`)} style={{ backgroundColor:'#007aff', paddingVertical:10, borderRadius:8, flex:1{t('auto.Ver lugares del trip')}{ color:'#fff', textAlign:'center', fontWeight:'800' }}>Ver lugares del trip</Text>
        </TouchableOpacity>
        {mode==='active' ? (
          <TouchableOpacity onPress={()=>router.push(`/trips/${trip.id}/live`)} style={{ backgroundColor:'#34c759', paddingVertical:10, borderRadius:8, flex:1 }{t('auto.Modo Travel')}t style={{ color:'#fff', textAlign:'center', fontWeight:'800' }}>Modo Travel</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}
