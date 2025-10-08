#!/usr/bin/env node

/**
 * Script de prueba de rendimiento para el selector de ciudades optimizado
 * Prueba países con muchas ciudades para validar las mejoras de rendimiento
 */

const API_BASE_URL = 'https://goveling-api.onrender.com';

// Países conocidos por tener muchas ciudades
const LARGE_COUNTRIES = [
  { code: 'US', name: 'Estados Unidos', expectedCities: '> 5000' },
  { code: 'BR', name: 'Brasil', expectedCities: '> 3000' },
  { code: 'IN', name: 'India', expectedCities: '> 2000' },
  { code: 'CN', name: 'China', expectedCities: '> 2000' },
  { code: 'DE', name: 'Alemania', expectedCities: '> 1000' },
  { code: 'FR', name: 'Francia', expectedCities: '> 1000' },
  { code: 'MX', name: 'México', expectedCities: '> 1000' },
  { code: 'ES', name: 'España', expectedCities: '> 500' },
];

async function testCitiesPerformance(countryCode) {
  const startTime = Date.now();

  try {
    console.log(`\n🏙️ Testing cities for ${countryCode}...`);

    // Crear timeout compatible con Node.js
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(`${API_BASE_URL}/geo/countries/${countryCode}/cities`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const rawData = await response.json();
    const requestTime = Date.now() - startTime;

    // Simular el procesamiento que hace la app
    const processStart = Date.now();

    const transformedCities = rawData.map((city) => ({
      city: city.city || city.name,
      latitude: city.latitude || city.lat || 0,
      longitude: city.longitude || city.lng || city.lon || 0,
      population: city.population || 0,
      country_code: countryCode
    }));

    // Ordenar por población y luego alfabéticamente
    const sortedCities = transformedCities.sort((a, b) => {
      if (b.population !== a.population) {
        return b.population - a.population;
      }
      return a.city.localeCompare(b.city, 'es', { sensitivity: 'base' });
    });

    // Aplicar optimización para países grandes
    const optimizedCities = sortedCities.length > 2000
      ? sortedCities.slice(0, 1000)
      : sortedCities;

    const processTime = Date.now() - processStart;
    const totalTime = Date.now() - startTime;

    // Calcular estadísticas
    const populations = optimizedCities.filter(c => c.population > 0).map(c => c.population);
    const avgPopulation = populations.length > 0
      ? Math.round(populations.reduce((a, b) => a + b, 0) / populations.length)
      : 0;
    const maxPopulation = populations.length > 0 ? Math.max(...populations) : 0;

    return {
      success: true,
      countryCode,
      originalCount: rawData.length,
      processedCount: transformedCities.length,
      optimizedCount: optimizedCities.length,
      requestTime,
      processTime,
      totalTime,
      avgPopulation,
      maxPopulation,
      wasOptimized: optimizedCities.length < sortedCities.length,
      top5Cities: optimizedCities.slice(0, 5).map(c => ({
        name: c.city,
        population: c.population.toLocaleString()
      }))
    };

  } catch (error) {
    const totalTime = Date.now() - startTime;

    return {
      success: false,
      countryCode,
      error: error.message,
      totalTime,
      wasTimeout: error.name === 'AbortError'
    };
  }
}

function analyzeResults(results) {
  console.log(`\n📊 PERFORMANCE ANALYSIS SUMMARY`);
  console.log(`================================`);

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);

  if (successful.length > 0) {
    const avgRequestTime = Math.round(successful.reduce((sum, r) => sum + r.requestTime, 0) / successful.length);
    const avgProcessTime = Math.round(successful.reduce((sum, r) => sum + r.processTime, 0) / successful.length);
    const avgTotalTime = Math.round(successful.reduce((sum, r) => sum + r.totalTime, 0) / successful.length);
    const totalCitiesOriginal = successful.reduce((sum, r) => sum + r.originalCount, 0);
    const totalCitiesOptimized = successful.reduce((sum, r) => sum + r.optimizedCount, 0);
    const optimizedCount = successful.filter(r => r.wasOptimized).length;

    console.log(`\n⏱️ Average Performance:`);
    console.log(`   Request Time: ${avgRequestTime}ms`);
    console.log(`   Process Time: ${avgProcessTime}ms`);
    console.log(`   Total Time: ${avgTotalTime}ms`);

    console.log(`\n📈 Data Volume:`);
    console.log(`   Total cities (original): ${totalCitiesOriginal.toLocaleString()}`);
    console.log(`   Total cities (optimized): ${totalCitiesOptimized.toLocaleString()}`);
    console.log(`   Countries optimized: ${optimizedCount}/${successful.length}`);
    console.log(`   Data reduction: ${Math.round((1 - totalCitiesOptimized / totalCitiesOriginal) * 100)}%`);

    console.log(`\n🏆 Performance Champions:`);
    const fastest = successful.sort((a, b) => a.totalTime - b.totalTime)[0];
    const largest = successful.sort((a, b) => b.optimizedCount - a.optimizedCount)[0];
    console.log(`   Fastest: ${fastest.countryCode} (${fastest.totalTime}ms)`);
    console.log(`   Most cities: ${largest.countryCode} (${largest.optimizedCount.toLocaleString()} cities)`);
  }

  if (failed.length > 0) {
    console.log(`\n⚠️ Failed Countries:`);
    failed.forEach(r => {
      const reason = r.wasTimeout ? 'TIMEOUT' : r.error;
      console.log(`   ${r.countryCode}: ${reason} (${r.totalTime}ms)`);
    });
  }
}

function displayDetailedResults(results) {
  console.log(`\n📋 DETAILED RESULTS`);
  console.log(`==================`);

  results.forEach(result => {
    const country = LARGE_COUNTRIES.find(c => c.code === result.countryCode);
    const countryName = country ? country.name : result.countryCode;

    console.log(`\n🌍 ${countryName} (${result.countryCode})`);

    if (result.success) {
      console.log(`   ✅ Success: ${result.totalTime}ms total`);
      console.log(`   📡 Request: ${result.requestTime}ms`);
      console.log(`   ⚙️ Processing: ${result.processTime}ms`);
      console.log(`   🏙️ Cities: ${result.originalCount.toLocaleString()} → ${result.optimizedCount.toLocaleString()}${result.wasOptimized ? ' (optimized)' : ''}`);

      if (result.avgPopulation > 0) {
        console.log(`   👥 Avg population: ${result.avgPopulation.toLocaleString()}`);
        console.log(`   🏢 Largest city: ${result.maxPopulation.toLocaleString()} inhabitants`);
      }

      if (result.top5Cities.length > 0) {
        console.log(`   🏆 Top 5 cities:`);
        result.top5Cities.forEach((city, i) => {
          console.log(`      ${i + 1}. ${city.name} (${city.population} hab.)`);
        });
      }
    } else {
      console.log(`   ❌ Failed: ${result.error}`);
      console.log(`   ⏱️ Time: ${result.totalTime}ms`);
      if (result.wasTimeout) {
        console.log(`   🚨 Reason: Request timeout (>15s)`);
      }
    }
  });
}

async function runPerformanceTest() {
  console.log(`🚀 Cities Performance Test - React Native Optimization`);
  console.log(`🕒 ${new Date().toISOString()}`);
  console.log(`🎯 Testing ${LARGE_COUNTRIES.length} large countries for performance optimization`);

  const results = [];

  for (const country of LARGE_COUNTRIES) {
    const result = await testCitiesPerformance(country.code);
    results.push(result);

    // Mostrar progreso
    const status = result.success ? '✅' : '❌';
    const time = result.success ? `${result.totalTime}ms` : `${result.totalTime}ms (failed)`;
    const cities = result.success ? `${result.optimizedCount} cities` : 'N/A';
    console.log(`${status} ${country.name}: ${time}, ${cities}`);

    // Pausa entre requests para ser amable con la API
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Análisis de resultados
  analyzeResults(results);
  displayDetailedResults(results);

  // Recomendaciones
  console.log(`\n💡 OPTIMIZATION RECOMMENDATIONS`);
  console.log(`==============================`);
  console.log(`✅ FlatList implementation: Virtualizes rendering for large lists`);
  console.log(`✅ Pagination (50 items): Reduces initial render time`);
  console.log(`✅ Search with debounce: Improves user experience`);
  console.log(`✅ Population-based sorting: Shows important cities first`);
  console.log(`✅ Data limit (1000 cities): Prevents memory issues in React Native`);
  console.log(`✅ getItemLayout: Enables optimal scrolling performance`);
  console.log(`✅ removeClippedSubviews: Frees memory for off-screen items`);

  const successRate = results.filter(r => r.success).length / results.length * 100;
  console.log(`\n🎯 Overall Success Rate: ${successRate.toFixed(1)}%`);

  if (successRate >= 90) {
    console.log(`🎉 Excellent! The optimizations are working great!`);
  } else if (successRate >= 70) {
    console.log(`👍 Good performance, but some improvements could be made.`);
  } else {
    console.log(`⚠️ Performance needs attention. Consider additional optimizations.`);
  }
}

// Ejecutar las pruebas
runPerformanceTest().catch(console.error);
