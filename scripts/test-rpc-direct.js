require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔌 Testing RPC function directly...');
const supabase = createClient(supabaseUrl, supabaseKey);

async function testRpcFunction() {
  try {
    // Test 1: Try calling RPC with a known trip ID
    console.log('\n🧪 Test 1: Testing RPC with chile test trip ID...');
    const { data, error } = await supabase.rpc('get_trip_with_team', {
      p_trip_id: '2e57b445-ec22-4477-aad2-934ba81f81b6',
    });

    console.log('RPC Result:', { data, error });

    if (error) {
      console.log('❌ RPC Error details:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.log('⚠️  RPC returned empty data - checking access permissions...');

      // Check if trip exists
      const { data: tripCheck } = await supabase
        .from('trips')
        .select('id, title, owner_id, user_id')
        .eq('id', '2e57b445-ec22-4477-aad2-934ba81f81b6');

      console.log('Trip check:', tripCheck);

      // Check collaborators
      const { data: collabCheck } = await supabase
        .from('trip_collaborators')
        .select('*')
        .eq('trip_id', '2e57b445-ec22-4477-aad2-934ba81f81b6');

      console.log('Collaborators check:', collabCheck);

      return;
    }

    console.log('✅ RPC Success!');
    console.log('Data:', JSON.stringify(data[0], null, 2));
  } catch (error) {
    console.log('❌ Unexpected error:', error);
  }
}

testRpcFunction().catch(console.error);
