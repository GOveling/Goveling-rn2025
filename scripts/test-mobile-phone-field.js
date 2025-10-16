// Script para verificar si mobile_phone existe intentando una operación
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testMobilePhoneField() {
  try {
    console.log('🧪 Probando si el campo mobile_phone existe...');

    // Intentar hacer una consulta que incluya mobile_phone
    const { data, error } = await supabase.from('profiles').select('id, mobile_phone').limit(1);

    if (error) {
      if (error.message.includes('column "mobile_phone" does not exist')) {
        console.log('❌ El campo mobile_phone NO existe en la tabla profiles');
        console.log('📝 La migración aún no se ha aplicado');
        return false;
      } else {
        console.log('⚠️  Error diferente:', error.message);
        return null;
      }
    } else {
      console.log('✅ El campo mobile_phone EXISTE en la tabla profiles!');
      console.log('🎉 La migración se aplicó correctamente');
      return true;
    }
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
    return null;
  }
}

testMobilePhoneField().then((result) => {
  if (result === true) {
    console.log('\n🎯 RESULTADO: Campo mobile_phone disponible');
  } else if (result === false) {
    console.log('\n🔧 ACCIÓN REQUERIDA: Aplicar migración mobile_phone');
  } else {
    console.log('\n❓ RESULTADO: No se pudo determinar el estado');
  }
});
