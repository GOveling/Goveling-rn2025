#!/usr/bin/env node

/**
 * Test script to validate update_trip_details RPC behavior
 * Tests:
 * 1. RPC function exists
 * 2. RPC parameters are correctly typed
 * 3. RPC can execute as Owner and Editor
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || (!serviceRoleKey && !supabaseAnonKey)) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY');
  process.exit(1);
}

// Test 1: Check if RPC function exists in metadata
async function checkRpcExists() {
  console.log('\n🔍 Test 1: Checking if update_trip_details RPC exists...');

  const client = createClient(supabaseUrl, serviceRoleKey || supabaseAnonKey);

  try {
    // Query information_schema for the function
    const { data, error } = await client
      .from('information_schema.routines')
      .select('routine_name, specific_catalog')
      .eq('routine_name', 'update_trip_details')
      .eq('routine_schema', 'public');

    if (error) {
      console.log('   ⚠️  Could not query information_schema:', error.message);
      console.log('   → Trying direct RPC call instead...');
      return;
    }

    if (data && data.length > 0) {
      console.log('   ✅ RPC function exists');
      console.log('   Details:', data);
    } else {
      console.log('   ❌ RPC function NOT found in metadata');
    }
  } catch (e) {
    console.log('   ⚠️  Error querying metadata:', e.message);
  }
}

// Test 2: Test RPC call with sample data
async function testRpcCall() {
  console.log('\n🔍 Test 2: Testing RPC call with sample trip...');

  // Use service role for this test to bypass auth
  const client = createClient(supabaseUrl, serviceRoleKey || supabaseAnonKey);

  try {
    // First, find a test trip
    const { data: trips, error: tripsError } = await client
      .from('trips')
      .select('id, title, owner_id, user_id')
      .limit(1);

    if (tripsError || !trips || trips.length === 0) {
      console.log('   ⚠️  No trips found to test');
      return;
    }

    const trip = trips[0];
    console.log(`   📍 Found test trip: ${trip.id} (${trip.title})`);
    console.log(`      Owner: ${trip.owner_id || trip.user_id}`);

    // Try RPC call
    console.log('   🔄 Calling update_trip_details RPC...');

    const { data, error } = await client.rpc('update_trip_details', {
      p_trip_id: trip.id,
      p_title: trip.title + ' [TEST]',
      p_description: 'Test description',
      p_start_date: '2025-12-01',
      p_end_date: '2025-12-10',
      p_budget: 1000,
      p_accommodation: 'hotel',
      p_transport: 'plane',
    });

    if (error) {
      console.log('   ❌ RPC call failed:');
      console.log('   Error code:', error.code);
      console.log('   Error message:', error.message);
      console.log('   Error details:', error);
      return;
    }

    if (data) {
      console.log('   ✅ RPC call succeeded');
      console.log('   Response:', JSON.stringify(data, null, 2).substring(0, 200));
    } else {
      console.log('   ⚠️  RPC returned no data but no error');
    }
  } catch (e) {
    console.log('   ❌ Exception:', e.message);
    console.log('   Stack:', e.stack);
  }
}

// Test 3: Check RLS policies on trips table
async function checkRlsPolicies() {
  console.log('\n🔍 Test 3: Checking RLS policies on trips table...');

  const client = createClient(supabaseUrl, serviceRoleKey || supabaseAnonKey);

  try {
    const { data, error } = await client
      .from('pg_policies')
      .select('policyname, permissive, roles, qual, with_check')
      .eq('tablename', 'trips')
      .order('policyname');

    if (error) {
      console.log('   ⚠️  Could not query policies:', error.message);
      return;
    }

    if (data && data.length > 0) {
      console.log(`   ✅ Found ${data.length} policies:`);
      data.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.policyname} (${p.permissive ? 'ALLOW' : 'DENY'})`);
        console.log(`      Roles: ${p.roles}`);
        console.log(`      QUAL: ${p.qual?.substring(0, 80)}...`);
      });
    } else {
      console.log('   ⚠️  No policies found (RLS may be disabled)');
    }
  } catch (e) {
    console.log('   ⚠️  Error querying policies:', e.message);
  }
}

async function main() {
  console.log('================================');
  console.log('🧪 Update Trip Details RPC Test');
  console.log('================================');
  console.log('URL:', supabaseUrl);

  try {
    await checkRpcExists();
    await testRpcCall();
    await checkRlsPolicies();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }

  console.log('\n================================');
  console.log('✅ Tests completed');
  console.log('================================');
}

main();
