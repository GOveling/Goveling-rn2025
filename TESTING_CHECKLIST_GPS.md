# ✅ Checklist de Testing: Sistema GPS Dual

## 📋 Tests Funcionales

### 1. Modo Pasivo (Sin Travel Mode)

- [ ] **Test 1.1**: App abierta sin Travel Mode
  - Abrir app
  - NO activar Travel Mode
  - Verificar logs: "PASSIVE" mode
  - Verificar interval: 300000ms (5 min) o mayor
  - Esperar 5-10 minutos y verificar que hace lectura GPS

- [ ] **Test 1.2**: Background con Modo Pasivo
  - App sin Travel Mode
  - Poner app en background
  - Verificar logs: interval aumenta 2x (10 min)
  - Verificar que NO drena batería rápidamente

- [ ] **Test 1.3**: Detección de cambio de país en Modo Pasivo
  - Simular viaje largo (o usar coordenadas de prueba)
  - Sin Travel Mode activo
  - Verificar que detecta cambio de país en 15-30 min
  - Verificar modal aparece correctamente

### 2. Travel Mode Activo

- [ ] **Test 2.1**: Activar Travel Mode
  - Presionar botón "Start Travel Mode"
  - Verificar logs: "Travel Mode ACTIVATED"
  - Verificar logs: "TRAVEL_MODE" en calculateInterval
  - Verificar interval: 3000ms (3s) o similar

- [ ] **Test 2.2**: Tracking frecuente en Travel Mode
  - Travel Mode activo
  - Verificar lecturas GPS cada 3-18 segundos
  - Verificar que guarda puntos GPS para mapa de calor
  - Caminar/moverse y verificar que crea ruta

- [ ] **Test 2.3**: Background con Travel Mode
  - Travel Mode activo
  - Poner app en background
  - Verificar interval: 6000ms (6s)
  - Verificar que sigue tracking (con permisos background)

- [ ] **Test 2.4**: Desactivar Travel Mode
  - Detener Travel Mode
  - Verificar logs: "Travel Mode DEACTIVATED"
  - Verificar logs: "PASSIVE" en próximo calculateInterval
  - Verificar que interval cambia a 5-30 min

### 3. Transiciones

- [ ] **Test 3.1**: Pasivo → Travel Mode → Pasivo
  - Iniciar sin Travel Mode (pasivo)
  - Activar Travel Mode
  - Verificar cambio de interval (5min → 3s)
  - Desactivar Travel Mode
  - Verificar vuelta a interval largo (3s → 5min)

- [ ] **Test 3.2**: Foreground → Background → Foreground
  - Con Travel Mode: 3s → 6s → 3s
  - Sin Travel Mode: 5min → 10min → 5min
  - Verificar multiplicadores aplicados correctamente

- [ ] **Test 3.3**: Cambios de Energy Mode
  - Normal → Saving: interval × 1.5
  - Saving → Ultra: interval × 2 (desde saving)
  - Verificar en ambos modos (Travel y Pasivo)

### 4. Sistema de Confirmaciones

- [ ] **Test 4.1**: Primera detección (instantánea)
  - Primera vez que se abre app
  - Verificar detección inmediata sin confirmaciones
  - Modal debe aparecer instantáneamente

- [ ] **Test 4.2**: Cambio de país (3 confirmaciones)
  - Simular cambio de país
  - Verificar logs: "(1/3)", "(2/3)", "(3/3)"
  - Verificar que NO muestra modal hasta 3/3
  - En Travel Mode: ~18s para confirmar
  - En Pasivo: ~30min para confirmar

- [ ] **Test 4.3**: Cancelación de cambio pendiente
  - Detectar país nuevo (1/3)
  - Volver al país anterior
  - Verificar que cancela pendiente
  - No debe mostrar modal

### 5. Consumo de Batería

- [ ] **Test 5.1**: Batería en Modo Pasivo (12 horas)
  - Dejar app instalada 12 horas sin Travel Mode
  - Medir consumo de batería
  - Debe ser <5% en 12 horas (idealmente ~2%)

- [ ] **Test 5.2**: Batería en Travel Mode (2 horas)
  - Activar Travel Mode por 2 horas
  - Medir consumo de batería
  - Debe ser razonable (30-50% en 2 horas tracking continuo)

- [ ] **Test 5.3**: Comparación Travel vs Pasivo
  - 1 hora Travel Mode: ~600 mAh
  - 1 hora Pasivo: ~6 mAh
  - Diferencia: ~100x ahorro en pasivo

## 🧪 Tests Técnicos

### 6. Código y Logs

- [ ] **Test 6.1**: Logs correctos en Travel Mode
  ```
  ✅ Travel Mode ACTIVATED - Frequent tracking enabled
  ⏱️  Calculated interval: 3000ms (TRAVEL_MODE, native, foreground, normal)
  ```

- [ ] **Test 6.2**: Logs correctos en Modo Pasivo
  ```
  ✅ Travel Mode DEACTIVATED - Passive detection mode
  ⏱️  Calculated interval: 300000ms (PASSIVE, native, foreground, normal)
  ```

- [ ] **Test 6.3**: Logs de transiciones
  ```
  🚗 Travel Mode changed: false -> true
  🔄 Adjusting tracking interval...
  ```

### 7. Edge Cases

- [ ] **Test 7.1**: Abrir app por primera vez sin permisos
  - Denegar permisos de ubicación
  - Verificar que no crashea
  - Verificar mensajes de error apropiados

- [ ] **Test 7.2**: GPS con baja precisión
  - Simular GPS con accuracy > 100m
  - Verificar que rechaza lecturas imprecisas
  - No debe confirmar cambios con GPS malo

- [ ] **Test 7.3**: App killed por sistema
  - Travel Mode activo
  - Sistema mata app (memoria baja)
  - Reabrir app
  - Verificar estado correcto (debería volver a pasivo)

- [ ] **Test 7.4**: Modo avión
  - Activar modo avión
  - Verificar que maneja error de GPS correctamente
  - Desactivar modo avión
  - Verificar que retoma tracking

### 8. Plataformas

- [ ] **Test 8.1**: iOS
  - Intervalos correctos (3s/5min bases)
  - Background multiplier: 2x
  - Permisos foreground + background funcionan

- [ ] **Test 8.2**: Android
  - Intervalos correctos (3s/5min bases)
  - Background multiplier: 2x
  - Foreground Service funciona

- [ ] **Test 8.3**: Web (si aplica)
  - Intervalos correctos (5s/10min bases)
  - Background multiplier: 2.5x
  - No background real (solo tab inactive)

## 📊 Tests de Performance

### 9. Escalabilidad

- [ ] **Test 9.1**: 100 usuarios sin Travel Mode
  - Simular 100 usuarios en modo pasivo
  - API requests: ~14,400/día (vs 1,440,000 antes)
  - Reducción: 99%

- [ ] **Test 9.2**: 100 usuarios con Travel Mode
  - Simular 100 usuarios en Travel Mode
  - API requests: ~8,640,000/día
  - Aceptable para uso activo temporal

### 10. Base de Datos

- [ ] **Test 10.1**: Escrituras en modo pasivo
  - Solo escribe cuando cambia país/ciudad
  - ~1-2 escrituras por día en viajes normales

- [ ] **Test 10.2**: Escrituras en Travel Mode
  - Escribe puntos GPS frecuentemente
  - ~600 puntos/hora para mapa de calor
  - Storage manejable

## 🎯 Criterios de Éxito

### Funcionalidad
- ✅ Detección de país funciona en ambos modos (100% precisión)
- ✅ Confirmaciones anti-rebote funcionan correctamente
- ✅ Transiciones entre modos son suaves

### Performance
- ✅ Modo Pasivo usa <5% batería en 12 horas
- ✅ Travel Mode crea mapas de calor detallados
- ✅ No lag ni freezes durante tracking

### UX
- ✅ Usuario no nota consumo de batería en modo pasivo
- ✅ Detección de países sigue siendo confiable
- ✅ Modales aparecen en momentos correctos

### Técnico
- ✅ No hay memory leaks
- ✅ No hay crashes por GPS errors
- ✅ Logs son claros y útiles para debugging

## 📝 Notas de Testing

### Simulación de Viajes

Para testing sin viajar físicamente:

```typescript
// En development, usar coordenadas de prueba
const testCoordinates = [
  { lat: -33.4489, lng: -70.6693, country: 'CL' }, // Santiago
  { lat: -32.8895, lng: -68.8458, country: 'AR' }, // Mendoza
  { lat: -34.6037, lng: -58.3816, country: 'AR' }, // Buenos Aires
];

// Simular cambio de país
await testCountryChange(testCoordinates[0], testCoordinates[1]);
```

### Monitoreo de Batería

```bash
# iOS
instruments -t "Battery" -D battery.trace

# Android
adb shell dumpsys batterystats --reset
# ... usar app ...
adb shell dumpsys batterystats
```

### Logs Útiles

Buscar en logs:
- "TRAVEL_MODE" o "PASSIVE" para verificar modo
- "Calculated interval" para verificar intervalos
- "Travel Mode changed" para verificar transiciones
- "Country confirmation" para verificar sistema anti-rebote

---

## ✅ Checklist Final

Antes de considerar completo:

- [ ] Todos los tests funcionales pasan
- [ ] Todos los tests técnicos pasan
- [ ] Tests de performance confirman mejora 99%
- [ ] Tests en iOS funcionan correctamente
- [ ] Tests en Android funcionan correctamente
- [ ] Documentación está completa y actualizada
- [ ] Logs son claros y útiles
- [ ] No hay errores de TypeScript
- [ ] No hay warnings de ESLint críticos

---

**Status**: 🔄 Pendiente de testing
**Prioridad**: Alta
**Impacto esperado**: 99% reducción en consumo de batería
