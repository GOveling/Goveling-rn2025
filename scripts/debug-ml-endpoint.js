/**
 * Script de Debug para probar el endpoint ML de Goveling
 * 
 * Usage: node scripts/debug-ml-endpoint.js
 */

const payload = {
  "places": [
    {
      "id": "test-1",
      "name": "Plaza de Armas",
      "lat": -33.4372,
      "lon": -70.6506,
      "type": "tourist_attraction",
      "priority": 8,
      "min_duration_hours": 1.5,
      "rating": 4.5,
      "address": "Plaza de Armas, Santiago, Chile"
    },
    {
      "id": "test-2", 
      "name": "Mercado Central",
      "lat": -33.4333,
      "lon": -70.6500,
      "type": "food",
      "priority": 7,
      "min_duration_hours": 2.0,
      "rating": 4.2
    },
    {
      "id": "test-3",
      "name": "Cerro San Cristóbal",
      "lat": -33.4267,
      "lon": -70.6333,
      "type": "viewpoint",
      "priority": 9,
      "min_duration_hours": 2.5,
      "rating": 4.8
    }
  ],
  "start_date": "2025-01-15",
  "end_date": "2025-01-16",
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

async function testMLEndpoint() {
  const url = 'https://goveling-ml.onrender.com/itinerary/multimodal';
  
  console.log('🚀 Testing ML Endpoint:', url);
  console.log('📤 Payload:', JSON.stringify(payload, null, 2));
  
  try {
    const startTime = Date.now();
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`⏱️  Response time: ${duration}ms`);
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      return;
    }
    
    const result = await response.json();
    console.log('✅ Success! Response:');
    console.log(JSON.stringify(result, null, 2));
    
    // Check response structure
    if (result.itinerary && Array.isArray(result.itinerary)) {
      console.log(`📅 Generated ${result.itinerary.length} days`);
      
      result.itinerary.forEach((day, index) => {
        console.log(`  Day ${day.day}: ${day.activities.length} activities`);
        if (day.travel_summary) {
          console.log(`    Travel: ${day.travel_summary.total_distance_km}km, ${day.travel_summary.total_travel_time_minutes}min`);
        }
      });
    }
    
    if (result.optimization_metrics) {
      console.log('🎯 Optimization metrics:', result.optimization_metrics);
    }
    
  } catch (error) {
    console.error('💥 Network error:', error.message);
  }
}

// Health check first
async function checkHealth() {
  try {
    console.log('🔍 Checking ML API Health...');
    const response = await fetch('https://goveling-ml.onrender.com/health/multimodal');
    
    if (response.ok) {
      const health = await response.json();
      console.log('✅ Health check passed:', health);
      return true;
    } else {
      console.log('⚠️  Health check failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Health check error:', error.message);
    return false;
  }
}

async function main() {
  console.log('🧪 Goveling ML API Debug Script');
  console.log('================================');
  
  // Check health first
  const isHealthy = await checkHealth();
  
  if (isHealthy) {
    console.log('\n🎯 Running main test...');
    await testMLEndpoint();
  } else {
    console.log('\n⚠️  Skipping main test due to health check failure');
    console.log('💡 The ML API may be cold starting. Try again in a few minutes.');
  }
  
  console.log('\n✨ Debug completed');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testMLEndpoint, checkHealth };