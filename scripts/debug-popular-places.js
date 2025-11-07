// scripts/debug-popular-places.js
// Script para debuggear los lugares populares y verificar los emojis

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase credentials not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugPopularPlaces() {
  try {
    console.log('🔍 Fetching popular places from RPC...\n');

    const { data, error } = await supabase.rpc('get_popular_places_v2', {
      user_country_code: null,
      user_continent: null,
      max_results: 8,
      exclude_place_ids: [],
    });

    if (error) {
      console.error('❌ RPC Error:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.log('⚠️ No data returned from RPC');
      return;
    }

    console.log(`✅ Retrieved ${data.length} places\n`);
    console.log('='.repeat(80));

    data.forEach((place, index) => {
      console.log(`\n${index + 1}. ${place.name}`);
      console.log(`   Category: ${place.category}`);
      console.log(
        `   Emoji: ${place.emoji} (type: ${typeof place.emoji}, length: ${place.emoji?.length})`
      );
      console.log(`   Emoji charCode: ${place.emoji?.charCodeAt(0)}`);
      console.log(`   Location: ${place.location_display}`);
      console.log(`   Badge: ${place.badge}`);
      console.log(`   Traffic Level: ${place.traffic_level}`);
      console.log(`   Saves: 1h=${place.saves_1h}, 6h=${place.saves_6h}, 24h=${place.saves_24h}`);
      console.log(`   Description: ${place.description || 'N/A'}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('\n📊 Summary:');
    console.log(`   Total places: ${data.length}`);
    console.log(`   Places with emoji: ${data.filter((p) => p.emoji).length}`);
    console.log(`   Places without emoji: ${data.filter((p) => !p.emoji).length}`);

    const emojiCategories = {};
    data.forEach((place) => {
      if (!emojiCategories[place.category]) {
        emojiCategories[place.category] = [];
      }
      emojiCategories[place.category].push(place.emoji);
    });

    console.log('\n📋 Emojis by category:');
    Object.entries(emojiCategories).forEach(([category, emojis]) => {
      console.log(`   ${category}: ${emojis.join(', ')}`);
    });
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

debugPopularPlaces();
