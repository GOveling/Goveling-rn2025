#!/usr/bin/env node
/**
 * Backfill city and country_code for existing trip_places records
 * Uses Nominatim reverse geocoding to populate NULL city fields
 */

// Load environment variables from .env file
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Geocode coordinates to city and country
 */
async function geocodeCoordinates(lat, lng) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Goveling-Backfill/1.0',
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.warn(`⚠️  Nominatim returned ${response.status} for (${lat}, ${lng})`);
      return null;
    }

    const data = await response.json();
    const city =
      data.address?.city ||
      data.address?.town ||
      data.address?.village ||
      data.address?.municipality ||
      null;
    const country_code = data.address?.country_code?.toUpperCase() || null;

    return { city, country_code };
  } catch (error) {
    console.error(`❌ Error geocoding (${lat}, ${lng}):`, error.message);
    return null;
  }
}

/**
 * Add delay between API calls to respect rate limits
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function backfillCities() {
  console.log('🔍 Fetching trip_places with NULL city...\n');

  // Get all places with NULL city but valid coordinates
  const { data: places, error } = await supabase
    .from('trip_places')
    .select('id, name, lat, lng, city, country_code')
    .is('city', null)
    .not('lat', 'is', null)
    .not('lng', 'is', null);

  if (error) {
    console.error('❌ Error fetching places:', error);
    process.exit(1);
  }

  if (!places || places.length === 0) {
    console.log('✅ No places need backfilling!');
    return;
  }

  console.log(`📍 Found ${places.length} places to backfill:\n`);

  let updated = 0;
  let skipped = 0;

  for (const place of places) {
    console.log(`Processing: ${place.name} (${place.lat}, ${place.lng})`);

    const geocoded = await geocodeCoordinates(place.lat, place.lng);

    if (!geocoded || !geocoded.city) {
      console.log(`  ⚠️  Could not determine city, skipping\n`);
      skipped++;
      continue;
    }

    console.log(`  📍 Found: ${geocoded.city}, ${geocoded.country_code}`);

    // Update the record
    const { error: updateError } = await supabase
      .from('trip_places')
      .update({
        city: geocoded.city,
        country_code: geocoded.country_code,
      })
      .eq('id', place.id);

    if (updateError) {
      console.error(`  ❌ Error updating:`, updateError.message);
      skipped++;
    } else {
      console.log(`  ✅ Updated successfully\n`);
      updated++;
    }

    // Rate limit: 1 request per second (Nominatim policy)
    await sleep(1000);
  }

  console.log('\n📊 Backfill Summary:');
  console.log(`  ✅ Updated: ${updated}`);
  console.log(`  ⚠️  Skipped: ${skipped}`);
  console.log(`  📍 Total processed: ${places.length}`);
}

// Run the backfill
backfillCities()
  .then(() => {
    console.log('\n✅ Backfill complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Backfill failed:', error);
    process.exit(1);
  });
