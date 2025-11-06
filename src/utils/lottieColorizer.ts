// src/utils/lottieColorizer.ts
import { AnimationObject } from 'lottie-react-native';

/**
 * Convierte un color hexadecimal a valores RGB normalizados [0-1]
 */
function hexToRgb(hex: string): [number, number, number] {
  // Remove # if present
  hex = hex.replace('#', '');

  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  return [r, g, b];
}

/**
 * Cambia el color de las formas (shapes) en una animación Lottie
 * Modifica strokes (líneas) y fills (rellenos) al color especificado
 */
export function colorizeLottie(animationData: AnimationObject, color: string): AnimationObject {
  // Crear una copia profunda para no modificar el original
  const clonedData = JSON.parse(JSON.stringify(animationData));
  const rgb = hexToRgb(color);

  // Función recursiva para modificar colores en layers
  function processLayer(layer: any) {
    if (layer.shapes) {
      layer.shapes.forEach((shape: any) => {
        processShape(shape);
      });
    }

    // Procesar layers anidados
    if (layer.layers) {
      layer.layers.forEach((nestedLayer: any) => {
        processLayer(nestedLayer);
      });
    }
  }

  // Función recursiva para procesar shapes
  function processShape(shape: any) {
    // Cambiar color de stroke (líneas)
    if (shape.ty === 'st' && shape.c) {
      if (shape.c.k) {
        if (Array.isArray(shape.c.k) && shape.c.k.length === 4) {
          // Color estático [r, g, b, a]
          shape.c.k = [...rgb, shape.c.k[3] || 1];
        } else if (Array.isArray(shape.c.k)) {
          // Color animado (keyframes)
          shape.c.k.forEach((keyframe: any) => {
            if (keyframe.s && Array.isArray(keyframe.s)) {
              keyframe.s = [...rgb, keyframe.s[3] || 1];
            }
          });
        }
      }
    }

    // Cambiar color de fill (rellenos)
    if (shape.ty === 'fl' && shape.c) {
      if (shape.c.k) {
        if (Array.isArray(shape.c.k) && shape.c.k.length === 4) {
          // Color estático [r, g, b, a]
          shape.c.k = [...rgb, shape.c.k[3] || 1];
        } else if (Array.isArray(shape.c.k)) {
          // Color animado (keyframes)
          shape.c.k.forEach((keyframe: any) => {
            if (keyframe.s && Array.isArray(keyframe.s)) {
              keyframe.s = [...rgb, keyframe.s[3] || 1];
            }
          });
        }
      }
    }

    // Cambiar gradient strokes
    if (shape.ty === 'gs' && shape.g && shape.g.k && shape.g.k.k) {
      // Los gradientes son más complejos, aquí aplicamos el color a todos los stops
      const gradientData = shape.g.k.k;
      if (Array.isArray(gradientData)) {
        // Gradientes estáticos: [offset1, r1, g1, b1, offset2, r2, g2, b2, ...]
        for (let i = 1; i < gradientData.length; i += 4) {
          gradientData[i] = rgb[0];
          gradientData[i + 1] = rgb[1];
          gradientData[i + 2] = rgb[2];
        }
      }
    }

    // Cambiar gradient fills
    if (shape.ty === 'gf' && shape.g && shape.g.k && shape.g.k.k) {
      const gradientData = shape.g.k.k;
      if (Array.isArray(gradientData)) {
        for (let i = 1; i < gradientData.length; i += 4) {
          gradientData[i] = rgb[0];
          gradientData[i + 1] = rgb[1];
          gradientData[i + 2] = rgb[2];
        }
      }
    }

    // Procesar grupos de shapes
    if (shape.it) {
      shape.it.forEach((subShape: any) => {
        processShape(subShape);
      });
    }
  }

  // Procesar todas las layers
  if (clonedData.layers) {
    clonedData.layers.forEach((layer: any) => {
      processLayer(layer);
    });
  }

  return clonedData;
}

/**
 * Hook personalizado para obtener una animación Lottie coloreada según el tema
 */
export function useThemedLottie(animationData: AnimationObject, isDark: boolean): AnimationObject {
  const color = isDark ? '#FFFFFF' : '#000000';
  return colorizeLottie(animationData, color);
}
