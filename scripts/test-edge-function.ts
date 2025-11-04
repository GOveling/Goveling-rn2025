/**
 * Test Edge Function: pexels-country-photos
 * Tests if the function responds correctly
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://iwsuyrlrbmnbfyfkqowl.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3c3V5cmxyYm1uYmZ5Zmtxb3dsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjYzNTczMTAsImV4cCI6MjA0MTkzMzMxMH0.7BG3Y7m5uqHVCxrb7DxhpRkW7aLmkH3R3eC-tPk8UGU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testEdgeFunction() {
  console.log('🧪 Testing pexels-country-photos Edge Function\n');
  console.log('='.repeat(60));

  try {
    console.log('\n📸 Requesting photos for Chile from Pexels...');

    const { data, error } = await supabase.functions.invoke('pexels-country-photos', {
      body: {
        countryName: 'Chile',
        countryCode: 'CL',
      },
    });

    if (error) {
      console.error('❌ Error from Edge Function:');
      console.error('   Type:', error.name);
      console.error('   Message:', error.message);
      console.error('   Context:', error.context);
      return;
    }

    console.log('\n✅ Success! Response received:');
    console.log('   Photos count:', data?.photos?.length || 0);

    if (data?.photos && data.photos.length > 0) {
      console.log('\n📷 Photo URLs:');
      data.photos.forEach((url: string, i: number) => {
        console.log(`   ${i + 1}. ${url}`);
      });
    } else {
      console.log('   ⚠️  No photos returned');
    }
  } catch (error) {
    console.error('\n❌ Exception during test:');
    console.error(error);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Test complete!\n');
}

testEdgeFunction();
