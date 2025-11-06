#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const sharp = require('sharp');

async function generateSplash() {
  try {
    console.log('📱 Generando nuevo splash screen optimizado...');

    const assetsDir = path.join(__dirname, '../assets');
    const originalImage = path.join(assetsDir, 'branding-zeppeling.png');
    const outputImage = path.join(assetsDir, 'splash-optimized.png');

    // Dimensiones para iPhone 15 Pro Max (y compatibles)
    const width = 1284;
    const height = 2778;

    // Leer la imagen original
    const originalBuffer = fs.readFileSync(originalImage);
    const metadata = await sharp(originalBuffer).metadata();

    console.log(`📐 Imagen original: ${metadata.width}x${metadata.height}`);

    // Crear un canvas blanco
    const whiteBackground = await sharp({
      create: {
        width: width,
        height: height,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    // Redimensionar el logo manteniendo aspect ratio
    // Usamos 60% del ancho de la pantalla para el logo
    const logoWidth = Math.floor(width * 0.6);
    const resizedLogo = await sharp(originalBuffer)
      .resize(logoWidth, null, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      })
      .toBuffer();

    const resizedMetadata = await sharp(resizedLogo).metadata();

    // Calcular posición centrada
    const logoX = Math.floor((width - resizedMetadata.width) / 2);
    const logoY = Math.floor((height - resizedMetadata.height) / 2);

    console.log(`🎨 Creando splash ${width}x${height}`);
    console.log(`📍 Logo posicionado en: (${logoX}, ${logoY})`);
    console.log(`📏 Logo redimensionado a: ${resizedMetadata.width}x${resizedMetadata.height}`);

    // Crear SVG con texto "Goveling" en negro con sombra
    const textY = logoY + resizedMetadata.height + 120; // 120px debajo del logo para más espacio
    const svgText = `
      <svg width="${width}" height="${height}">
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
            <feOffset dx="0" dy="2" result="offsetblur"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <style>
          .title { 
            fill: #1a1a1a; 
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
            font-size: 80px; 
            font-weight: 700;
            letter-spacing: 3px;
            filter: url(#shadow);
          }
        </style>
        <text x="50%" y="${textY}" text-anchor="middle" class="title">Goveling</text>
      </svg>
    `;

    // Componer la imagen final
    const finalImage = await sharp(whiteBackground)
      .composite([
        {
          input: resizedLogo,
          top: logoY,
          left: logoX,
        },
        {
          input: Buffer.from(svgText),
          top: 0,
          left: 0,
        },
      ])
      .png()
      .toBuffer();

    // Guardar la imagen
    fs.writeFileSync(outputImage, finalImage);

    console.log('✅ Splash screen generado exitosamente!');
    console.log(`📁 Ubicación: ${outputImage}`);
    console.log('');
    console.log('🔄 Ahora actualizando app.json...');

    return outputImage;
  } catch (error) {
    console.error('❌ Error generando splash:', error);
    throw error;
  }
}

// Ejecutar
generateSplash()
  .then(() => {
    console.log('✨ Proceso completado!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });
