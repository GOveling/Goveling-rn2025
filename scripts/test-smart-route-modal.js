/**
 * Script para probar el SmartRouteModal con datos reales de la base de datos
 * 
 * Este script te ayudará a verificar que:
 * 1. Los lugares se cargan correctamente desde Supabase
 * 2. La conversión al formato ML funciona
 * 3. El endpoint ML responde correctamente
 */

console.log('🧪 Smart Route Modal Test Guide');
console.log('================================');

console.log('\n📋 Pasos para probar el modal:');
console.log('');
console.log('1. 🎯 Abre la app (npm start o expo start)');
console.log('2. 🏠 Ve a la pestaña "Trips"');
console.log('3. 🃏 Selecciona cualquier viaje que tenga lugares guardados');
console.log('4. 🧠 Presiona el botón "Ruta Inteligente IA" (icono 🧠)');
console.log('5. ⚙️  Configura las fechas y parámetros en el modal');
console.log('6. ✨ Presiona "Generar Itinerario IA"');
console.log('');

console.log('📊 Logs a observar en el debugger:');
console.log('');
console.log('✅ "🔄 Modal opened, loading places for trip: [tripId]"');
console.log('✅ "📍 Converted place X: {name, type, priority, duration}"');
console.log('✅ "✅ Total ML places loaded: X"');
console.log('✅ "🔥 generateItinerary called!"');
console.log('✅ "📊 Current state: {placesCount, startDate, endDate, transport}"');
console.log('✅ "📤 Sending payload to ML API: {...}"');
console.log('✅ "✅ ML API Response: {...}"');
console.log('');

console.log('🚨 Posibles problemas y soluciones:');
console.log('');
console.log('❌ "Sin lugares disponibles"');
console.log('   → Asegúrate de que el viaje tenga lugares guardados');
console.log('   → Ve a "Ver Mis lugares" y agrega algunos lugares primero');
console.log('');
console.log('❌ "Fechas requeridas"');
console.log('   → Configura fechas válidas de inicio y fin');
console.log('');
console.log('❌ "Error [status]: [message]"');
console.log('   → Verifica conexión a internet');
console.log('   → El ML API puede estar en cold start (espera ~30s y reintenta)');
console.log('');

console.log('🔧 Para debugging adicional:');
console.log('');
console.log('• Abre las Developer Tools del navegador/expo');
console.log('• Mira la consola para los logs con emojis (🔄, 📍, ✅, etc.)');
console.log('• Verifica el Network tab para ver las llamadas HTTP');
console.log('');

console.log('💡 Datos de ejemplo que deberías ver:');
console.log('');
console.log(`{
  "places": [
    {
      "id": "place-uuid",
      "name": "Nombre del lugar",
      "lat": -33.4372,
      "lon": -70.6506,
      "type": "tourist_attraction",
      "priority": 8,
      "min_duration_hours": 1.5
    }
  ],
  "start_date": "2025-01-15",
  "end_date": "2025-01-16",
  "transport_mode": "drive",
  "daily_start_hour": 9,
  "daily_end_hour": 18
}`);

console.log('');
console.log('🎉 Si ves estos logs y el modal muestra resultados, ¡todo funciona!');
console.log('');

// Helper function to test ML endpoint independently
async function testMLEndpointQuick() {
  console.log('🚀 Testing ML endpoint with minimal data...');
  
  const testPayload = {
    "places": [
      {
        "id": "test",
        "name": "Plaza de Armas",
        "lat": -33.4372,
        "lon": -70.6506,
        "type": "tourist_attraction",
        "priority": 8,
        "min_duration_hours": 1.5
      }
    ],
    "start_date": "2025-01-15",
    "end_date": "2025-01-15",
    "transport_mode": "drive",
    "daily_start_hour": 9,
    "daily_end_hour": 18,
    "max_walking_distance_km": 15.0,
    "max_daily_activities": 6,
    "preferences": {
      "culture_weight": 0.8,
      "nature_weight": 0.6,
      "food_weight": 0.9
    },
    "accommodations": []
  };

  try {
    const response = await fetch('https://goveling-ml.onrender.com/itinerary/multimodal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ ML API is working!');
      console.log('📅 Generated', result.itinerary?.length || 0, 'days');
      return true;
    } else {
      console.log('❌ ML API error:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
    return false;
  }
}

// Run quick test if called directly
if (require.main === module) {
  testMLEndpointQuick();
}

module.exports = { testMLEndpointQuick };