console.log('🚀 Testing Cities Selector Optimization');

// Test básico de fetch con timeout
async function testAPI() {
  const testCountry = 'CL';
  const url = `https://goveling-api.onrender.com/geo/countries/${testCountry}/cities`;
  
  console.log(`\n📍 Testing endpoint: ${url}`);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    console.log(`✅ Response status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`📦 Cities received: ${data.length}`);
      
      if (data.length > 0) {
        console.log(`🏙️ First 3 cities:`, data.slice(0, 3).map(c => c.city || c.name));
      }
    } else {
      console.log(`❌ API request failed with status: ${response.status}`);
    }
    
  } catch (error) {
    console.log(`❌ Error:`, error.message);
  }
}

testAPI().then(() => {
  console.log('\n✅ Test completed');
}).catch(error => {
  console.error('❌ Test failed:', error);
});
