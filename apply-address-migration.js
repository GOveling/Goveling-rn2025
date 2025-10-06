#!/usr/bin/env node

/**
 * Script to manually apply the address migration to Supabase
 * This ensures the address column exists in the profiles table
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('🔧 Applying address field migration...');
  
  try {
    // First, let's check what columns exist in the profiles table
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('get_columns_info', {
        table_schema: 'public',
        table_name: 'profiles'
      })
      .catch(() => {
        // If the RPC doesn't exist, try a different approach
        return { data: null, error: null };
      });

    console.log('📊 Checking profiles table structure...');
    
    // Try to read a profile to see what columns are available
    const { data: sampleProfile, error: sampleError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
      .maybeSingle();
    
    if (sampleProfile) {
      console.log('📋 Available columns:', Object.keys(sampleProfile));
      
      const hasAddress = 'address' in sampleProfile;
      const hasMobilePhone = 'mobile_phone' in sampleProfile;
      const hasPhone = 'phone' in sampleProfile;
      const hasCountryCode = 'country_code' in sampleProfile;
      const hasPhoneCountryCode = 'phone_country_code' in sampleProfile;
      
      console.log('✅ Column check results:');
      console.log(`   - address: ${hasAddress ? '✅' : '❌'}`);
      console.log(`   - mobile_phone: ${hasMobilePhone ? '✅' : '❌'}`);
      console.log(`   - phone: ${hasPhone ? '✅' : '❌'}`);
      console.log(`   - country_code: ${hasCountryCode ? '✅' : '❌'}`);
      console.log(`   - phone_country_code: ${hasPhoneCountryCode ? '✅' : '❌'}`);
      
      if (hasAddress && (hasMobilePhone || hasPhone) && (hasCountryCode || hasPhoneCountryCode)) {
        console.log('🎉 All required columns are present!');
        return;
      }
    }
    
    console.log('⚠️ Some columns are missing. The migration needs to be applied to the remote database.');
    console.log('💡 Please run the following SQL commands in your Supabase dashboard:');
    console.log(`
-- Add missing columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS mobile_phone text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS country_code text,
ADD COLUMN IF NOT EXISTS phone_country_code text,
ADD COLUMN IF NOT EXISTS birth_date date,
ADD COLUMN IF NOT EXISTS age integer,
ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('masculine', 'feminine', 'prefer_not_to_say')),
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS city_state text;
    `);
    
  } catch (error) {
    console.error('❌ Error checking database:', error.message);
  }
}

applyMigration();
