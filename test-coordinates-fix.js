#!/usr/bin/env node

// Test script para verificar la detección de países
const testCoordinates = [
  // Chile test cases
  { name: "Santiago, Chile", lat: -33.4489, lng: -70.6693, expected: "CL" },
  { name: "Valparaíso, Chile", lat: -33.0472, lng: -71.6127, expected: "CL" },
  { name: "La Serena, Chile", lat: -29.9027, lng: -71.2519, expected: "CL" },
  { name: "Antofagasta, Chile", lat: -23.6509, lng: -70.3975, expected: "CL" },
  { name: "Puerto Montt, Chile", lat: -41.4693, lng: -72.9424, expected: "CL" },
  
  // Brasil test cases
  { name: "São Paulo, Brasil", lat: -23.5505, lng: -46.6333, expected: "BR" },
  { name: "Rio de Janeiro, Brasil", lat: -22.9068, lng: -43.1729, expected: "BR" },
  { name: "Brasília, Brasil", lat: -15.7801, lng: -47.9292, expected: "BR" },
  { name: "Manaus, Brasil", lat: -3.1190, lng: -60.0217, expected: "BR" },
  
  // Edge cases (frontera)
  { name: "Frontera Chile-Brasil", lat: -25.0, lng: -72.5, expected: "CL" },
];

// Simular la función getCountryFromCoordinates
function getCountryFromCoordinates(lat, lng) {
  console.log(`🗺️ Testing coordinates lat: ${lat}, lng: ${lng}`);
  
  // USA coordinate ranges (approximate)
  if (lat >= 24.5 && lat <= 49.4 && lng >= -125.0 && lng <= -66.9) {
    console.log('🗺️ Matched USA (US)');
    return 'US';
  }

  // Chile coordinate ranges (approximate) - Check Chile before Brazil to avoid overlap
  if (lat >= -56.0 && lat <= -17.5 && lng >= -75.6 && lng <= -66.4) {
    console.log('🗺️ Matched Chile (CL)');
    return 'CL';
  }

  // Brazil coordinate ranges (approximate) - Corrected eastern boundary
  if (lat >= -33.7 && lat <= 5.3 && lng >= -73.0 && lng <= -28.6) {
    console.log('🗺️ Matched Brazil (BR)');
    return 'BR';
  }

  // Default
  console.log('🗺️ No country matched');
  return 'UNKNOWN';
}

console.log('🔍 TESTING COORDINATE DETECTION FIXES:');
console.log('');

let successCount = 0;
let totalTests = testCoordinates.length;

testCoordinates.forEach((test, index) => {
  console.log(`Test ${index + 1}: ${test.name}`);
  console.log(`  Coordinates: ${test.lat}, ${test.lng}`);
  console.log(`  Expected: ${test.expected}`);
  
  const result = getCountryFromCoordinates(test.lat, test.lng);
  console.log(`  Result: ${result}`);
  
  if (result === test.expected) {
    console.log(`  ✅ PASS`);
    successCount++;
  } else {
    console.log(`  ❌ FAIL - Expected ${test.expected}, got ${result}`);
  }
  console.log('');
});

console.log(`📊 SUMMARY: ${successCount}/${totalTests} tests passed`);
console.log('');

if (successCount === totalTests) {
  console.log('🎉 All tests passed! Chile places should now be detected correctly.');
} else {
  console.log('⚠️ Some tests failed. Additional coordinate adjustments may be needed.');
}