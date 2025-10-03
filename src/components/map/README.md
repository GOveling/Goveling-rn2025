# 🗺️ Estrategia de Mapas Multiplataforma

## 📋 Resumen

Este proyecto implementa una estrategia optimizada de mapas que utiliza la mejor solución nativa para cada plataforma:

- **🌐 Web**: MapLibre GL JS (directo)
- **🤖 Android**: MapLibre GL JS (nativo)
- **🍎 iOS**: Apple Maps (MapKit)
- **🔄 Fallback**: WebView con MapLibre GL JS (Expo Go)

## 🎯 Beneficios

### 🚀 Rendimiento Optimizado
- **iOS**: Usa MapKit nativo para mejor rendimiento y menor uso de batería
- **Android**: MapLibre GL nativo para renderizado GPU optimizado
- **Web**: MapLibre GL JS directo sin overhead de WebView

### 👤 Experiencia de Usuario
- **iOS**: Interfaz familiar de Apple Maps que los usuarios esperan
- **Android**: MapLibre altamente personalizable
- **Web**: Experiencia web moderna y responsiva

### 📱 Cumplimiento de Guidelines
- **Apple**: Prefiere el uso de MapKit sobre soluciones de terceros
- **Google**: Permite flexibilidad en la elección de proveedores de mapas

## 🏗️ Arquitectura

### 📁 Estructura de Archivos
```
src/components/map/
├── UniversalMap.tsx      # Componente principal con lógica de selección
├── AppleMap.tsx          # Implementación para iOS con MapKit
└── README.md            # Esta documentación
```

### 🔀 Lógica de Selección

```typescript
export const UniversalMap = ({ userLocation, places, style }) => {
  // 1. Web: MapLibre GL JS directo
  if (Platform.OS === 'web') {
    return <WebDirectMap />;
  }

  // 2. iOS: Apple Maps (MapKit)
  if (Platform.OS === 'ios' && AppleMap) {
    return <AppleMap />;
  }

  // 3. Android: MapLibre nativo
  if (Platform.OS === 'android' && NativeMapLibre) {
    return <NativeMapLibreComponent />;
  }

  // 4. Fallback: WebView con MapLibre
  return <WebViewMap />;
};
```

## 🛠️ Configuración

### 📦 Dependencias

```json
{
  "react-native-maps": "^1.x.x",     // Apple Maps en iOS
  "maplibre-gl": "^3.x.x",           // MapLibre para web
  "@types/maplibre-gl": "^3.x.x"     // Tipos TypeScript
}
```

### ⚙️ Plugins Expo (app.json)

```json
{
  "plugins": [
    [
      "react-native-maps",
      {
        "useAppleMapKit": true,
        "useGoogleMaps": false
      }
    ]
  ]
}
```

## 🔧 Componentes

### 🌐 WebDirectMap
- **Plataforma**: Web
- **Tecnología**: MapLibre GL JS directo
- **Características**: 
  - Renderizado GPU
  - Controles de navegación
  - Marcadores personalizados
  - Ajuste automático de bounds

### 🍎 AppleMap
- **Plataforma**: iOS
- **Tecnología**: react-native-maps con MapKit
- **Características**:
  - Maps nativo de Apple
  - Marcadores nativos
  - Cálculo automático de región
  - Controles de ubicación integrados

### 🔄 WebViewMap (Fallback)
- **Plataforma**: Expo Go, casos especiales
- **Tecnología**: WebView + MapLibre GL JS
- **Características**:
  - Compatible con Expo Go
  - HTML embebido optimizado
  - Misma funcionalidad que WebDirectMap

## 📱 Uso

```typescript
import { UniversalMap } from '@/src/components/map/UniversalMap';

// Usar el componente
<UniversalMap
  userLocation={{ latitude: 40.4168, longitude: -3.7038 }}
  places={[
    {
      id: 1,
      name: "Lugar Ejemplo",
      coordinates: { lat: 40.4168, lng: -3.7038 }
    }
  ]}
  style={{ flex: 1 }}
/>
```

## 🎨 Personalización

### 🎯 Marcadores
- **Usuario**: Azul (#007AFF) en todas las plataformas
- **Lugares**: Rojo (#FF3B30) con números
- **iOS**: Usa pins nativos de MapKit
- **Web/Android**: Marcadores HTML personalizados

### 🗺️ Estilos de Mapa
- **iOS**: Estilo estándar de Apple Maps
- **Web/Android**: MapLibre demo style (demotiles.maplibre.org)

## 🔮 Futuras Mejoras

1. **🎨 Temas Personalizados**: Estilos de mapa consistentes entre plataformas
2. **📍 Clustering**: Agrupación de marcadores en zooms alejados
3. **🛣️ Rutas**: Integración con direcciones y navegación
4. **🔍 Geocoding**: Búsqueda de lugares integrada
5. **📊 Analytics**: Métricas de uso por plataforma

## 🐛 Troubleshooting

### ❌ Error: "Cannot read property 'hostname' of undefined"
**Solución**: Verificar que `window.location` existe antes de acceder a sus propiedades.

### ❌ Maps no aparece en iOS
**Solución**: Verificar que react-native-maps está correctamente configurado en app.json.

### ❌ Marcadores no aparecen
**Solución**: Verificar que las coordenadas están en formato correcto `{ lat: number, lng: number }`.

## 📞 Soporte

Para problemas específicos de mapas, revisar:
- Logs de consola en desarrollo
- Configuración de permisos de ubicación
- Compatibilidad de plataforma
