import { Platform, TextInput, View as RNView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
export const options = { headerLargeTitle: true, headerTitle: 'Explore', headerTransparent: true };
import { Sheet } from '~/components/ui/BottomSheet';
import { Segmented } from '~/components/ui/Segmented';
import { EmptyState } from '~/components/ui/EmptyState';
import { useTheme } from '~/lib/theme';

// === Enhanced filters (categories, open_now, rating, order, radius chips) ===
import React from 'react';
import { View, Text, Button, FlatList, TouchableOpacity, ScrollView } from 'react-native';

const CATS = ['restaurant','cafe','museum','park','bar','shopping_mall','airport'];
const RADII = [500,1000,2000];
const ORDERS = ['relevance','distance','rating'];

export default function Explore(){
  const [search, setSearch] = React.useState('');

  const navigation = useNavigation();

  const { t } = useTranslation();

  const [segIndex, setSegIndex] = React.useState(0);
  const categories = ['All','Attractions','Food','Shopping','Museums'];

  const { colors, spacing } = useTheme();

  const [q, setQ] = React.useState('');
  const [lat, setLat] = React.useState<number|null>(null);
  const [lng, setLng] = React.useState<number|null>(null);
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Filters
  const [cats, setCats] = React.useState<string[]>([]);
  const [openNow, setOpenNow] = React.useState(false);
  const [minRating, setMinRating] = React.useState<number>(0);
  const [radius, setRadius] = React.useState<number>(1000);
  const [order, setOrder] = React.useState<'relevance'|'distance'|'rating'>('distance');

  function toggleCat(c:string){
    setCats(prev => prev.includes(c) ? prev.filter(x=> x!==c) : [...prev, c]);
  }

  async function nearMe(){
    navigator.geolocation.getCurrentPosition(({coords})=>{
      setLat(coords.latitude); setLng(coords.longitude);
    });
  }

  async function performSearch(){
    setLoading(true);
    const url = process.env.EXPO_PUBLIC_PLACES_API || '/functions/v1/places-search';
    const res = await fetch(url, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ q, lat, lng, radius, categories: cats, open_now: openNow, min_rating: minRating, order })
    });
    const j = await res.json();
    let results = j.results || [];
    // client-side filter guard
    if (minRating>0) results = results.filter((r:any)=> (r.rating||0) >= minRating);
    setItems(results);
    setLoading(false);
  }

  return (
    <View style={{padding:16, gap:8}}>
      <Text style={{fontSize:18, fontWeight:'800'}}>{t('explore.title')}</Text>
      <TextInput placeholder="Buscar…" value={q} onChangeText={setQ} style={{borderWidth:1, borderColor:'#ddd', borderRadius:8, padding:10}} />
      <View style={{flexDirection:'row', gap:8}}>
        <Button title="Near me" onPress={nearMe} />
        <Button title={loading ? 'Buscando…' : 'Buscar'} onPress={performSearch} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginVertical:8}}>
        {CATS.map(c=> (
          <TouchableOpacity key={c} onPress={()=> toggleCat(c)} style={{ paddingVertical:6, paddingHorizontal:10, borderRadius:999, marginRight:8, backgroundColor: cats.includes(c)? '#111827':'#e5e7eb' }}>
            <Text style={{ color: cats.includes(c)?'#fff':'#111827' }}>{c}</Text>
          </TouchableOpacity>
        ))}
      
{/* v153 Empty state fallback */}
{(Array.isArray(items) && items.length===0) ? (
  <EmptyState title="No hay resultados" subtitle="Prueba con otro término o ajusta filtros" />
): null}
</ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:8}}>
        {RADII.map(r=> (
          <TouchableOpacity key={r} onPress={()=> setRadius(r)} style={{ paddingVertical:6, paddingHorizontal:10, borderRadius:999, marginRight:8, backgroundColor: radius===r? '#2563eb':'#e5e7eb' }}>
            <Text style={{ color: radius===r?'#fff':'#111827' }}>{r} m</Text>
          </TouchableOpacity>
        ))}
        {ORDERS.map(o=> (
          <TouchableOpacity key={o} onPress={()=> setOrder(o as any)} style={{ paddingVertical:6, paddingHorizontal:10, borderRadius:999, marginRight:8, backgroundColor: order===o? '#059669':'#e5e7eb' }}>
            <Text style={{ color: order===o?'#fff':'#111827' }}>{o}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={()=> setOpenNow(x=> !x)} style={{ paddingVertical:6, paddingHorizontal:10, borderRadius:999, marginRight:8, backgroundColor: openNow? '#f59e0b':'#e5e7eb' }}>
          <Text style={{ color: openNow?'#fff':'#111827' }}>{openNow? 'Open now ✓':'Open now'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={()=> setMinRating(r=> (r>=4.5?0:(r+0.5)))} style={{ paddingVertical:6, paddingHorizontal:10, borderRadius:999, marginRight:8, backgroundColor: '#e5e7eb' }}>
          <Text style={{ color:'#111827' }}>min ★ {minRating.toFixed(1)}</Text>
        </TouchableOpacity>
      </ScrollView>

      <FlatList
        data={items}
        keyExtractor={(it)=> it.place_id || it.reference || String(Math.random())}
        renderItem={({item})=> (
          <View style={{paddingVertical:10, borderBottomWidth:1, borderBottomColor:'#eee'}}>
            <Text style={{fontWeight:'700'}}>{item.name}</Text>
            <Text style={{opacity:0.7}}>{item.vicinity || item.formatted_address}</Text>
            {item.rating ? <Text>★ {item.rating}</Text> : null}
          </View>
        )}
      />
    </View>
  );
}

// v154: Filtros en BottomSheet
// <Sheet><Text{t('auto.Controles de filtro aquí (abierto ahora, rating, radio, etc.)')}</Sheet>

// v156: connect native search bar
React.useEffect(()=>{
  navigation.setOptions({
    headerSearchBarOptions: {
      placeholder: 'Search places',
      hideWhenScrolling: false,
      autoFocus: false,
      onChangeText: ({ nativeEvent }) => setSearch(nativeEvent.text || '')
    }
  });
}, [navigation]);
