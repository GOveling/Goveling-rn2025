#!/usr/bin/env node

// Test script para verificar la lógica de conteo de viajes grupales
// Ejecutar con: node test-group-trips-logic.js

// Simular datos de trips como los que vendrían de Supabase
const mockTripsData = [
  {
    id: '1',
    title: 'Viaje Individual a París',
    owner_id: 'user123',
    start_date: '2025-12-01',
    collaborators: [] // Sin colaboradores = viaje individual
  },
  {
    id: '2', 
    title: 'Viaje Grupal a Barcelona',
    owner_id: 'user123',
    start_date: '2025-11-15',
    collaborators: [
      { user_id: 'user456' },
      { user_id: 'user789' }
    ] // Con colaboradores = viaje grupal
  },
  {
    id: '3',
    title: 'Viaje Solo a Roma',
    owner_id: 'user123', 
    start_date: '2024-05-01', // Fecha pasada
    collaborators: [] // Sin colaboradores = viaje individual
  }
];

function calculateTripStats(trips) {
  console.log('🔍 Análisis de trips:');
  
  const totalTrips = trips.length;
  console.log(`📈 Total de viajes: ${totalTrips}`);
  
  // Viajes próximos (start_date es en el futuro)
  const upcomingTrips = trips.filter(trip => {
    if (!trip.start_date) return false;
    const isUpcoming = new Date(trip.start_date) > new Date();
    console.log(`📅 "${trip.title}" - ${trip.start_date} - ${isUpcoming ? 'PRÓXIMO' : 'PASADO'}`);
    return isUpcoming;
  }).length;
  
  console.log(`🔮 Viajes próximos: ${upcomingTrips}`);
  
  // Viajes grupales (con colaboradores)
  console.log('\n🤝 Análisis de viajes grupales:');
  const groupTrips = trips.filter(trip => {
    const collaboratorsCount = trip.collaborators?.length || 0;
    const isGroup = collaboratorsCount > 0;
    console.log(`   "${trip.title}": ${collaboratorsCount} colaboradores ${isGroup ? '✅ GRUPAL' : '❌ INDIVIDUAL'}`);
    return isGroup;
  }).length;
  
  const stats = {
    totalTrips,
    upcomingTrips,
    groupTrips
  };
  
  console.log('\n📊 ESTADÍSTICAS FINALES:', stats);
  return stats;
}

console.log('🧪 Test de lógica de viajes grupales\n');
console.log('Datos de entrada:', JSON.stringify(mockTripsData, null, 2));
console.log('\n--- ANÁLISIS ---');

const result = calculateTripStats(mockTripsData);

console.log('\n--- VERIFICACIÓN ---');
console.log('✅ Esperado: groupTrips = 1 (solo el viaje a Barcelona tiene colaboradores)');
console.log(`${result.groupTrips === 1 ? '✅' : '❌'} Resultado: groupTrips = ${result.groupTrips}`);

console.log('\n--- CONCLUSIÓN ---');
if (result.groupTrips === 1) {
  console.log('🎉 La lógica está funcionando correctamente');
  console.log('🔍 Si sigue mostrando 1 en la app, verificar:');
  console.log('   1. ¿El trip existente tiene colaboradores en la BD?');
  console.log('   2. ¿La consulta SQL está retornando los colaboradores?');
  console.log('   3. ¿El owner_id del trip coincide con el usuario logueado?');
} else {
  console.log('❌ Hay un error en la lógica');
}
