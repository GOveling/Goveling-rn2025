# 🐛 DEBUG: Limpiar Cache de Detección de Países

## Problema
Después de limpiar la tabla `country_visits` en la base de datos, el cache de AsyncStorage todavía contiene el país anterior, causando que:
- ❌ El modal de bienvenida NO aparece
- ❌ Las estadísticas NO se actualizan
- ❌ La detección parece "congelada"

## Solución Rápida

### Opción 1: Desde la Consola de React Native Debugger

1. Abre la app en Expo Go
2. Abre el debugger (shake device → "Debug")
3. En la consola del navegador, ejecuta:

```javascript
import('react-native').then(RN => 
  RN.default.NativeModules.AsyncStorageModule.clear()
).then(() => console.log('✅ AsyncStorage cleared - reload app'))
```

### Opción 2: Usar el Hook de Debug (RECOMENDADO)

En `app/(tabs)/index.tsx`, el hook `useCountryDetectionOnAppStart` expone un método de debug:

```tsx
const { pendingCountryVisit, dismissModal, clearCacheAndRedetect } = useCountryDetectionOnAppStart();

// En desarrollo, puedes llamar:
// clearCacheAndRedetect?.(); // Limpia cache y re-detecta
```

Puedes agregar temporalmente un botón de debug:

```tsx
{__DEV__ && clearCacheAndRedetect && (
  <TouchableOpacity 
    onPress={clearCacheAndRedetect}
    style={{ position: 'absolute', top: 50, right: 20, backgroundColor: 'red', padding: 10 }}
  >
    <Text style={{ color: 'white' }}>🧹 Clear Country Cache</Text>
  </TouchableOpacity>
)}
```

### Opción 3: Desinstalar y Reinstalar la App

- Desinstala completamente la app de tu dispositivo/simulador
- Vuelve a instalar desde Expo Go
- El cache se limpiará automáticamente

## Verificación

Después de limpiar el cache, deberías ver en los logs:

```
🧹 Country cache cleared and state reset
🚀 App launched - detecting country...
📍 Current coordinates: [-33.xxxx, -70.xxxx]
🎯 Detected country: 🇨🇱 Chile (CL)
🆕 First country visit: Chile
✅ Country visit saved successfully
```

## Prevención

El sistema ahora usa **DB como fuente de verdad**:
- ✅ Cache se sincroniza automáticamente con DB
- ✅ Primera detección es instantánea
- ✅ Cambios de país requieren 3 confirmaciones (1.5 min) para evitar falsos positivos

## Logs Útiles

Para verificar el estado del sistema:

```
💾 Last visit in DB: Chile (CL) on 2025-11-02
💾 Loaded last detected country from cache: CL
✅ Still in Chile - no modal needed
```

Si ves `null` en DB pero tienes cache:
```
💾 Loaded last detected country from cache: CL
❌ No last visit found in DB
🆕 First country visit: Chile
```

Esto indica inconsistencia - usa `clearCacheAndRedetect()` para arreglar.
