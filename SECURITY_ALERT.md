# 🚨 ALERTA DE SEGURIDAD - ACCIONES INMEDIATAS REQUERIDAS

## API Keys Comprometidas - ROTAR INMEDIATAMENTE:

### 1. Google Maps API Key
- **Key comprometida:** `AIzaSyBG6zrJNWpBV9KKoekYuNzTxixSuS7-DRs`
- **Acción:** Ir a [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- **Pasos:**
  1. Deshabilitar la key comprometida
  2. Crear nueva API key
  3. Configurar restricciones apropiadas (dominio/bundleID)
  4. Actualizar `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` en `.env`

### 2. Maptiler API Key  
- **Key comprometida:** `QTGwni8621Prm01m293v`
- **Acción:** Ir a [Maptiler Account](https://cloud.maptiler.com/account/keys/)
- **Pasos:**
  1. Revocar la key comprometida
  2. Crear nueva API key
  3. Configurar restricciones de dominio
  4. Actualizar `EXPO_PUBLIC_MAPTILER_API_KEY` en `.env`

### 3. Supabase Keys (Menos crítico - son públicas por diseño)
- **Anon Key:** Rotar por precaución
- **Service Role Key:** NO debe estar en el código cliente - solo en Edge Functions

## Mejoras de Seguridad Implementadas:

✅ Removido hardcoding de API keys
✅ Implementado validación de variables de entorno  
✅ Agregado error handling para keys faltantes
✅ Comentados fallbacks inseguros

## Próximos Pasos de Seguridad:

1. **Rotar todas las keys comprometidas**
2. **Configurar restricciones de dominio/bundle ID**
3. **Implementar monitoreo de uso de APIs**
4. **Revisar logs por uso malicioso**
5. **Considerar usar secretos del sistema de CI/CD**

## Prevención Futura:

- ✅ Nunca hardcodear API keys en el código
- ✅ Usar variables de entorno para todas las keys
- ✅ Agregar `.env` al `.gitignore`
- ✅ Usar sistemas de secretos en producción
- ✅ Implementar rotación automática de keys
- ✅ Monitorear uso anómalo de APIs

## Verificación:

Después de rotar las keys, ejecutar:
```bash
grep -r "AIzaSyBG6zrJNWpBV9KKoekYuNzTxixSuS7-DRs" . --exclude-dir=.git
grep -r "QTGwni8621Prm01m293v" . --exclude-dir=.git
```

Ambos comandos deben retornar 0 resultados.
