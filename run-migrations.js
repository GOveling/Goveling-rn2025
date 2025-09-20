#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuración de Supabase
const SUPABASE_URL = 'https://iwsuyrlrbmnbfyfkqowl.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.argv[2];

if (!SERVICE_ROLE_KEY) {
  console.error('❌ Error: Se requiere la SERVICE_ROLE_KEY');
  console.log('Uso: node run-migrations.js <SERVICE_ROLE_KEY>');
  console.log('O establecer la variable: SUPABASE_SERVICE_ROLE_KEY=<key> node run-migrations.js');
  process.exit(1);
}

// Orden de las migraciones
const migrationOrder = [
  '20250918_p0_minimal.sql',
  '20250918_v141_base_consolidated.sql',
  '20250918_p1.sql',
  '20250918_p2_visits_stats.sql',
  '20250918_trips_pulido.sql',
  '20250918_trip_place_visits.sql',
  '20250918_directions_cache.sql',
  '20250918_route_cache_summary.sql',
  '20250918_email_otps.sql',
  '20250918_notifications_push.sql',
  '20250919_v142_storage_policies_triggers.sql',
  '20250919_v143_push_queue.sql',
  '20250919_v144_booking_clickouts.sql'
];

async function executeMigration(filename) {
  const filePath = path.join(__dirname, 'supabase', 'migrations', filename);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Archivo no encontrado: ${filename}`);
    return false;
  }

  const sql = fs.readFileSync(filePath, 'utf8');
  
  try {
    console.log(`🔄 Ejecutando: ${filename}`);
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Error en ${filename}:`, error);
      return false;
    }

    console.log(`✅ Completado: ${filename}`);
    return true;
  } catch (error) {
    console.error(`❌ Error ejecutando ${filename}:`, error.message);
    return false;
  }
}

async function runAllMigrations() {
  console.log('🚀 Iniciando migraciones de Supabase...\n');
  
  let successCount = 0;
  let totalCount = migrationOrder.length;

  for (const migration of migrationOrder) {
    const success = await executeMigration(migration);
    if (success) {
      successCount++;
    }
    
    // Pequeña pausa entre migraciones
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n📊 Resumen:`);
  console.log(`✅ Exitosas: ${successCount}/${totalCount}`);
  console.log(`❌ Fallaron: ${totalCount - successCount}/${totalCount}`);
  
  if (successCount === totalCount) {
    console.log('\n🎉 ¡Todas las migraciones se ejecutaron correctamente!');
    console.log('Tu base de datos de Supabase está lista para producción.');
  } else {
    console.log('\n⚠️  Algunas migraciones fallaron. Revisa los errores arriba.');
  }
}

runAllMigrations().catch(console.error);
