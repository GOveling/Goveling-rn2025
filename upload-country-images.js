#!/usr/bin/env node

/**
 * 🖼️ Upload Country Images to Supabase Storage
 *
 * Este script descarga imágenes de países desde Unsplash y las sube al bucket público de Supabase
 * en la carpeta country-images/
 */

const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

const fs = require('fs').promises;
const path = require('path');

// Configuración
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://iwsuyrlrbmnbfyfkqowl.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.argv[2];

if (!SERVICE_ROLE_KEY) {
  console.error('❌ Error: Se requiere la SERVICE_ROLE_KEY');
  console.log('Uso: node upload-country-images.js <SERVICE_ROLE_KEY>');
  console.log(
    'O establecer la variable: SUPABASE_SERVICE_ROLE_KEY=<key> node upload-country-images.js'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Mapeo de países con sus imágenes de Unsplash optimizadas para móviles
const COUNTRY_IMAGES = {
  MX: {
    url: 'https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?w=400&h=400&fit=crop&q=80',
    description: 'Chichen Itza - Mexico',
  },
  CL: {
    url: 'https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=400&h=400&fit=crop&q=80',
    description: 'Torres del Paine - Chile',
  },
  US: {
    url: 'https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=400&h=400&fit=crop&q=80',
    description: 'Statue of Liberty - United States',
  },
  FR: {
    url: 'https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=400&h=400&fit=crop&q=80',
    description: 'Eiffel Tower - France',
  },
  BR: {
    url: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=400&h=400&fit=crop&q=80',
    description: 'Christ the Redeemer - Brazil',
  },
  AR: {
    url: 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=400&h=400&fit=crop&q=80',
    description: 'Buenos Aires - Argentina',
  },
  PE: {
    url: 'https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=400&h=400&fit=crop&q=80',
    description: 'Machu Picchu - Peru',
  },
  CO: {
    url: 'https://images.unsplash.com/photo-1605722243979-fe0be8158232?w=400&h=400&fit=crop&q=80',
    description: 'Cartagena - Colombia',
  },
  ES: {
    url: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=400&h=400&fit=crop&q=80',
    description: 'Sagrada Familia - Spain',
  },
  IT: {
    url: 'https://images.unsplash.com/photo-1525874684015-58379d421a52?w=400&h=400&fit=crop&q=80',
    description: 'Colosseum - Italy',
  },
  JP: {
    url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&h=400&fit=crop&q=80',
    description: 'Mount Fuji - Japan',
  },
  GB: {
    url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=400&fit=crop&q=80',
    description: 'Big Ben - United Kingdom',
  },
  DE: {
    url: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=400&h=400&fit=crop&q=80',
    description: 'Brandenburg Gate - Germany',
  },
  AU: {
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop&q=80',
    description: 'Sydney Opera House - Australia',
  },
  TH: {
    url: 'https://images.unsplash.com/photo-1551986782-d0169b3f8fa7?w=400&h=400&fit=crop&q=80',
    description: 'Thai Temples - Thailand',
  },
  CN: {
    url: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=400&h=400&fit=crop&q=80',
    description: 'Great Wall - China',
  },
};

async function downloadImage(url, countryCode) {
  try {
    console.log(`📥 Descargando imagen para ${countryCode}...`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const buffer = await response.buffer();

    console.log(`✅ Imagen descargada para ${countryCode}: ${buffer.length} bytes`);
    return buffer;
  } catch (error) {
    console.error(`❌ Error descargando imagen para ${countryCode}:`, error);
    return null;
  }
}

async function uploadToSupabase(buffer, countryCode, description) {
  try {
    const filePath = `country-images/${countryCode}.jpg`;

    console.log(`📤 Subiendo ${filePath} a Supabase...`);

    const { data, error } = await supabase.storage.from('public').upload(filePath, buffer, {
      contentType: 'image/jpeg',
      upsert: true, // Sobrescribir si ya existe
      cacheControl: '3600', // Cache por 1 hora
    });

    if (error) {
      throw error;
    }

    console.log(`✅ Subida exitosa: ${filePath}`);

    // Verificar que se puede obtener la URL pública
    const {
      data: { publicUrl },
    } = supabase.storage.from('public').getPublicUrl(filePath);

    console.log(`🔗 URL pública: ${publicUrl}`);

    return { path: filePath, url: publicUrl };
  } catch (error) {
    console.error(`❌ Error subiendo ${countryCode}:`, error);
    return null;
  }
}

async function updateMetadata(countryCode, imagePath, description, fileSize) {
  try {
    const { error } = await supabase.from('country_images_metadata').upsert({
      country_code: countryCode,
      image_path: imagePath,
      description: description,
      file_size: fileSize,
      dimensions: '400x400',
    });

    if (error) {
      console.warn(`⚠️  Warning updating metadata for ${countryCode}:`, error.message);
    } else {
      console.log(`📝 Metadata actualizada para ${countryCode}`);
    }
  } catch (error) {
    console.warn(`⚠️  Warning updating metadata for ${countryCode}:`, error);
  }
}

async function main() {
  console.log('🚀 Iniciando carga de imágenes de países...');
  console.log(`📊 Total de países: ${Object.keys(COUNTRY_IMAGES).length}`);

  let successCount = 0;
  let errorCount = 0;

  for (const [countryCode, info] of Object.entries(COUNTRY_IMAGES)) {
    try {
      console.log(`\n🌍 Procesando ${countryCode}: ${info.description}`);

      // Descargar imagen
      const buffer = await downloadImage(info.url, countryCode);
      if (!buffer) {
        errorCount++;
        continue;
      }

      // Subir a Supabase
      const result = await uploadToSupabase(buffer, countryCode, info.description);
      if (!result) {
        errorCount++;
        continue;
      }

      // Actualizar metadata
      await updateMetadata(countryCode, result.path, info.description, buffer.length);

      successCount++;

      // Pequeña pausa para no saturar
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`❌ Error procesando ${countryCode}:`, error);
      errorCount++;
    }
  }

  console.log('\n📊 Resumen final:');
  console.log(`✅ Éxitos: ${successCount}`);
  console.log(`❌ Errores: ${errorCount}`);
  console.log(
    `📈 Tasa de éxito: ${Math.round((successCount / Object.keys(COUNTRY_IMAGES).length) * 100)}%`
  );

  if (successCount > 0) {
    console.log('\n🎉 ¡Imágenes de países cargadas exitosamente!');
    console.log('🔗 Puedes verificar las imágenes en tu dashboard de Supabase Storage');
    console.log('📱 Las imágenes aparecerán automáticamente en los TripCards');
  }
}

// Verificar dependencias
async function checkDependencies() {
  try {
    require('node-fetch');
    return true;
  } catch (e) {
    console.log('📦 Instalando dependencia node-fetch...');
    const { exec } = require('child_process');

    return new Promise((resolve) => {
      exec('npm install node-fetch@2', (error) => {
        if (error) {
          console.error('❌ Error instalando node-fetch:', error);
          resolve(false);
        } else {
          console.log('✅ node-fetch instalado');
          // Limpiar cache y recargar
          delete require.cache[require.resolve('node-fetch')];
          resolve(true);
        }
      });
    });
  }
}

// Ejecutar
checkDependencies().then((ready) => {
  if (ready) {
    main().catch(console.error);
  } else {
    console.error('❌ No se pudieron instalar las dependencias');
    process.exit(1);
  }
});
