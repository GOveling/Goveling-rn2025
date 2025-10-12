#!/usr/bin/env node

// Script para probar la creación de trips directamente
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase (usa las mismas variables de entorno)
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno faltantes:');
  console.error('   EXPO_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('   EXPO_PUBLIC_SUPABASE_ANON_KEY:', !!supabaseKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTripCreation() {
  try {
    console.log('🔐 Verificando sesión...');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('❌ Error al obtener sesión:', sessionError);
      return;
    }

    if (!sessionData?.session?.user) {
      console.error('❌ No hay sesión activa. Debes estar logueado en la app.');
      return;
    }

    const user = sessionData.session.user;
    console.log('✅ Usuario autenticado:', user.email, user.id);

    // Probar inserción simple
    const testTrip = {
      title: 'Viaje de Prueba ' + new Date().toISOString(),
      description: 'Descripción de prueba',
      start_date: '2025-12-01',
      end_date: '2025-12-10',
      owner_id: user.id,
      status: 'active',
      privacy: 'private'
    };

    console.log('📝 Intentando insertar:', testTrip);

    const { data, error } = await supabase
      .from('trips')
      .insert([testTrip])
      .select('*')
      .single();

    if (error) {
      console.error('❌ Error al insertar:', error);
      console.error('   Code:', error.code);
      console.error('   Details:', error.details);
      console.error('   Hint:', error.hint);
      console.error('   Message:', error.message);
    } else {
      console.log('✅ Trip creado exitosamente:', data);
    }

  } catch (error) {
    console.error('💥 Error inesperado:', error);
  }
}

testTripCreation();