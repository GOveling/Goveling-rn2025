// Script de prueba rápida para verificar optimizaciones de ciudades
const testCountry = 'US'; // Estados Unidos tiene muchas ciudades

fetch(`https://goveling-api.onrender.com/geo/countries/${testCountry}/cities`)
  .then(response => response.json())
  .then(data => {
    console.log(`✅ ${testCountry}: ${data.length} ciudades cargadas`);

    // Simular el procesamiento optimizado
    const processed = data.map(city => ({
      city: city.city || city.name,
      population: city.population || 0,
      latitude: city.latitude || city.lat || 0,
      longitude: city.longitude || city.lng || city.lon || 0,
    }));

    // Ordenar por población
    const sorted = processed.sort((a, b) => b.population - a.population);

    // Aplicar límite si es necesario
    const optimized = sorted.length > 2000 ? sorted.slice(0, 1000) : sorted;

    console.log(`🏙️ Top 10 ciudades más pobladas en ${testCountry}:`);
    optimized.slice(0, 10).forEach((city, i) => {
      console.log(`${i + 1}. ${city.city}: ${city.population.toLocaleString()} habitantes`);
    });

    console.log(`📊 Resumen: ${data.length} → ${optimized.length} ciudades (reducción: ${Math.round((1 - optimized.length / data.length) * 100)}%)`);
  })
  .catch(error => {
    console.error('❌ Error:', error.message);
  });
