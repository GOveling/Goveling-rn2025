#!/usr/bin/env node
/**
 * Clear Undefined Geo Cache Entries
 * Removes all cached entries with null or empty country_iso
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   EXPO_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function clearUndefinedCache() {
  console.log('🧹 Clearing undefined geo cache entries...\n');

  try {
    // First, count how many entries exist
    const { count: totalCount } = await supabase
      .from('geo_cache')
      .select('*', { count: 'exact', head: true })
      .like('geokey', 'geo:gh:5:%');

    console.log(`📊 Total geo cache entries: ${totalCount}`);

    // Count undefined entries
    const { data: undefinedEntries } = await supabase
      .from('geo_cache')
      .select('geokey, value')
      .like('geokey', 'geo:gh:5:%');

    if (!undefinedEntries) {
      console.log('✅ No cache entries found');
      return;
    }

    const undefinedKeys = undefinedEntries.filter(
      (entry) =>
        !entry.value ||
        !entry.value.country_iso ||
        entry.value.country_iso === '' ||
        entry.value.country_iso === null
    );

    console.log(`🔍 Found ${undefinedKeys.length} undefined entries to clear\n`);

    if (undefinedKeys.length === 0) {
      console.log('✅ No undefined entries to clear!');
      return;
    }

    // Delete undefined entries in batches
    const batchSize = 100;
    let deleted = 0;

    for (let i = 0; i < undefinedKeys.length; i += batchSize) {
      const batch = undefinedKeys.slice(i, i + batchSize);
      const keys = batch.map((e) => e.geokey);

      const { error } = await supabase.from('geo_cache').delete().in('geokey', keys);

      if (error) {
        console.error(`❌ Error deleting batch ${i / batchSize + 1}:`, error);
        continue;
      }

      deleted += batch.length;
      console.log(`   Deleted ${deleted}/${undefinedKeys.length} entries...`);
    }

    console.log(`\n✅ Successfully cleared ${deleted} undefined cache entries!`);

    // Show remaining count
    const { count: remainingCount } = await supabase
      .from('geo_cache')
      .select('*', { count: 'exact', head: true })
      .like('geokey', 'geo:gh:5:%');

    console.log(`📊 Remaining geo cache entries: ${remainingCount}\n`);
    console.log('🎯 Cache cleared! Re-run tests to populate with correct values.');
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

clearUndefinedCache();
