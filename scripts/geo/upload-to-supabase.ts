/**
 * Script para subir archivos TopoJSON a Supabase Storage
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = 'https://iwsuyrlrbmnbfyfkqowl.supabase.co';
const SUPABASE_SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3c3V5cmxyYm1uYmZ5Zmtxb3dsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjM1NzMxMCwiZXhwIjoyMDQxOTMzMzEwfQ.cZVLqRfJ_sfbXu6fGJqOHdOC7pYQiB9lBrBgMN-UkXg';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function uploadGeoFiles() {
  console.log('📤 Subiendo archivos TopoJSON a Supabase Storage\n');
  console.log('='.repeat(60));
  console.log('');

  try {
    // 1) Verificar/crear bucket 'geo'
    console.log('🪣 Verificando bucket "geo"...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('❌ Error listando buckets:', listError);
      return;
    }

    const geoBucket = buckets?.find((b) => b.name === 'geo');

    if (!geoBucket) {
      console.log('🆕 Creando bucket "geo" (público)...');
      const { error: createError } = await supabase.storage.createBucket('geo', {
        public: true,
        fileSizeLimit: 52428800, // 50 MB
        allowedMimeTypes: ['application/json', 'application/geo+json', 'application/octet-stream'],
      });

      if (createError) {
        console.error('❌ Error creando bucket:', createError);
        return;
      }
      console.log('✅ Bucket "geo" creado correctamente\n');
    } else {
      console.log('✅ Bucket "geo" ya existe\n');
    }

    // 2) Subir admin0.topo.json
    const admin0Path = path.join(__dirname, '../../assets/geo/admin0.topo.json');

    if (!fs.existsSync(admin0Path)) {
      console.error(`❌ Archivo no encontrado: ${admin0Path}`);
      console.log('💡 Ejecuta primero: ./scripts/geo/prepare-geo-data.sh');
      return;
    }

    const admin0Buffer = fs.readFileSync(admin0Path);
    const admin0Size = (admin0Buffer.length / 1024).toFixed(2);

    console.log(`📤 Subiendo admin0.topo.json (${admin0Size} KB)...`);

    const { error: upload0Error } = await supabase.storage
      .from('geo')
      .upload('admin0.topo.json', admin0Buffer, {
        contentType: 'application/json',
        upsert: true,
      });

    if (upload0Error) {
      console.error('❌ Error subiendo admin0:', upload0Error);
    } else {
      console.log(`✅ admin0.topo.json subido correctamente`);
    }

    // 3) Subir admin1.topo.json
    const admin1Path = path.join(__dirname, '../../assets/geo/admin1.topo.json');

    if (!fs.existsSync(admin1Path)) {
      console.error(`❌ Archivo no encontrado: ${admin1Path}`);
      return;
    }

    const admin1Buffer = fs.readFileSync(admin1Path);
    const admin1Size = (admin1Buffer.length / 1024).toFixed(2);

    console.log(`📤 Subiendo admin1.topo.json (${admin1Size} KB)...`);

    const { error: upload1Error } = await supabase.storage
      .from('geo')
      .upload('admin1.topo.json', admin1Buffer, {
        contentType: 'application/json',
        upsert: true,
      });

    if (upload1Error) {
      console.error('❌ Error subiendo admin1:', upload1Error);
    } else {
      console.log(`✅ admin1.topo.json subido correctamente`);
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('✅ Archivos subidos exitosamente a Supabase Storage');
    console.log('');
    console.log('📍 URLs públicas:');
    console.log(`   Admin0: ${SUPABASE_URL}/storage/v1/object/public/geo/admin0.topo.json`);
    console.log(`   Admin1: ${SUPABASE_URL}/storage/v1/object/public/geo/admin1.topo.json`);
    console.log('');
    console.log('📋 Próximo paso: Ejecutar la migración SQL para crear tabla geo_cache');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

uploadGeoFiles();
