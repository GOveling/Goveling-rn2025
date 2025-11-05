/**
 * Test script for geo-lookup Edge Function
 * Tests country detection with real coordinates
 */

const SUPABASE_URL = 'https://iwsuyrlrbmnbfyfkqowl.supabase.co';
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/geo-lookup`;

interface TestCase {
  name: string;
  lat: number;
  lng: number;
  expected: string;
  withRegion?: boolean;
}

const testCases: TestCase[] = [
  {
    name: '🎯 Antofagasta, Chile (CURRENT LOCATION)',
    lat: -23.65,
    lng: -70.4,
    expected: 'CL',
    withRegion: true,
  },
  {
    name: 'Santiago, Chile',
    lat: -33.4489,
    lng: -70.6693,
    expected: 'CL',
    withRegion: true,
  },
  {
    name: 'Buenos Aires, Argentina',
    lat: -34.6037,
    lng: -58.3816,
    expected: 'AR',
    withRegion: true,
  },
  {
    name: 'Punta Arenas, Chile',
    lat: -53.1638,
    lng: -70.9171,
    expected: 'CL',
  },
  {
    name: 'Ushuaia, Argentina',
    lat: -54.8019,
    lng: -68.3029,
    expected: 'AR',
  },
  {
    name: 'Mendoza, Argentina (cerca frontera)',
    lat: -32.8908,
    lng: -68.8272,
    expected: 'AR',
  },
  {
    name: 'Valparaíso, Chile',
    lat: -33.0472,
    lng: -71.6127,
    expected: 'CL',
  },
  {
    name: 'Lima, Perú',
    lat: -12.0464,
    lng: -77.0428,
    expected: 'PE',
  },
  {
    name: 'La Paz, Bolivia',
    lat: -16.5,
    lng: -68.15,
    expected: 'BO',
  },
  {
    name: 'Pacific Ocean (offshore)',
    lat: -30.0,
    lng: -100.0,
    expected: 'OFFSHORE',
  },
];

async function testGeoLookup() {
  console.log('🧪 Testing geo-lookup Edge Function');
  console.log('='.repeat(70));
  console.log('');

  let passCount = 0;
  let failCount = 0;

  for (const test of testCases) {
    console.log(`📍 ${test.name}`);
    console.log(`   Coords: (${test.lat}, ${test.lng})`);

    try {
      const startTime = Date.now();

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lat: test.lat,
          lng: test.lng,
          withRegion: test.withRegion || false,
        }),
      });

      const data = await response.json();
      const elapsed = Date.now() - startTime;

      if (!response.ok) {
        console.log(`   ❌ HTTP Error ${response.status}: ${data.error}`);
        failCount++;
        console.log('');
        continue;
      }

      const actual = data.offshore ? 'OFFSHORE' : data.country_iso;
      const match = actual === test.expected;

      if (match) {
        console.log(`   ✅ PASS: ${actual}`);
        passCount++;
      } else {
        console.log(`   ❌ FAIL: Got ${actual}, expected ${test.expected}`);
        failCount++;
      }

      if (data.region_code) {
        console.log(`   🗺️  Region: ${data.region_code}`);
      }

      console.log(`   ⏱️  Time: ${elapsed}ms (cached: ${data.cached ? 'yes' : 'no'})`);

      if (data.executionTime) {
        console.log(`   🔧 Server time: ${data.executionTime}ms`);
      }

      console.log('');
    } catch (error) {
      console.log(`   ❌ Exception: ${error}`);
      failCount++;
      console.log('');
    }

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log('='.repeat(70));
  console.log(`📊 Results: ${passCount} passed, ${failCount} failed`);
  console.log('='.repeat(70));

  if (failCount === 0) {
    console.log('✅ All tests passed!');
  } else {
    console.log('❌ Some tests failed. Check the output above for details.');
  }
}

// Run tests
console.log('🌍 Geo-Lookup Edge Function Test Suite\n');
testGeoLookup().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
