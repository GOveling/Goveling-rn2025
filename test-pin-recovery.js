#!/usr/bin/env node

/**
 * Script de Prueba: Edge Function request-pin-recovery
 * Prueba la función directamente sin usar la app
 */

const PROJECT_URL = 'https://iwsuyrlrbmnbfyfkqowl.supabase.co';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3c3V5cmxyYm1uYmZ5Zmtxb3dsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNjM4NTcsImV4cCI6MjA3MzgzOTg1N30.qC14nN1H4JcsubN31he9Y9VUWa3Dl1sDY28iAyKcIPg';

// Email de prueba (cámbialo por tu email real)
const TEST_EMAIL = 'info@goveling.com';

async function testPinRecovery() {
  console.log('🧪 Iniciando prueba de recuperación de PIN...\n');
  console.log('📧 Email de prueba:', TEST_EMAIL);
  console.log('🔗 Proyecto:', PROJECT_URL);
  console.log('');

  try {
    console.log('📡 Llamando Edge Function: request-pin-recovery...');

    const response = await fetch(`${PROJECT_URL}/functions/v1/request-pin-recovery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
      }),
    });

    console.log('📊 Status:', response.status, response.statusText);
    console.log('');

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error en la respuesta:');
      console.error(errorText);
      process.exit(1);
    }

    const data = await response.json();
    console.log('✅ Respuesta exitosa:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');

    // Validar respuesta
    if (data.ok) {
      console.log('✅ Función ejecutada correctamente');

      if (data.developmentMode) {
        console.log('🔧 MODO DESARROLLO detectado');
        console.log('📋 Código de recuperación:', data.code);
        console.log('');
        console.log('═══════════════════════════════════════');
        console.log('  CÓDIGO PARA PROBAR: ' + data.code);
        console.log('═══════════════════════════════════════');
        console.log('');
        console.log('✅ Prueba completada. Usa este código en la app.');
      } else if (data.emailSent) {
        console.log('📧 Email enviado correctamente');
        console.log('✅ Revisa tu bandeja de entrada');
      }
    } else {
      console.log('❌ La función retornó un error:', data.error);
      process.exit(1);
    }

    console.log('');
    console.log('🎯 Siguiente paso:');
    console.log('1. Abre la app en Expo Go');
    console.log('2. Click en "¿Olvidaste tu PIN?"');
    console.log('3. Ingresa el código:', data.code || '(revisa tu email)');
    console.log('');
  } catch (error) {
    console.error('❌ Error ejecutando la prueba:');
    console.error(error.message);
    console.error('');
    console.error('Posibles causas:');
    console.error('- La Edge Function no está desplegada');
    console.error('- El proyecto no es accesible');
    console.error('- Hay un error en el código de la función');
    process.exit(1);
  }
}

// Ejecutar prueba
testPinRecovery();
