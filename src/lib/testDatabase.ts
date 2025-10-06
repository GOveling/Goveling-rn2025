// Prueba para verificar que los datos se guardan correctamente en la base de datos
// Este archivo es solo para testing y se puede eliminar después

import { supabase } from '~/lib/supabase';

export const testDatabaseSave = async (userId: string) => {
  try {
    console.log('🧪 Testing database save for user:', userId);
    
    // Datos de prueba
    const testData = {
      id: userId,
      email: 'test@example.com',
      full_name: 'Usuario de Prueba',
      birth_date: '1990-05-15',
      gender: 'masculine',
      country: 'ES',
      city_state: 'Madrid',
      address: 'Calle Falsa 123',
      mobile_phone: '666123456',
      country_code: '+34',
      updated_at: new Date().toISOString(),
    };

    // Guardar en la base de datos
    const { data, error } = await supabase
      .from('profiles')
      .upsert(testData)
      .select();

    if (error) {
      console.error('❌ Error saving test data:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Test data saved successfully:', data);

    // Verificar que se guardó correctamente
    const { data: verifyData, error: verifyError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (verifyError) {
      console.error('❌ Error verifying saved data:', verifyError);
      return { success: false, error: verifyError.message };
    }

    console.log('✅ Verified saved data:', verifyData);

    return { 
      success: true, 
      message: 'Datos guardados y verificados correctamente',
      savedData: verifyData 
    };

  } catch (error) {
    console.error('❌ Unexpected error in test:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
};

export const checkProfileSchema = async () => {
  try {
    console.log('🔍 Checking profiles table schema...');
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error checking schema:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Profiles table accessible');
    return { success: true, message: 'Tabla profiles accesible' };

  } catch (error) {
    console.error('❌ Unexpected error checking schema:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
};
