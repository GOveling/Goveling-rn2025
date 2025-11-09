# 🔄 FASE 2: Implementación de Cambio de PIN

**Fecha:** 9 de noviembre de 2025  
**Estado:** 🚧 En Progreso

---

## 🎯 **Objetivo**

Implementar la funcionalidad de cambio de PIN con re-encriptación automática de todos los documentos.

---

## 📋 **Tareas**

### ✅ **Completadas**
- [x] Fase 1: PIN verification al abrir modal

### 🔲 **Por Implementar**

1. **Crear ChangePINModal Component** (30 min)
   - [ ] Formulario con 3 campos:
     - PIN actual
     - Nuevo PIN
     - Confirmar nuevo PIN
   - [ ] Validaciones
   - [ ] UI similar a PinSetupModal

2. **Implementar función changePIN en documentEncryption.ts** (45 min)
   - [ ] Verificar PIN actual
   - [ ] Obtener todos los documentos del usuario
   - [ ] Desencriptar con PIN viejo
   - [ ] Re-encriptar con PIN nuevo
   - [ ] Actualizar hash de PIN
   - [ ] Manejo de errores robusto

3. **Integrar en SecuritySettingsModal** (15 min)
   - [ ] Conectar botón "Cambiar PIN" con ChangePINModal
   - [ ] Eliminar alert "Próximamente"

4. **Testing** (30 min)
   - [ ] Crear documento con PIN viejo
   - [ ] Cambiar PIN
   - [ ] Verificar que documento se puede abrir con PIN nuevo
   - [ ] Verificar que PIN viejo ya no funciona

---

## 🔧 **Implementación Técnica**

### **Flujo de Cambio de PIN**

```
Usuario en Security Settings
  ↓
Toca "Cambiar PIN"
  ↓
Muestra ChangePINModal
  ↓
Ingresa PIN actual
  ↓
Verifica PIN actual ✅
  ↓
Ingresa nuevo PIN (4-6 dígitos)
  ↓
Confirma nuevo PIN
  ↓
PINs coinciden? ✅
  ↓
Obtener TODOS los documentos del usuario
  ↓
Para cada documento:
  1. Desencriptar datos con PIN viejo
  2. Re-encriptar con PIN nuevo
  3. Actualizar en base de datos
  ↓
Actualizar hash de PIN en SecureStore
  ↓
Mostrar éxito ✅
  ↓
Cerrar modal
```

---

## ⚠️ **Consideraciones Críticas**

### **1. Re-encriptación es OBLIGATORIA**

Si solo cambias el PIN hash sin re-encriptar los documentos:
- ❌ Documentos encriptados con PIN viejo
- ❌ Nuevo PIN no puede desencriptarlos
- ❌ **PÉRDIDA TOTAL DE DATOS**

### **2. Manejo de Errores**

¿Qué pasa si falla en el documento 3 de 5?
- Opción A: Rollback completo (revertir todo)
- Opción B: Continuar y reportar fallos
- **Decisión:** Opción A (transaccional)

### **3. Indicador de Progreso**

Si el usuario tiene 20 documentos:
- Mostrar "Re-encriptando documento 5 de 20..."
- Loading spinner
- No permitir cerrar durante el proceso

### **4. Backup del PIN Viejo**

Mientras re-encripta:
- Mantener PIN viejo en memoria
- Solo actualizar hash al final si todo sale bien
- Si falla, mantener PIN viejo

---

## 📁 **Archivos a Crear/Modificar**

### **NUEVOS:**
1. `src/components/profile/ChangePINModal.tsx` (250 líneas)

### **MODIFICAR:**
1. `src/services/documentEncryption.ts` (agregar función `changePIN`)
2. `src/components/profile/SecuritySettingsModal.tsx` (conectar botón)

---

## 🧪 **Plan de Testing**

### **Test 1: Cambio Exitoso**
```
1. Crear 2 documentos con PIN "1234"
2. Cambiar PIN a "5678"
3. Cerrar modal de documentos
4. Volver a abrir
5. Verificar que pide PIN "5678"
6. Abrir documentos y verificar que se pueden ver
```

### **Test 2: PIN Incorrecto**
```
1. Intentar cambiar PIN con PIN actual incorrecto
2. Debe rechazar y no cambiar nada
```

### **Test 3: PINs no Coinciden**
```
1. Ingresar nuevo PIN: "1234"
2. Confirmar con: "5678"
3. Debe rechazar
```

### **Test 4: Sin Documentos**
```
1. Usuario sin documentos guardados
2. Cambiar PIN
3. Debe funcionar sin errores
```

---

## 🚀 **Próximos Pasos**

1. Crear `ChangePINModal.tsx`
2. Implementar función `changePIN()` en `documentEncryption.ts`
3. Conectar en `SecuritySettingsModal.tsx`
4. Testing exhaustivo
5. Documentar en README

---

**Tiempo Estimado Total:** 2-3 horas  
**Complejidad:** Media-Alta  
**Prioridad:** ALTA (Crítico para producción)
