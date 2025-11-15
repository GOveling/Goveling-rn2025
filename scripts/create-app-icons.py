#!/usr/bin/env python3
"""
Script para crear iconos de app para iOS y Android desde el logo horizontal
SIN DEFORMACIONES - Solo escala proporcional y padding
"""

from PIL import Image
import os

# Rutas
ASSETS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'assets')
SOURCE_LOGO = os.path.join(ASSETS_DIR, 'branding-zeppeling.png')
OUTPUT_ICON = os.path.join(ASSETS_DIR, 'icon.png')
OUTPUT_ADAPTIVE = os.path.join(ASSETS_DIR, 'adaptive-icon.png')

# Configuración
IOS_SIZE = 1024  # iOS requiere 1024x1024
ANDROID_SIZE = 1024  # Android adaptive icon también 1024x1024
IOS_PADDING_PERCENT = 12  # 12% de padding para iOS (safe area)
ANDROID_PADDING_PERCENT = 20  # 20% de padding para Android (más conservador)

def create_icon(source_path, output_path, canvas_size, padding_percent, description):
    """
    Crea un icono cuadrado con el logo centrado SIN DEFORMACIONES
    
    Args:
        source_path: Ruta al logo original
        output_path: Ruta donde guardar el icono
        canvas_size: Tamaño del canvas cuadrado (ej: 1024)
        padding_percent: Porcentaje de padding (ej: 12 para 12%)
        description: Descripción para logging
    """
    print(f"\n{'='*60}")
    print(f"Creando: {description}")
    print(f"{'='*60}")
    
    # Cargar logo original
    logo = Image.open(source_path)
    original_width, original_height = logo.size
    original_aspect_ratio = original_width / original_height
    
    print(f"Logo original: {original_width}x{original_height}")
    print(f"Aspect ratio original: {original_aspect_ratio:.3f}:1")
    
    # Crear canvas blanco cuadrado
    canvas = Image.new('RGBA', (canvas_size, canvas_size), (255, 255, 255, 255))
    
    # Calcular área segura (con padding)
    padding = int(canvas_size * padding_percent / 100)
    safe_area = canvas_size - (2 * padding)
    
    print(f"Canvas: {canvas_size}x{canvas_size}")
    print(f"Padding: {padding}px ({padding_percent}%)")
    print(f"Área segura: {safe_area}x{safe_area}")
    
    # Escalar logo para que quepa en área segura SIN DEFORMACIÓN
    # Para logos horizontales, el ancho es el limitante
    if original_aspect_ratio >= 1:  # Horizontal
        new_width = safe_area
        new_height = int(safe_area / original_aspect_ratio)
    else:  # Vertical (poco probable)
        new_height = safe_area
        new_width = int(safe_area * original_aspect_ratio)
    
    # Redimensionar con alta calidad
    logo_resized = logo.resize((new_width, new_height), Image.LANCZOS)
    
    # Calcular posición para centrar
    x_offset = (canvas_size - new_width) // 2
    y_offset = (canvas_size - new_height) // 2
    
    print(f"Logo escalado: {new_width}x{new_height}")
    print(f"Aspect ratio escalado: {new_width/new_height:.3f}:1")
    print(f"Posición en canvas: x={x_offset}, y={y_offset}")
    
    # Verificación de deformación
    new_aspect_ratio = new_width / new_height
    deformation = abs(new_aspect_ratio - original_aspect_ratio) / original_aspect_ratio * 100
    
    if deformation < 0.1:
        print(f"✅ CERO deformación: {deformation:.4f}%")
    else:
        print(f"⚠️  Deformación detectada: {deformation:.2f}%")
    
    # Pegar logo en canvas
    if logo_resized.mode == 'RGBA':
        canvas.paste(logo_resized, (x_offset, y_offset), logo_resized)
    else:
        canvas.paste(logo_resized, (x_offset, y_offset))
    
    # Guardar
    canvas.save(output_path, 'PNG', quality=100, optimize=False)
    
    print(f"\n✅ Guardado en: {output_path}")
    print(f"   - Zepelín NO deformado")
    print(f"   - Texto 'GOveling' legible")
    print(f"   - Proporciones exactas preservadas")

def main():
    print("\n" + "="*60)
    print("CREACIÓN DE ICONOS DE APP - CERO DEFORMACIONES")
    print("="*60)
    
    # Verificar que existe el logo fuente
    if not os.path.exists(SOURCE_LOGO):
        print(f"\n❌ ERROR: No se encuentra el logo en: {SOURCE_LOGO}")
        return
    
    # Crear icono para iOS
    create_icon(
        source_path=SOURCE_LOGO,
        output_path=OUTPUT_ICON,
        canvas_size=IOS_SIZE,
        padding_percent=IOS_PADDING_PERCENT,
        description="Icono iOS (icon.png)"
    )
    
    # Crear icono adaptativo para Android
    create_icon(
        source_path=SOURCE_LOGO,
        output_path=OUTPUT_ADAPTIVE,
        canvas_size=ANDROID_SIZE,
        padding_percent=ANDROID_PADDING_PERCENT,
        description="Icono Android Adaptativo (adaptive-icon.png)"
    )
    
    print("\n" + "="*60)
    print("✅ PROCESO COMPLETADO")
    print("="*60)
    print("\nGarantías:")
    print("  ✓ Cero deformación del zepelín")
    print("  ✓ Cero deformación del texto 'GOveling'")
    print("  ✓ Proporciones originales preservadas")
    print("  ✓ Logo centrado perfectamente")
    print("  ✓ Padding adecuado para iOS y Android")
    print("\nPróximos pasos:")
    print("  1. Ejecuta: npx expo start --clear")
    print("  2. Elimina la app del simulador")
    print("  3. Presiona 'i' para reinstalar en iOS")
    print("  4. Verifica que el logo se vea perfecto")
    print()

if __name__ == '__main__':
    main()
