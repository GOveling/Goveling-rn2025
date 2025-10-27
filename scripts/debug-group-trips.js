require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Environment check:', {
  url: supabaseUrl ? 'OK' : 'MISSING',
  key: supabaseKey ? 'OK' : 'MISSING',
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugGroupTrips() {
  console.log('🔌 Supabase URL:', supabaseUrl);
  console.log('🔐 Using key mode: service-role');

  // Get Sebastian's user ID
  const sebastianEmail = 'araos.sebastian@gmail.com';
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('email', sebastianEmail);

  if (!profiles || profiles.length === 0) {
    console.log('❌ Sebastian profile not found');
    return;
  }

  const sebastian = profiles[0];
  console.log('👤 Sebastian ID:', sebastian.id);

  // Test getTripWithTeamRPC for each trip
  console.log('\n🔍 Testing getTripWithTeamRPC for each trip...');

  // Get all trips for Sebastian (owned + collaborative)
  const { data: ownTrips } = await supabase
    .from('trips')
    .select('id, title, owner_id, user_id')
    .or(`owner_id.eq.${sebastian.id},user_id.eq.${sebastian.id}`)
    .neq('status', 'cancelled');

  const { data: collabIds } = await supabase
    .from('trip_collaborators')
    .select('trip_id')
    .eq('user_id', sebastian.id);

  const collabTripIds = (collabIds || []).map((c) => c.trip_id);

  // Get collab trips details
  let collabTrips = [];
  if (collabTripIds.length > 0) {
    const { data } = await supabase
      .from('trips')
      .select('id, title, owner_id, user_id')
      .in('id', collabTripIds)
      .neq('status', 'cancelled');
    collabTrips = data || [];
  }

  // Combine all trips
  const allTrips = [...(ownTrips || []), ...collabTrips];
  const uniqueTrips = allTrips.filter(
    (trip, index, self) => index === self.findIndex((t) => t.id === trip.id)
  );

  console.log(`📊 Found ${uniqueTrips.length} total trips for Sebastian`);

  for (const trip of uniqueTrips) {
    console.log(`\n🧪 Testing trip: "${trip.title}" (${trip.id})`);

    try {
      // Test RPC call
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_trip_with_team', {
        p_trip_id: trip.id,
      });

      if (rpcError) {
        console.log(`   ❌ RPC Error:`, rpcError);
        continue;
      }

      if (!rpcData || rpcData.length === 0) {
        console.log(`   ⚠️  RPC returned no data`);
        continue;
      }

      const rpcResult = rpcData[0];
      console.log(`   ✅ RPC Success:`);
      console.log(`      - Owner ID: ${rpcResult.owner_id}`);
      console.log(`      - Owner Profile: ${rpcResult.owner_profile ? 'Present' : 'Missing'}`);
      console.log(`      - Collaborators Count: ${rpcResult.collaborators_count}`);
      console.log(
        `      - Collaborators Array Length: ${rpcResult.collaborators ? rpcResult.collaborators.length : 0}`
      );
      console.log(`      - Is Group Trip: ${rpcResult.collaborators_count > 1 ? 'YES' : 'NO'}`);

      if (rpcResult.collaborators && rpcResult.collaborators.length > 0) {
        console.log(`      - Collaborators:`);
        rpcResult.collaborators.forEach((collab, i) => {
          console.log(`        ${i + 1}. ${collab.full_name || collab.email} (${collab.role})`);
        });
      }
    } catch (error) {
      console.log(`   ❌ Error testing trip:`, error.message);
    }
  }

  // Summary
  console.log('\n📈 SUMMARY:');
  console.log(`Total trips: ${uniqueTrips.length}`);

  let groupTripsCount = 0;
  for (const trip of uniqueTrips) {
    try {
      const { data: rpcData } = await supabase.rpc('get_trip_with_team', { p_trip_id: trip.id });
      if (rpcData && rpcData[0] && rpcData[0].collaborators_count > 1) {
        groupTripsCount++;
      }
    } catch (e) {
      // ignore
    }
  }

  console.log(`Group trips: ${groupTripsCount}`);
  console.log(`Individual trips: ${uniqueTrips.length - groupTripsCount}`);
}

debugGroupTrips().catch(console.error);
