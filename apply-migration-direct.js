const fetch = require('node-fetch');

const SUPABASE_URL = 'https://iwsuyrlrbmnbfyfkqowl.supabase.co';
const SERVICE_ROLE_KEY = 'sbp_457b13bbe793ef1c117726faabce557a31549978';

async function applyMigrationDirectly() {
  console.log('🚀 Applying migration directly to Supabase...');
  
  const migrationSQL = `
    -- Add address column if it doesn't exist
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address text;
    
    -- Add address coordinates if they don't exist  
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_lat double precision;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_lng double precision;
    
    -- Refresh the schema cache
    NOTIFY pgrst, 'reload schema';
  `;

  try {
    console.log('📡 Sending request to Supabase REST API...');
    console.log('🔗 URL:', `${SUPABASE_URL}/rest/v1/rpc/exec_sql`);
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        sql: migrationSQL
      })
    });

    console.log('📈 Response status:', response.status);
    console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const result = await response.text();
      console.log('✅ Migration applied successfully!');
      console.log('📄 Response:', result);
    } else {
      const errorText = await response.text();
      console.log('❌ Migration failed:', errorText);
      
      // Try individual statements
      console.log('🔄 Trying individual statements...');
      
      const statements = [
        "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address text;",
        "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_lat double precision;", 
        "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_lng double precision;"
      ];
      
      for (const statement of statements) {
        try {
          const stmtResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ sql: statement })
          });
          
          if (stmtResponse.ok) {
            console.log('✅ Applied:', statement);
          } else {
            const stmtError = await stmtResponse.text();
            console.log('❌ Failed:', statement, stmtError);
          }
        } catch (err) {
          console.log('💥 Exception:', statement, err.message);
        }
      }
    }
    
    // Test if address column now exists
    console.log('🔍 Testing if address column exists...');
    const testResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id,address&limit=1`, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      }
    });
    
    if (testResponse.ok) {
      console.log('✅ Address column is now accessible!');
      const testData = await testResponse.json();
      console.log('📊 Test query result:', testData);
    } else {
      const testError = await testResponse.text();
      console.log('❌ Address column still not accessible:', testError);
    }

  } catch (error) {
    console.error('💥 Migration failed with exception:', error);
  }
}

// Install node-fetch if not available
try {
  require('node-fetch');
  applyMigrationDirectly();
} catch (e) {
  console.log('📦 node-fetch not available, installing...');
  require('child_process').exec('npm install node-fetch@2', (err) => {
    if (err) {
      console.error('❌ Failed to install node-fetch:', err);
    } else {
      console.log('✅ node-fetch installed, retrying...');
      delete require.cache[require.resolve('node-fetch')];
      applyMigrationDirectly();
    }
  });
}
