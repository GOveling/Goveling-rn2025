// Script para verificar la estructura de la tabla profiles
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTableStructure() {
  try {
    console.log('🔍 Verificando estructura de la tabla profiles...');

    // Primero, intentar describir la tabla directamente usando información del esquema
    const { data: schemaInfo, error: schemaError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'profiles')
      .eq('table_schema', 'public');

    if (schemaError) {
      console.error('❌ Error consultando esquema:', schemaError);
    } else if (schemaInfo && schemaInfo.length > 0) {
      console.log('✅ Estructura de la tabla profiles:');
      console.table(schemaInfo);

      const mobilePhoneColumn = schemaInfo.find((col) => col.column_name === 'mobile_phone');
      if (mobilePhoneColumn) {
        console.log('✅ El campo mobile_phone EXISTE!');
      } else {
        console.log('❌ El campo mobile_phone NO existe');
      }
      return;
    }

    // Fallback: intentar obtener un perfil existente
    const { data, error } = await supabase.from('profiles').select('*').limit(1);

    if (error) {
      console.error('❌ Error consultando profiles:', error);
      return;
    }

    if (data && data.length > 0) {
      console.log('✅ Campos disponibles en la tabla profiles:');
      console.log(Object.keys(data[0]).join(', '));

      if ('mobile_phone' in data[0]) {
        console.log('✅ El campo mobile_phone ya existe!');
      } else {
        console.log('❌ El campo mobile_phone NO existe aún');
      }
    } else {
      console.log(
        'ℹ️  La tabla profiles está vacía, no se puede verificar la estructura usando datos'
      );
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkTableStructure();
