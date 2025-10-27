require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔌 Testing RPC with user authentication...');
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRpcWithAuth() {
  try {
    // Step 1: Sign in as Sebastian
    console.log('\n🔐 Step 1: Signing in as Sebastian...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'araos.sebastian@gmail.com',
      password: 'testpass123', // You'll need to provide Sebastian's actual password
    });

    if (authError) {
      console.log('❌ Auth error:', authError);
      console.log('⚠️  Using fallback test without auth...');
      return await testWithoutAuth();
    }

    console.log('✅ Signed in successfully as:', authData.user.email);
    console.log('User ID:', authData.user.id);

    // Step 2: Test RPC call
    console.log('\n🧪 Step 2: Testing RPC with authenticated user...');
    const { data, error } = await supabase.rpc('get_trip_with_team', {
      p_trip_id: '2e57b445-ec22-4477-aad2-934ba81f81b6',
    });

    console.log('RPC Result:', { data, error });

    if (error) {
      console.log('❌ RPC Error:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.log('⚠️  RPC returned empty data even with auth');
      return;
    }

    console.log('✅ RPC Success with auth!');
    console.log('Data:', JSON.stringify(data[0], null, 2));

    // Step 3: Sign out
    await supabase.auth.signOut();
  } catch (error) {
    console.log('❌ Unexpected error:', error);
  }
}

async function testWithoutAuth() {
  // Test alternative: check if the issue is with the RPC function itself
  console.log('\n🔧 Testing alternative approach...');

  try {
    // Use the old method that trips.tsx was using as fallback
    const { data: trip } = await supabase
      .from('trips')
      .select('id, title, owner_id, user_id, start_date, end_date, status')
      .eq('id', '2e57b445-ec22-4477-aad2-934ba81f81b6')
      .single();

    if (!trip) {
      console.log('❌ Trip not found');
      return;
    }

    console.log('✅ Trip found:', trip.title);

    // Get collaborators
    const { data: collabs } = await supabase
      .from('trip_collaborators')
      .select(
        `
        user_id,
        role,
        profiles!inner(id, full_name, avatar_url, email)
      `
      )
      .eq('trip_id', '2e57b445-ec22-4477-aad2-934ba81f81b6');

    const collaboratorsCount = (collabs?.length || 0) + 1; // +1 for owner

    console.log('Collaborators found:', collabs?.length || 0);
    console.log('Total participants (collaboratorsCount):', collaboratorsCount);
    console.log('Is group trip:', collaboratorsCount > 1 ? 'YES' : 'NO');

    if (collabs && collabs.length > 0) {
      console.log('Collaborators details:');
      collabs.forEach((collab, i) => {
        console.log(`  ${i + 1}. ${collab.profiles.full_name} (${collab.role})`);
      });
    }
  } catch (error) {
    console.log('❌ Alternative approach error:', error);
  }
}

testRpcWithAuth().catch(console.error);
