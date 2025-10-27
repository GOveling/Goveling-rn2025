require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Environment variables
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://iwsuyrlrbmnbfyfkqowl.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function debugBreakdown() {
  console.log('🔌 Supabase URL:', SUPABASE_URL);
  console.log('🔐 Using key mode: service-role');

  // Get Sebastian's user ID
  const sebastianEmail = 'araos.sebastian@gmail.com';
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('email', sebastianEmail);

  if (!profiles || profiles.length === 0) {
    console.log('❌ User not found');
    return;
  }

  const uid = profiles[0].id;
  console.log('👤 Sebastian ID:', uid);

  // Execute the exact same queries as getUserTripsBreakdown
  console.log('\n🔍 Executing getUserTripsBreakdown queries...\n');

  // Query 1: Own trips (user_id)
  console.log('1️⃣ Own trips (user_id):');
  const { data: ownResult } = await supabase
    .from('trips')
    .select('id,title,start_date,end_date')
    .eq('user_id', uid)
    .neq('status', 'cancelled');
  console.log('   Results:', ownResult?.length || 0);
  ownResult?.forEach((trip) => console.log(`   - ${trip.title} (${trip.id})`));

  // Query 2: Own trips (owner_id)
  console.log('\n2️⃣ Own trips (owner_id):');
  const { data: ownByOwnerIdResult } = await supabase
    .from('trips')
    .select('id,title,start_date,end_date')
    .eq('owner_id', uid)
    .neq('status', 'cancelled');
  console.log('   Results:', ownByOwnerIdResult?.length || 0);
  ownByOwnerIdResult?.forEach((trip) => console.log(`   - ${trip.title} (${trip.id})`));

  // Query 3: Collaborator trip IDs
  console.log('\n3️⃣ Collaborator trip IDs:');
  const { data: collabIdsResult } = await supabase
    .from('trip_collaborators')
    .select('trip_id')
    .eq('user_id', uid);
  console.log('   Results:', collabIdsResult?.length || 0);
  const tripIds = (collabIdsResult || []).map((c) => c.trip_id);
  tripIds.forEach((id) => console.log(`   - Trip ID: ${id}`));

  // Query 4: Collaborator trips details
  console.log('\n4️⃣ Collaborator trips details:');
  if (tripIds.length > 0) {
    const { data: collabTripsResult } = await supabase
      .from('trips')
      .select('id,title,start_date,end_date')
      .in('id', tripIds)
      .neq('status', 'cancelled');
    console.log('   Results:', collabTripsResult?.length || 0);
    collabTripsResult?.forEach((trip) => console.log(`   - ${trip.title} (${trip.id})`));
  } else {
    console.log('   No collaborator trip IDs to query');
  }

  // Combined results
  const allTripsRaw = [
    ...(ownResult || []),
    ...(ownByOwnerIdResult || []),
    ...(tripIds.length > 0 ? await getCollabTrips(tripIds) : []),
  ];

  console.log('\n📊 Summary:');
  console.log('Total trips found:', allTripsRaw.length);
  console.log('Chile test found:', allTripsRaw.some((t) => t.title === 'chile test') ? '✅' : '❌');
}

async function getCollabTrips(tripIds) {
  if (tripIds.length === 0) return [];
  const { data } = await supabase
    .from('trips')
    .select('id,title,start_date,end_date')
    .in('id', tripIds)
    .neq('status', 'cancelled');
  return data || [];
}

debugBreakdown().catch(console.error);
