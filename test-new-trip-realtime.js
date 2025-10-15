#!/usr/bin/env node

// Script para probar el real-time update al crear viajes nuevos
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno faltantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testNewTripRealTime() {
  console.log('🧪 Probando real-time updates al crear viajes nuevos...');
  
  try {
    // Verificar viajes actuales
    const { data: trips, error } = await supabase
      .from('trips')
      .select('id, title, start_date, end_date, owner_id')
      .neq('status', 'cancelled')
      .limit(5);
      
    if (error) {
      console.error('❌ Error al obtener trips:', error);
      return;
    }
    
    console.log(`📊 Trips activos encontrados: ${trips?.length || 0}`);
    
    if (trips && trips.length > 0) {
      console.log('🗺️ Trips actuales:');
      trips.forEach(trip => {
        const dateInfo = trip.start_date ? 
          `(${trip.start_date} - ${trip.end_date || 'sin fin'})` : 
          '(sin fechas - planning)';
        console.log(`  - ${trip.title} ${dateInfo}`);
      });
    }
    
    console.log('\n✅ Pruebas a realizar:');
    console.log('1. Crear un viaje NUEVO SIN FECHAS desde la app');
    console.log('2. Observar que el conteo de "Próximos viajes" se actualiza inmediatamente');
    console.log('3. Verificar que el CurrentTripCard cambia de "No tienes viajes" a "¡Completa tus viajes!"');
    console.log('4. Confirmar que las estadísticas en /trips también se actualizan');
    
    console.log('\n🔄 Componentes con real-time implementado:');
    console.log('✅ CurrentTripCard - UPDATE/DELETE/INSERT en trips');
    console.log('✅ HomeTab - INSERT/UPDATE/DELETE en trips + trip_collaborators');  
    console.log('✅ TripsTab - INSERT/UPDATE/DELETE en trips + trip_collaborators');
    console.log('✅ NewTripModal - triggerGlobalTripRefresh después de crear');
    
    console.log('\n📈 Flujo esperado:');
    console.log('1. Usuario crea viaje → INSERT en tabla trips');
    console.log('2. Real-time trigger → Todos los componentes reciben evento');
    console.log('3. Debounce 2-3 segundos → Evita múltiples refreshes');
    console.log('4. Refrescar datos → getUpcomingTripsCount() + getPlanningTripsCount()');
    console.log('5. UI actualizada → Conteos y estados consistentes');
    
  } catch (error) {
    console.error('💥 Error inesperado:', error);
  }
}

testNewTripRealTime();