/**
 * Test script to verify country detection fixes
 * Tests Santiago, Chile coordinates against boundary detection
 */

// Antofagasta, Chile coordinates (CURRENT LOCATION)
const antofagasta = {
  latitude: -23.65,
  longitude: -70.4,
};

// Santiago, Chile coordinates
const santiago = {
  latitude: -33.4489,
  longitude: -70.6693,
};

// Buenos Aires, Argentina coordinates
const buenosAires = {
  latitude: -34.6037,
  longitude: -58.3816,
};

// Test boundaries
const CHILE_BOUNDS = {
  name: 'Chile',
  latRange: [-56.0, -17.5] as [number, number],
  lngRange: [-109.5, -66.5] as [number, number],
};

const ARGENTINA_BOUNDS = {
  name: 'Argentina',
  latRange: [-55.0, -21.8] as [number, number],
  lngRange: [-68.0, -53.6] as [number, number],
};

function isInBounds(
  lat: number,
  lng: number,
  bounds: { latRange: [number, number]; lngRange: [number, number] }
): boolean {
  const [minLat, maxLat] = bounds.latRange;
  const [minLng, maxLng] = bounds.lngRange;

  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}

function testLocation(name: string, coords: { latitude: number; longitude: number }): void {
  console.log(`\n🧪 Testing: ${name} (${coords.latitude}, ${coords.longitude})`);

  const inChile = isInBounds(coords.latitude, coords.longitude, CHILE_BOUNDS);
  const inArgentina = isInBounds(coords.latitude, coords.longitude, ARGENTINA_BOUNDS);

  console.log(`   Chile: ${inChile ? '✅ MATCH' : '❌ no match'}`);
  console.log(`   Argentina: ${inArgentina ? '✅ MATCH' : '❌ no match'}`);

  if (inChile && inArgentina) {
    console.log('   ⚠️  WARNING: Coordinates match BOTH countries!');
  }
}

console.log('🌍 Country Detection Boundary Test\n');
console.log('='.repeat(50));

testLocation('🎯 Antofagasta, Chile (CURRENT)', antofagasta);
testLocation('Santiago, Chile', santiago);
testLocation('Buenos Aires, Argentina', buenosAires);

console.log('\n' + '='.repeat(50));
console.log('\n✅ Test complete!');
