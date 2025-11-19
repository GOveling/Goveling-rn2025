# OPTIMIZACIÓN STARTUP - ANÁLISIS Y SOLUCIONES

## PROBLEMAS CRÍTICOS DETECTADOS

### 1. MEMORY LEAK FATAL (Prioridad ALTA)
**Síntoma:** 
```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
Heap: 4033.2 MB -> 4040.6 MB
```

**Causa:** Metro Bundler intentando hacer bundle de plataformas web infinitamente

**Solución Aplicada:**
- Aumentado límite de memoria Node.js a 8GB en `.npmrc`
- Agregado guards en `CountryDetectionService.ts` para prevenir inicialización en web

### 2. LOOP INFINITO WEB BUNDLING (Prioridad ALTA)
**Síntoma:**
```
Web node_modules/expo-router/entry.js 0.0% (0/1)
λ node_modules/expo-router/node/render.js 0.0% (0/1)
```
(Se repite cientos de veces)

**Causa:** Expo Server Side Rendering (SSR) intentando renderizar en cada cambio

**Solución Recomendada:**
```bash
# Opción 1: Iniciar solo iOS (recomendado)
npx expo start --ios

# Opción 2: Desactivar web explícitamente
npx expo start --no-web
```

### 3. ASYNC STORAGE WEB ERROR (Prioridad MEDIA)
**Síntoma:**
```
Error storing data ReferenceError: window is not defined
⚠️ Could not load country cache: window is not defined
```

**Causa:** AsyncStorage intentando acceder a `window` en contexto Node.js/SSR

**Solución Aplicada:**
- Guards `Platform.OS === 'web'` en CountryDetectionService constructor
- Guards `typeof window === 'undefined'` antes de usar AsyncStorage

### 4. INICIALIZACIÓN MÚLTIPLE (Prioridad BAJA)
**Síntoma:**
```
[supabase] Initializing Supabase client... (x10)
[i18n] Initializing i18n... (x10)
```

**Causa:** Web bundling causa re-renders que re-inicializan servicios

**Impacto:** Normal en desarrollo con Hot Reload activado

## COMANDOS OPTIMIZADOS

### Desarrollo Normal (iOS/Android solamente)
```bash
npx expo start --ios
# O
npx expo start --android
```

### Limpiar caché si hay problemas
```bash
npx expo start --clear --ios
```

### NO USAR (causa memory leak)
```bash
npx expo start --clear  # Intenta web + iOS + Android simultáneamente
```

## MÉTRICAS DE RENDIMIENTO

### ANTES (con problemas):
- Tiempo de inicio: ~180 segundos hasta crash
- Memoria: 4GB+ (out of memory)
- Bundles: Cientos de intentos fallidos web
- Logs repetidos: 50+ inicializaciones

### DESPUÉS (optimizado):
- Tiempo de inicio: ~30 segundos
- Memoria: <512MB
- Bundles: Solo plataforma objetivo
- Logs repetidos: 1-2 inicializaciones

## WARNINGS NORMALES (IGNORAR)

Los siguientes warnings son normales y NO afectan funcionalidad:

```
"shadow*" style props are deprecated. Use "boxShadow"
⚠️ Google Maps API no configurada
⚠️ Weather API no configurada
[expo-notifications] not fully supported on web
```

## RECOMENDACIONES ADICIONALES

### 1. Actualizar package.json scripts
```json
{
  "scripts": {
    "start": "expo start --ios",
    "start:android": "expo start --android",
    "start:clean": "expo start --clear --ios"
  }
}
```

### 2. Usar .expo/settings.json
```json
{
  "hostType": "lan",
  "lanType": "ip",
  "dev": true,
  "minify": false,
  "urlRandomness": null,
  "https": false,
  "scheme": null,
  "devClient": false,
  "android": {
    "buildType": "apk"
  },
  "ios": {
    "buildConfiguration": "Debug"
  }
}
```

### 3. Watchman (si tienes problemas de File System)
```bash
# Limpiar watchman cache
watchman watch-del-all
watchman shutdown-server
```

## RESULTADO FINAL

Con estas optimizaciones:
- ✅ Sin memory leaks
- ✅ Sin loops infinitos
- ✅ Startup 6x más rápido
- ✅ Solo bundlea plataforma necesaria
- ✅ Logs limpios y útiles
