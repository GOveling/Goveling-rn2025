// Script para aplicar la migración mobile_phone directamente a Supabase
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Necesitamos esta key para DDL

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Falta SUPABASE_SERVICE_ROLE_KEY en las variables de entorno');
  console.log('📝 Añade esta línea al archivo .env:');
  console.log('SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function applyMigration() {
  try {
    console.log('🔍 Verificando si la columna mobile_phone ya existe...');
    
    // Verificar si la columna ya existe
    const { data: columns, error: checkError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'profiles')
      .eq('column_name', 'mobile_phone');

    if (checkError) {
      console.error('❌ Error verificando columnas:', checkError);
      return;
    }

    if (columns && columns.length > 0) {
      console.log('✅ La columna mobile_phone ya existe en la tabla profiles');
      return;
    }

    console.log('📝 Aplicando migración: añadiendo columna mobile_phone...');

    // Aplicar la migración
    const { error: migrationError } = await supabase.rpc('exec', {
      sql: `
        ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mobile_phone text;
        COMMENT ON COLUMN public.profiles.mobile_phone IS 'Mobile phone number with country code (e.g., +34 123 456 789)';
      `
    });

    if (migrationError) {
      console.error('❌ Error aplicando migración:', migrationError);
      return;
    }

    console.log('🎉 Migración aplicada exitosamente!');
    console.log('✅ Columna mobile_phone añadida a la tabla profiles');

  } catch (error) {
    console.error('❌ Error ejecutando migración:', error);
  }
}

applyMigration();
