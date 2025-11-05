#!/usr/bin/env node
/**
 * Global Geo-Detection Testing Script
 * Tests the Edge Function geo-lookup across all continents
 *
 * Usage: node test-geo-global.js
 */

const EDGE_FUNCTION_URL = 'https://iwsuyrlrbmnbfyfkqowl.supabase.co/functions/v1/geo-lookup';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3c3V5cmxyYm1uYmZ5Zmtxb3dsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNjM4NTcsImV4cCI6MjA3MzgzOTg1N30.qC14nN1H4JcsubN31he9Y9VUWa3Dl1sDY28iAyKcIPg';

// 50+ test locations across all continents
const TEST_LOCATIONS = [
  // ==================== SOUTH AMERICA ====================
  { name: 'Santiago, Chile', lat: -33.4489, lng: -70.6693, expected: 'CL' },
  { name: 'Antofagasta, Chile (Bug Location)', lat: -23.6509, lng: -70.3975, expected: 'CL' },
  { name: 'Punta Arenas, Chile (South)', lat: -53.1638, lng: -70.9171, expected: 'CL' },
  { name: 'Valparaíso, Chile (Coast)', lat: -33.0472, lng: -71.6127, expected: 'CL' },
  { name: 'Buenos Aires, Argentina', lat: -34.6037, lng: -58.3816, expected: 'AR' },
  { name: 'Mendoza, Argentina (Chile Border)', lat: -32.8895, lng: -68.8458, expected: 'AR' },
  { name: 'Ushuaia, Argentina (Southernmost)', lat: -54.8019, lng: -68.3029, expected: 'AR' },
  { name: 'São Paulo, Brazil', lat: -23.5505, lng: -46.6333, expected: 'BR' },
  { name: 'Rio de Janeiro, Brazil', lat: -22.9068, lng: -43.1729, expected: 'BR' },
  { name: 'Brasília, Brazil', lat: -15.8267, lng: -47.9218, expected: 'BR' },
  { name: 'Manaus, Brazil (Amazon)', lat: -3.119, lng: -60.0217, expected: 'BR' },
  { name: 'Lima, Peru', lat: -12.0464, lng: -77.0428, expected: 'PE' },
  { name: 'Cusco, Peru', lat: -13.5319, lng: -71.9675, expected: 'PE' },
  { name: 'Bogotá, Colombia', lat: 4.711, lng: -74.0721, expected: 'CO' },
  { name: 'Cartagena, Colombia', lat: 10.391, lng: -75.4794, expected: 'CO' },
  { name: 'Caracas, Venezuela', lat: 10.4806, lng: -66.9036, expected: 'VE' },
  { name: 'Quito, Ecuador', lat: -0.1807, lng: -78.4678, expected: 'EC' },
  { name: 'La Paz, Bolivia', lat: -16.5, lng: -68.15, expected: 'BO' },
  { name: 'Asunción, Paraguay', lat: -25.2637, lng: -57.5759, expected: 'PY' },
  { name: 'Montevideo, Uruguay', lat: -34.9011, lng: -56.1645, expected: 'UY' },

  // ==================== NORTH AMERICA ====================
  { name: 'New York, USA', lat: 40.7128, lng: -74.006, expected: 'US' },
  { name: 'Los Angeles, USA', lat: 34.0522, lng: -118.2437, expected: 'US' },
  { name: 'Chicago, USA', lat: 41.8781, lng: -87.6298, expected: 'US' },
  { name: 'Miami, USA', lat: 25.7617, lng: -80.1918, expected: 'US' },
  { name: 'Seattle, USA (Canada Border)', lat: 47.6062, lng: -122.3321, expected: 'US' },
  { name: 'Anchorage, Alaska', lat: 61.2181, lng: -149.9003, expected: 'US' },
  { name: 'Toronto, Canada', lat: 43.6532, lng: -79.3832, expected: 'CA' },
  { name: 'Vancouver, Canada', lat: 49.2827, lng: -123.1207, expected: 'CA' },
  { name: 'Montreal, Canada', lat: 45.5017, lng: -73.5673, expected: 'CA' },
  { name: 'Mexico City, Mexico', lat: 19.4326, lng: -99.1332, expected: 'MX' },
  { name: 'Cancún, Mexico', lat: 21.1619, lng: -86.8515, expected: 'MX' },
  { name: 'Guadalajara, Mexico', lat: 20.6597, lng: -103.3496, expected: 'MX' },

  // ==================== EUROPE ====================
  { name: 'London, UK', lat: 51.5074, lng: -0.1278, expected: 'GB' },
  { name: 'Edinburgh, Scotland', lat: 55.9533, lng: -3.1883, expected: 'GB' },
  { name: 'Paris, France', lat: 48.8566, lng: 2.3522, expected: 'FR' },
  { name: 'Marseille, France', lat: 43.2965, lng: 5.3698, expected: 'FR' },
  { name: 'Berlin, Germany', lat: 52.52, lng: 13.405, expected: 'DE' },
  { name: 'Munich, Germany', lat: 48.1351, lng: 11.582, expected: 'DE' },
  { name: 'Madrid, Spain', lat: 40.4168, lng: -3.7038, expected: 'ES' },
  { name: 'Barcelona, Spain', lat: 41.3851, lng: 2.1734, expected: 'ES' },
  { name: 'Rome, Italy', lat: 41.9028, lng: 12.4964, expected: 'IT' },
  { name: 'Milan, Italy', lat: 45.4642, lng: 9.19, expected: 'IT' },
  { name: 'Amsterdam, Netherlands', lat: 52.3676, lng: 4.9041, expected: 'NL' },
  { name: 'Brussels, Belgium', lat: 50.8503, lng: 4.3517, expected: 'BE' },
  { name: 'Moscow, Russia', lat: 55.7558, lng: 37.6173, expected: 'RU' },
  { name: 'St. Petersburg, Russia', lat: 59.9343, lng: 30.3351, expected: 'RU' },
  { name: 'Stockholm, Sweden', lat: 59.3293, lng: 18.0686, expected: 'SE' },
  { name: 'Oslo, Norway', lat: 59.9139, lng: 10.7522, expected: 'NO' },
  { name: 'Copenhagen, Denmark', lat: 55.6761, lng: 12.5683, expected: 'DK' },
  { name: 'Athens, Greece', lat: 37.9838, lng: 23.7275, expected: 'GR' },
  { name: 'Lisbon, Portugal', lat: 38.7223, lng: -9.1393, expected: 'PT' },
  { name: 'Vienna, Austria', lat: 48.2082, lng: 16.3738, expected: 'AT' },
  { name: 'Helsinki, Finland', lat: 60.1699, lng: 24.9384, expected: 'FI' },
  { name: 'Warsaw, Poland', lat: 52.2297, lng: 21.0122, expected: 'PL' },
  { name: 'Prague, Czech Republic', lat: 50.0755, lng: 14.4378, expected: 'CZ' },
  { name: 'Zurich, Switzerland', lat: 47.3769, lng: 8.5417, expected: 'CH' },

  // ==================== ASIA ====================
  { name: 'Tokyo, Japan', lat: 35.6762, lng: 139.6503, expected: 'JP' },
  { name: 'Osaka, Japan', lat: 34.6937, lng: 135.5023, expected: 'JP' },
  { name: 'Beijing, China', lat: 39.9042, lng: 116.4074, expected: 'CN' },
  { name: 'Shanghai, China', lat: 31.2304, lng: 121.4737, expected: 'CN' },
  { name: 'Hong Kong', lat: 22.3193, lng: 114.1694, expected: 'HK' },
  { name: 'Macao', lat: 22.1987, lng: 113.5439, expected: 'MO' },
  { name: 'Seoul, South Korea', lat: 37.5665, lng: 126.978, expected: 'KR' },
  { name: 'Singapore', lat: 1.3521, lng: 103.8198, expected: 'SG' },
  { name: 'Bangkok, Thailand', lat: 13.7563, lng: 100.5018, expected: 'TH' },
  { name: 'Kuala Lumpur, Malaysia', lat: 3.139, lng: 101.6869, expected: 'MY' },
  { name: 'Jakarta, Indonesia', lat: -6.2088, lng: 106.8456, expected: 'ID' },
  { name: 'Manila, Philippines', lat: 14.5995, lng: 120.9842, expected: 'PH' },
  { name: 'Mumbai, India', lat: 19.076, lng: 72.8777, expected: 'IN' },
  { name: 'New Delhi, India', lat: 28.6139, lng: 77.209, expected: 'IN' },
  { name: 'Dubai, UAE', lat: 25.2048, lng: 55.2708, expected: 'AE' },
  { name: 'Tel Aviv, Israel', lat: 32.0853, lng: 34.7818, expected: 'IL' },
  { name: 'Istanbul, Turkey', lat: 41.0082, lng: 28.9784, expected: 'TR' },

  // ==================== AFRICA ====================
  { name: 'Cairo, Egypt', lat: 30.0444, lng: 31.2357, expected: 'EG' },
  { name: 'Lagos, Nigeria', lat: 6.5244, lng: 3.3792, expected: 'NG' },
  { name: 'Nairobi, Kenya', lat: -1.2864, lng: 36.8172, expected: 'KE' },
  { name: 'Cape Town, South Africa', lat: -33.9249, lng: 18.4241, expected: 'ZA' },
  { name: 'Johannesburg, South Africa', lat: -26.2041, lng: 28.0473, expected: 'ZA' },
  { name: 'Casablanca, Morocco', lat: 33.5731, lng: -7.5898, expected: 'MA' },
  { name: 'Addis Ababa, Ethiopia', lat: 9.032, lng: 38.7469, expected: 'ET' },

  // ==================== OCEANIA ====================
  { name: 'Sydney, Australia', lat: -33.8688, lng: 151.2093, expected: 'AU' },
  { name: 'Melbourne, Australia', lat: -37.8136, lng: 144.9631, expected: 'AU' },
  { name: 'Brisbane, Australia', lat: -27.4698, lng: 153.0251, expected: 'AU' },
  { name: 'Perth, Australia', lat: -31.9505, lng: 115.8605, expected: 'AU' },
  { name: 'Auckland, New Zealand', lat: -36.8485, lng: 174.7633, expected: 'NZ' },
  { name: 'Wellington, New Zealand', lat: -41.2865, lng: 174.7762, expected: 'NZ' },

  // ==================== EDGE CASES ====================
  { name: 'Equator (Ecuador)', lat: 0.0, lng: -78.4678, expected: 'EC' },
  { name: 'North Cape, Norway (Arctic)', lat: 71.1725, lng: 25.7844, expected: 'NO' },
  { name: 'Iceland (Mid-Atlantic)', lat: 64.1466, lng: -21.9426, expected: 'IS' },
  { name: 'Fiji Islands', lat: -17.7134, lng: 178.065, expected: 'FJ' },
];

// ANSI color codes
const COLORS = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

async function testLocation(location) {
  const startTime = Date.now();

  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        lat: location.lat,
        lng: location.lng,
      }),
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      return {
        ...location,
        success: false,
        error: `HTTP ${response.status}`,
        duration,
      };
    }

    const data = await response.json();

    const success = data.country_iso === location.expected;

    return {
      ...location,
      success,
      actual: data.country_iso,
      region: data.region_code,
      duration,
      method: data.cached ? '📦 Cache' : '🎯 PIP',
      offshore: data.offshore,
    };
  } catch (error) {
    return {
      ...location,
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
    };
  }
}

async function runTests() {
  console.log(`${COLORS.bold}${COLORS.blue}
╔══════════════════════════════════════════════════════════════════════╗
║              🌍 GLOBAL GEO-DETECTION TEST SUITE 🌍                  ║
║                                                                      ║
║  Testing ${TEST_LOCATIONS.length} locations across all continents                      ║
╚══════════════════════════════════════════════════════════════════════╝
${COLORS.reset}`);

  const results = [];
  let passed = 0;
  let failed = 0;
  let totalDuration = 0;

  // Test each location
  for (let i = 0; i < TEST_LOCATIONS.length; i++) {
    const location = TEST_LOCATIONS[i];
    process.stdout.write(
      `\r[${i + 1}/${TEST_LOCATIONS.length}] Testing ${location.name}...`.padEnd(80)
    );

    const result = await testLocation(location);
    results.push(result);

    if (result.success) {
      passed++;
    } else {
      failed++;
    }

    totalDuration += result.duration;

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log('\n');

  // Print results by continent
  const continents = {
    '🌎 SOUTH AMERICA': results.filter((r) =>
      ['CL', 'AR', 'BR', 'PE', 'CO', 'VE', 'EC', 'BO', 'PY', 'UY'].includes(r.expected)
    ),
    '🌎 NORTH AMERICA': results.filter((r) => ['US', 'CA', 'MX'].includes(r.expected)),
    '🌍 EUROPE': results.filter((r) =>
      [
        'GB',
        'FR',
        'DE',
        'ES',
        'IT',
        'NL',
        'BE',
        'RU',
        'SE',
        'NO',
        'DK',
        'GR',
        'PT',
        'AT',
        'IS',
        'FI',
        'PL',
        'CZ',
        'CH',
      ].includes(r.expected)
    ),
    '🌏 ASIA': results.filter((r) =>
      ['JP', 'CN', 'HK', 'KR', 'SG', 'TH', 'MY', 'ID', 'PH', 'IN', 'AE', 'IL', 'TR', 'MO'].includes(
        r.expected
      )
    ),
    '🌍 AFRICA': results.filter((r) => ['EG', 'NG', 'KE', 'ZA', 'MA', 'ET'].includes(r.expected)),
    '🌏 OCEANIA': results.filter((r) => ['AU', 'NZ', 'FJ'].includes(r.expected)),
  };

  Object.entries(continents).forEach(([continent, locations]) => {
    if (locations.length === 0) return;

    console.log(`\n${COLORS.bold}${continent}${COLORS.reset}`);
    console.log('─'.repeat(70));

    locations.forEach((result) => {
      const icon = result.success
        ? `${COLORS.green}✓${COLORS.reset}`
        : `${COLORS.red}✗${COLORS.reset}`;
      const status = result.success
        ? `${COLORS.green}${result.actual}${COLORS.reset}`
        : `${COLORS.red}${result.actual || result.error}${COLORS.reset} (expected ${result.expected})`;

      console.log(
        `${icon} ${result.name.padEnd(35)} ${status.padEnd(20)} ${result.method || ''} ${result.duration}ms`
      );

      if (result.region && result.success) {
        console.log(`  ${COLORS.blue}└─ Region: ${result.region}${COLORS.reset}`);
      }
    });
  });

  // Summary
  const avgDuration = (totalDuration / results.length).toFixed(0);
  const successRate = ((passed / results.length) * 100).toFixed(1);

  console.log(`\n${COLORS.bold}
╔══════════════════════════════════════════════════════════════════════╗
║                           📊 SUMMARY                                 ║
╠══════════════════════════════════════════════════════════════════════╣
║  Total Tests:         ${results.length.toString().padStart(3)}                                              ║
║  Passed:              ${COLORS.green}${passed.toString().padStart(3)}${COLORS.reset}${COLORS.bold}  (${successRate}%)                                    ║
║  Failed:              ${failed > 0 ? COLORS.red : COLORS.green}${failed.toString().padStart(3)}${COLORS.reset}${COLORS.bold}                                              ║
║  Avg Response Time:   ${avgDuration}ms                                           ║
║  Total Duration:      ${(totalDuration / 1000).toFixed(1)}s                                          ║
╚══════════════════════════════════════════════════════════════════════╝
${COLORS.reset}`);

  if (failed > 0) {
    console.log(`\n${COLORS.yellow}⚠️  Failed Tests:${COLORS.reset}`);
    results
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`   - ${r.name}: ${r.error || `Got ${r.actual}, expected ${r.expected}`}`);
      });
  }

  // Exit code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error(`${COLORS.red}Fatal error:${COLORS.reset}`, error);
  process.exit(1);
});
