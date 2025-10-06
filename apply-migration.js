const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration
const supabaseUrl = 'https://iwsuyrlrbmnbfyfkqowl.supabase.co';
const serviceRoleKey = 'sbp_457b13bbe793ef1c117726faabce557a31549978';

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function applyMigration() {
  try {
    console.log('🔄 Starting migration application...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase/migrations/20251006_onboarding_fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded:', migrationPath);
    console.log('📝 Migration content length:', migrationSQL.length, 'characters');
    
    // Split into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log('🔢 Found', statements.length, 'SQL statements to execute');
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`\n🔄 Executing statement ${i + 1}/${statements.length}:`);
      console.log('📝', statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: statement
        });
        
        if (error) {
          // Try direct query if RPC fails
          console.log('⚠️ RPC failed, trying direct query...');
          const result = await supabase.from('_').select('*').limit(0);
          
          if (error.code === 'PGRST204' || error.message?.includes('function "exec_sql" does not exist')) {
            console.log('ℹ️ Direct SQL execution not available, this is expected for schema changes');
            console.log('ℹ️ Migration may need to be applied through Supabase Dashboard');
          } else {
            console.error('❌ Error:', error);
          }
        } else {
          console.log('✅ Statement executed successfully');
        }
      } catch (err) {
        console.log('⚠️ Statement execution info:', err.message);
      }
    }
    
    // Test if the address column now exists
    console.log('\n🔍 Testing address column existence...');
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, address')
        .limit(1);
        
      if (error) {
        console.log('❌ Address column still not available:', error.message);
        console.log('💡 You may need to apply this migration through the Supabase Dashboard');
        console.log('💡 Go to: https://supabase.com/dashboard/project/iwsuyrlrbmnbfyfkqowl/editor');
      } else {
        console.log('✅ Address column is now available!');
        console.log('📊 Test query result:', data);
      }
    } catch (err) {
      console.log('⚠️ Column test error:', err.message);
    }
    
  } catch (error) {
    console.error('💥 Migration application failed:', error);
  }
}

// Run the migration
applyMigration();
