const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase (usa las URLs conocidas)
const supabaseUrl = 'https://iwsuyrlrbmnbfyfkqowl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3c3V5cmxyYm1uYmZ5Zmtxb3dsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI0MTQzMzksImV4cCI6MjA0Nzk5MDMzOX0.PAgcHGJZPuaEb3JFPeLRCKmjBbVIKUKBHqOQgC0R3Y8';

console.log('🔗 Conectando a Supabase...');
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableStructure() {
  try {
    console.log('🔍 Verificando estructura de la tabla profiles...');
    
    // Intentamos obtener un registro para ver las columnas disponibles
    const { data: sampleData, error: sampleError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.error('❌ Error consultando tabla profiles:', sampleError.message);
      return;
    }

    if (sampleData && sampleData.length > 0) {
      const columns = Object.keys(sampleData[0]);
      console.log('📋 Columnas encontradas en la tabla profiles:');
      columns.sort().forEach(col => console.log(`  - ${col}`));
      
      // Verificar campos específicos
      const hasMobilePhone = columns.includes('mobile_phone');
      const hasCountryCode = columns.includes('country_code');
      const hasPhone = columns.includes('phone');
      
      console.log('\n🔍 Estado de migración:');
      console.log(`  mobile_phone: ${hasMobilePhone ? '✅ Existe' : '❌ No existe'}`);
      console.log(`  country_code: ${hasCountryCode ? '✅ Existe' : '❌ No existe'}`);
      console.log(`  phone: ${hasPhone ? '✅ Existe' : '❌ No existe'}`);
      
      if (hasMobilePhone && hasCountryCode) {
        console.log('\n✅ La migración parece estar aplicada correctamente');
        console.log('📱 Los campos mobile_phone y country_code están disponibles');
      } else if (hasMobilePhone && !hasCountryCode) {
        console.log('\n⚠️  Migración parcial: mobile_phone existe pero falta country_code');
      } else if (!hasMobilePhone) {
        console.log('\n❌ La migración NO está aplicada');
        console.log('📝 Necesitas ejecutar el archivo temp_migration.sql en tu dashboard de Supabase');
        console.log('🔗 Ve a: https://supabase.com/dashboard/project/iwsuyrlrbmnbfyfkqowl/sql');
      }
    } else {
      console.log('⚠️  No hay datos en la tabla profiles para verificar estructura');
      console.log('� Esto podría significar que la tabla está vacía o no existe');
    }

  } catch (err) {
    console.error('❌ Error inesperado:', err.message);
  }
}

// Ejecutar verificación
checkTableStructure().then(() => {
  console.log('\n🏁 Verificación completada');
  process.exit(0);
});
