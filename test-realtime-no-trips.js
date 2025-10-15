#!/usr/bin/env node

// Script para probar la actualización en tiempo real al eliminar viajes
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno faltantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRealTimeUpdates() {
  console.log('🧪 Probando actualizaciones en tiempo real...');
  
  try {
    // Primero verificar si hay trips
    const { data: trips, error } = await supabase
      .from('trips')
      .select('*')
      .limit(5);
      
    if (error) {
      console.error('❌ Error al obtener trips:', error);
      return;
    }
    
    console.log(`📊 Trips encontrados: ${trips?.length || 0}`);
    
    if (trips && trips.length > 0) {
      console.log('🗺️ Ejemplo de trips:');
      trips.forEach(trip => {
        console.log(`  - ${trip.title} (${trip.id})`);
      });
    }
    
    console.log('\n✅ Verifica en la app:');
    console.log('1. Ve al Home y observa el estado actual');
    console.log('2. Ve a /trips y elimina todos los viajes');
    console.log('3. Regresa al Home - debería mostrar "No tienes viajes" inmediatamente');
    console.log('4. El botón debería decir "+ Nuevo Viaje" (no "+ New Trip")');
    console.log('5. El mensaje debería decir "Crea tu primer viaje para comenzar" (no "trip")');
    
  } catch (error) {
    console.error('💥 Error inesperado:', error);
  }
}

testRealTimeUpdates();