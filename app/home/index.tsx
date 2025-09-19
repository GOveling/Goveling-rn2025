import { useTranslation } from 'react-i18next';
export const options = { headerLargeTitle: true, headerTitle: 'Home', headerTransparent: true };
import { useTheme } from '~/lib/theme';
import React from 'react';
import HomeDaySummary from '~/components/home/HomeDaySummary';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import * as Localization from 'expo-localization';
import { getCurrentPosition, reverseCity } from '~/lib/home';
import { getWeather } from '~/lib/weather';
import { useSettings } from '~/lib/settingsStore';
import CurrentTripCard from '~/components/home/CurrentTripCard';
import NearbyAlerts from '~/components/home/NearbyAlerts';
import { registerDeviceToken } from '~/lib/push';
import { useRouter } from 'expo-router';

export default function Home(){
  const { t } = useTranslation();

  const { colors, spacing } = useTheme();

  const router = useRouter();
  const { units, toggleUnits } = useSettings();
  const [city, setCity] = React.useState<string>('—');
  const [temp, setTemp] = React.useState<number|undefined>(undefined);
  const [pos, setPos] = React.useState<{lat:number;lng:number}|null>(null);

  React.useEffect(()=>{
    registerDeviceToken().catch(()=>{});
    (async()=>{
      const p = await getCurrentPosition();
      if (p){ setPos(p); const c = await reverseCity(p.lat, p.lng); if (c) setCity(c); }
    })();
  }, []);

  React.useEffect(()=>{
    registerDeviceToken().catch(()=>{});
    (async()=>{
      if (!pos) return;
      try{ const w = await getWeather(pos.lat, pos.lng, units); setTemp(w.temp); }catch{}
    })();
  }, [pos, units]);

  const dateStr = new Date().toLocaleDateString(Localization.locale || 'es', { weekday:'long', day:'numeric', month:'long' });

  return (
    <ScrollView contentContainerStyle={{ padding:16, gap:12 }}>
      <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
        <View>
          <Text style={{ fontSize: typography.title, fontWeight:'600' }}>{city}</Text>
          <Text style={{ opacity:0.7 }}>{dateStr}</Text>
          <TouchableOpacity onPress={()=>router.push('/home/inbox')} style={{ padding:8 }}>
          <Text style={{ fontSize:22 }}>🔔</Text>
        </TouchableOpacity>
      </View>
        <TouchableOpacity onPress={toggleUnits}>
          <Text style={{ fontSize:28, fontWeight:'600' }}>{typeof temp==='number' ? Math.round(temp) : '—'}°{units.toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      <CurrentTripCard />
      <NearbyAlerts />
    </ScrollView>
  );
}
