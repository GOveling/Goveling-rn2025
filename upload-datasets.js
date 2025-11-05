#!/usr/bin/env node
/**
 * Script para subir los nuevos datasets a Supabase Storage
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://iwsuyrlrbmnbfyfkqowl.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY no está configurado');
  console.error('');
  console.error('Configúralo con:');
  console.error('export SUPABASE_SERVICE_ROLE_KEY="tu-service-key"');
  process.exit(1);
}

const files = [
  { local: 'assets/geo/admin0_10m.topo.json', remote: 'admin0_10m.topo.json' },
  { local: 'assets/geo/admin1_10m.topo.json', remote: 'admin1_10m.topo.json' },
  { local: 'assets/geo/usa_states.topo.json', remote: 'usa_states.topo.json' },
];

async function uploadFile(localPath, remotePath) {
  const fullPath = path.join(__dirname, localPath);

  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Archivo no encontrado: ${fullPath}`);
    return false;
  }

  const fileContent = fs.readFileSync(fullPath);
  const stats = fs.statSync(fullPath);
  const sizeKB = (stats.size / 1024).toFixed(1);

  console.log(`📤 Subiendo ${remotePath} (${sizeKB} KB)...`);

  try {
    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/geo/${remotePath}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: fileContent,
    });

    if (response.ok) {
      console.log(`✅ ${remotePath} subido correctamente`);
      return true;
    } else {
      const error = await response.text();
      console.error(`❌ Error subiendo ${remotePath}: ${response.status}`);
      console.error(error);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error de red: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🌍 Subiendo datasets actualizados a Supabase Storage');
  console.log('='.repeat(60));
  console.log('');

  let success = 0;
  let failed = 0;

  for (const file of files) {
    const result = await uploadFile(file.local, file.remote);
    if (result) {
      success++;
    } else {
      failed++;
    }
    console.log('');
  }

  console.log('='.repeat(60));
  console.log(`✅ Completado: ${success} archivos subidos`);
  if (failed > 0) {
    console.log(`❌ Fallidos: ${failed} archivos`);
  }
  console.log('');
  console.log('Próximo paso:');
  console.log('  npx supabase functions deploy geo-lookup');
  console.log('');
}

main().catch(console.error);
