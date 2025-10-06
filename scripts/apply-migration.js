const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // We'll need this for admin operations

if (!supabaseUrl) {
  console.error('❌ EXPO_PUBLIC_SUPABASE_URL not found in .env');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env');
  console.log('ℹ️  This script requires a service role key to modify the database schema');
  console.log('ℹ️  You can find this in your Supabase dashboard under Settings > API');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🚀 Applying address field migration...');
  
  try {
    // First, let's check current schema
    const { data: schemaData, error: schemaError } = await supabase.rpc('get_columns', {
      table_name: 'profiles'
    });
    
    if (schemaError) {
      console.log('📋 Could not query schema, proceeding with migration...');
    } else {
      console.log('📋 Current profiles table columns:', schemaData?.map(col => col.column_name) || 'Unknown');
    }

    // Apply the migration SQL
    const migrationSQL = `
      -- Add address column if it doesn't exist
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address text;
      
      -- Add address coordinates if they don't exist
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_lat double precision;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_lng double precision;
      
      -- Add any other missing columns from the migration
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city_state text;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender text;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS occupation text;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact_name text;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact_phone text;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact_relationship text;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS medical_conditions text;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dietary_restrictions text;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS passport_number text;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS passport_expiry date;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS visa_info text;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS travel_insurance_provider text;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS travel_insurance_policy text;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS travel_insurance_expiry date;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'en';
    `;

    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      
      // Try alternative approach using individual SQL statements
      console.log('🔄 Trying alternative approach...');
      
      const statements = [
        "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address text;",
        "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_lat double precision;",
        "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_lng double precision;"
      ];
      
      for (const statement of statements) {
        try {
          const { error: stmtError } = await supabase.rpc('exec_sql', { sql: statement });
          if (stmtError) {
            console.error(`❌ Statement failed: ${statement}`, stmtError);
          } else {
            console.log(`✅ Applied: ${statement}`);
          }
        } catch (e) {
          console.error(`❌ Exception: ${statement}`, e);
        }
      }
    } else {
      console.log('✅ Migration applied successfully!');
    }

    // Verify the changes
    const { data: verifyData, error: verifyError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
      
    if (verifyError) {
      console.error('❌ Could not verify migration:', verifyError);
    } else {
      console.log('✅ Migration verified - profiles table is accessible');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

applyMigration();
