# 🔐 Configuración Segura de API Keys

## ✅ Estado Actual

### APIs Core (Funcionales)
- **Supabase** ✅ - Autenticación, base de datos
- **Google OAuth** ✅ - Login con Google  
- **Weather API** ✅ - Clima (usa APIs gratuitas)
- **Geographic API** ✅ - Países y ciudades (API propia)

### APIs Opcionales (Requieren configuración)
- **Google Maps** ⚠️ - Mapas avanzados
- **Maptiler** ⚠️ - Mapas alternativos

## 🚀 Tu app YA funciona con:

1. **Autenticación completa** (email/password + Google OAuth)
2. **Sistema de países y ciudades**
3. **Información del clima**
4. **Todas las funciones de Supabase**

## 🔧 Para activar funcionalidades adicionales:

### Google Maps API
```bash
# 1. Ve a https://console.cloud.google.com/apis/credentials
# 2. Crea un nuevo proyecto o selecciona uno existente
# 3. Habilita "Maps SDK for Android" y "Maps SDK for iOS"
# 4. Crea una API key
# 5. Configura restricciones por aplicación
```

```env
# En tu archivo .env:
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=tu_nueva_google_maps_key
```

### Maptiler API
```bash
# 1. Ve a https://maptiler.com/account/keys/
# 2. Regístrate o inicia sesión
# 3. Crea una nueva API key
# 4. Configura restricciones de dominio
```

```env
# En tu archivo .env:
EXPO_PUBLIC_MAPTILER_API_KEY=tu_nueva_maptiler_key
```

## 🛡️ Características de Seguridad

### ✅ Lo que está protegido:
- ✅ **Cero API keys hardcodeadas** en el código
- ✅ **Validación automática** de configuración
- ✅ **Fallbacks seguros** para APIs no configuradas
- ✅ **Logs informativos** sobre estado de APIs
- ✅ **Configuración centralizada** en `src/config/apiKeys.ts`

### 🔍 Cómo verificar:
```bash
# Ejecutar diagnóstico:
./setup-api-keys.sh

# O verificar manualmente que no hay keys expuestas:
grep -r "AIza\|sk-\|pk\." src/ --exclude-dir=node_modules
```

## 🎯 Funcionalidades por API:

| API | Estado | Funcionalidad | Alternativa si no está configurada |
|-----|--------|---------------|-----------------------------------|
| Supabase | ✅ Configurado | Autenticación, DB | ❌ App no funciona |
| Google OAuth | ✅ Configurado | Login con Google | Solo email/password |
| Weather | ✅ Configurado | Clima actual | ✅ Usa APIs gratuitas |
| Geographic | ✅ Configurado | Países/ciudades | ✅ Usa API propia |
| Google Maps | ⚠️ Opcional | Mapas avanzados | Mapas básicos |
| Maptiler | ⚠️ Opcional | Mapas estilizados | OpenStreetMap básico |

## 🚀 Comandos Rápidos:

```bash
# Verificar configuración:
./setup-api-keys.sh

# Limpiar y reiniciar:
npm start --clear

# Verificar que no hay keys expuestas:
npm run security-check
```

## 📱 Testing:

Tu app ahora funciona en estos escenarios:

1. **Desarrollo**: Todas las funciones core + opcionales si están configuradas
2. **Producción**: Misma funcionalidad, todas las keys desde variables de entorno
3. **Sin Google Maps**: Usa mapas básicos como fallback
4. **Sin Maptiler**: Usa OpenStreetMap como fallback

## 🔄 Rotación de Keys:

Si necesitas rotar alguna key:

1. Genera nueva key en el servicio correspondiente
2. Actualiza el valor en `.env`
3. Reinicia la app con `npm start --clear`
4. Las keys anteriores dejan de funcionar automáticamente

## ⚡ Resumen:

**✅ Tu app YA está 100% funcional y segura**
- Cero exposición de API keys
- Funcionalidades core operativas
- Fallbacks seguros implementados
- Configuración opcional para funciones avanzadas
