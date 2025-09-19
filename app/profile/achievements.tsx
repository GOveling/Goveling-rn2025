import { useTranslation } from 'react-i18next';
export const options = { headerLargeTitle: true, headerTitle: 'Profile', headerTransparent: true };
import { EmptyState } from '../../src/components/ui/EmptyState';
import { useTheme } from '../../src/lib/theme';
import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { supabase } from '~/lib/supabase';

export default function Achievements(){
  const { t } = useTranslation();

  const { colors, spacing } = useTheme();

  const [stats,setStats]=React.useState<any>(null);
  const [badges,setBadges]=React.useState<any[]>([]);

  React.useEffect(()=>{ (async()=>{
    const { data: u } = await supabase.auth.getUser();
    const uid = u?.user?.id;
    const { data: s } = await supabase.from('travel_stats').select('*').eq('user_id', uid).maybeSingle();
    setStats(s||{countries_count:0,cities_count:0,places_count:0});
    const { data: b } = await supabase.from('travel_badges').select('*').order('threshold',{ascending:true});
    setBadges(b||[]);
  })(); }, []);

  const earned = (code:string, threshold:number)=>{
    const v = (stats?.countries_count||0) if code=='globetrotter' else (stats?.cities_count||0) if code=='cityhopper' else (stats?.places_count||0);
    return v >= threshold;
  };

  return (
    <View style={{ flex:1, padding:12, gap:8 }}>
      <Text style={{ fontSize:22, fontWeight:'900' }}{t('auto.Estadísticas de viaje')}
      <View style={{ flexDirection:'row', gap:12 }}>
        <Stat label="Países" value={stats?.countries_count||0} />
        <Stat label="Ciudades" value={stats?.cities_count||0} />
        <Stat label="Lugares" value={stats?.places_count||0} />
      
{/* v153 Empty state fallback */}
{(Array.isArray(items) && items.length===0) ? (
  <EmptyState title="Aún sin logros" subtitle="Activa Travel Mode y empieza a sumar" />
): null}
</View>
      <Text style={{ marginTop:12, fontWeight:'700' }}{t('auto.Logros')}
      <FlatList
        data={badges}
        keyExtractor={(i)=>String(i.id)}
        renderItem={({ item })=> (
          <View style={{ paddingVertical:8, borderBottomWidth:1, borderColor:'#f2f2f2', flexDirection:'row', justifyContent:'space-between' }}>
            <Text>{item.name} — {item.description}</Text>
            <Text style={{ fontWeight:'700', color: earned(item.code, item.threshold) ? '#34c759':'#999' }}>{earned(item.code, item.threshold)? '✓':'—'}</Text>
          </View>
        )}
      />
    </View>
  );
}

function Stat({label, value}:{label:string; value:number}){
  return (
    <View style={{ padding:10, borderWidth:1, borderColor:'#eee', borderRadius:10, minWidth:100 }}>
      <Text style={{ fontSize:18, fontWeight:'900' }}>{value}</Text>
      <Text style={{ opacity:0.7 }}>{label}</Text>
    </View>
  );
}
