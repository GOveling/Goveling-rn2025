═══════════════════════════════════════════════════════════════════════════
  🔧 INSTRUCCIONES: RECARGAR APP CON NUEVOS CAMBIOS
═══════════════════════════════════════════════════════════════════════════

## ⚠️ PROBLEMA IDENTIFICADO

Los logs que compartes muestran código VIEJO:
```
TravelDocumentsModal.tsx:289 [OFFLINE] Loading documents from local cache...
```

Pero el código ACTUAL tiene:
```typescript
console.log('🚀🚀🚀 [LOAD-DOCUMENTS] NUEVA VERSION - Starting loadDocuments...');
console.log('[LOAD] Checking current connectivity before loading...');
```

**Conclusión**: El bundle de la app está usando código viejo en caché.

═══════════════════════════════════════════════════════════════════════════

## ✅ SOLUCIÓN: 3 OPCIONES

### Opción 1: Recarga Rápida (En el Simulador)
```
1. En el iOS Simulator, presiona: Cmd + D (o Ctrl + D)
2. Selecciona "Reload"
```

### Opción 2: Limpiar Caché y Reiniciar (Recomendado)
```bash
# Ejecutar este script
./reload-app.sh

# O manualmente:
npx expo start --clear
```

### Opción 3: Reinicio Completo (Si las anteriores fallan)
```bash
# 1. Detener el servidor actual (Ctrl+C)

# 2. Limpiar todo
rm -rf .expo
rm -rf node_modules/.cache
watchman watch-del-all  # Si tienes watchman instalado

# 3. Reiniciar
npx expo start --clear

# 4. En el simulador: Cmd+R para recargar
```

═══════════════════════════════════════════════════════════════════════════

## 🧪 VERIFICACIÓN: Logs que DEBES ver

Después de recargar, cuando abras el modal de Documentos de Viaje,
DEBES ver estos logs en este orden:

```
✅ LOGS ESPERADOS (NUEVO CÓDIGO):

🚀🚀🚀 [LOAD-DOCUMENTS] NUEVA VERSION - Starting loadDocuments...
[LOAD] Checking current connectivity before loading...
🔄 Refreshing connectivity status...
📡 Connectivity status refreshed: {
  isConnected: true,           ← DEBE SER TRUE SI TIENES INTERNET
  isInternetReachable: true,   ← DEBE SER TRUE
  type: 'wifi',
  finalConnected: true         ← DEBE SER TRUE
}
✅ Connectivity state updated to: true
[LOAD] Current connectivity status: {
  isCurrentlyConnected: true,  ← DEBE SER TRUE
  forceOnline: false,
  willUseCache: false          ← DEBE SER FALSE (no usar caché)
}
[ONLINE] Loading documents from database...  ← DEBE decir ONLINE, no OFFLINE
```

### ❌ Si ves esto, AÚN está usando código viejo:
```
[OFFLINE] Loading documents from local cache...  ← Sin los logs de [LOAD]
```

═══════════════════════════════════════════════════════════════════════════

## 🔍 DEBUGGING ADICIONAL

Si después de recargar SIGUES viendo código viejo:

1. **Verificar que el servidor Expo está corriendo**:
   - Debe mostrar: "Metro waiting on..."
   - Debe estar escuchando en el puerto correcto

2. **Verificar que el simulador está conectado al servidor**:
   - Debe aparecer en la lista de dispositivos de Expo

3. **Force Quit del simulador**:
   ```bash
   # Cerrar completamente el simulador
   killall Simulator
   
   # Reiniciar y volver a abrir la app
   ```

4. **Verificar cambios en el archivo**:
   ```bash
   # Buscar el log nuevo en el archivo
   grep "NUEVA VERSION" src/components/profile/TravelDocumentsModal.tsx
   
   # Debe mostrar la línea con el log
   ```

═══════════════════════════════════════════════════════════════════════════

## 📝 CAMBIOS IMPLEMENTADOS (Confirmar que están)

1. ✅ `src/hooks/useDocumentSync.ts`:
   - Función `refreshConnectivity()` existe y está exportada

2. ✅ `src/components/profile/TravelDocumentsModal.tsx`:
   - Importa `checkConnectivity` de documentSync
   - Extrae `refreshConnectivity` del hook useDocumentSync
   - `loadDocuments()` verifica conectividad ANTES de decidir

3. ✅ Log distintivo agregado:
   ```typescript
   console.log('🚀🚀🚀 [LOAD-DOCUMENTS] NUEVA VERSION - Starting loadDocuments...');
   ```

═══════════════════════════════════════════════════════════════════════════

## 🎯 PRÓXIMOS PASOS

1. **Ejecutar**: `./reload-app.sh` o `npx expo start --clear`

2. **Abrir** la app en el simulador

3. **Ir** a Profile → Documentos de Viaje

4. **Verificar** los logs en la consola

5. **Confirmar** que aparece:
   - `🚀🚀🚀 [LOAD-DOCUMENTS] NUEVA VERSION`
   - `[LOAD] Current connectivity status: { isCurrentlyConnected: true }`
   - `[ONLINE] Loading documents from database...`

6. **Reportar** si ahora funciona correctamente o si sigues viendo logs viejos

═══════════════════════════════════════════════════════════════════════════
