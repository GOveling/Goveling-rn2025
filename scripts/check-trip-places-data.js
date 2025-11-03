const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function checkPlaces() {
  // Get recent trips
  const { data: trips } = await supabase
    .from('trips')
    .select('id, title')
    .order('updated_at', { ascending: false })
    .limit(3);

  if (!trips || trips.length === 0) {
    console.log('No trips found');
    return;
  }

  console.log('\n📊 Checking places in recent trips:\n');

  for (const trip of trips) {
    const { data: places } = await supabase
      .from('trip_places')
      .select('id, name, lat, lng, country_code, country, city, full_address')
      .eq('trip_id', trip.id);

    if (!places || places.length === 0) {
      console.log(`❌ Trip: ${trip.title} - No places\n`);
      continue;
    }

    console.log(`🗺️  Trip: ${trip.title}`);
    console.log(`   Places: ${places.length}`);
    console.log(`   Details:`);

    places.forEach((place, idx) => {
      console.log(`   ${idx + 1}. ${place.name}`);
      console.log(`      Coords: (${place.lat}, ${place.lng})`);
      console.log(`      Country Code: ${place.country_code || 'NULL'}`);
      console.log(`      Country: ${place.country || 'NULL'}`);
      console.log(`      City: ${place.city || 'NULL'}`);
    });
    console.log('');
  }
}

checkPlaces()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
