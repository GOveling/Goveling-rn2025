#!/usr/bin/env node

// Script para aplicar la migración mobile_phone usando la API REST de Supabase
const https = require('https');
const fs = require('fs');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '❌ Faltan variables de entorno EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY'
  );
  process.exit(1);
}

// SQL para aplicar la migración
const migrationSQL = `
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mobile_phone text;
COMMENT ON COLUMN public.profiles.mobile_phone IS 'Mobile phone number with country code (e.g., +34 123 456 789)';
`;

async function applyMigrationViaRPC() {
  try {
    console.log('🔧 Aplicando migración mobile_phone usando RPC...');

    const postData = JSON.stringify({
      sql: migrationSQL,
    });

    const options = {
      hostname: supabaseUrl.replace('https://', '').replace('http://', ''),
      port: 443,
      path: '/rest/v1/rpc/exec',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        Range: '0-9',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log('✅ Migración aplicada exitosamente!');
          console.log('📱 Campo mobile_phone añadido a la tabla profiles');
        } else {
          console.error('❌ Error aplicando migración:', res.statusCode, data);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Error de conexión:', error);
    });

    req.write(postData);
    req.end();
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error);
  }
}

// Alternativa: Usar psql si está disponible
async function applyMigrationViaPSQL() {
  const { execSync } = require('child_process');

  try {
    console.log('🔧 Intentando aplicar migración usando psql...');

    // Crear archivo temporal con la migración
    const tempFile = '/tmp/mobile_phone_migration.sql';
    fs.writeFileSync(tempFile, migrationSQL);

    // Obtener URL de conexión
    const dbUrl = `${supabaseUrl.replace('/rest/v1', '')}/db/postgres`;

    console.log('📝 Archivo de migración creado en:', tempFile);
    console.log('ℹ️  Para aplicar manualmente, ejecuta:');
    console.log(`psql "${dbUrl}" -f ${tempFile}`);
  } catch (error) {
    console.error('❌ Error preparando migración psql:', error);
  }
}

console.log('🚀 Iniciando aplicación de migración mobile_phone...');
console.log('📄 SQL a ejecutar:');
console.log(migrationSQL);

// Intentar RPC primero, luego psql como fallback
applyMigrationViaRPC();
applyMigrationViaPSQL();
