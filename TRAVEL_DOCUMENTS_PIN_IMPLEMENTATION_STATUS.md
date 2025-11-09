# 🔐 Travel Documents PIN System - Estado de Implementación

**Fecha:** 9 de noviembre de 2025

---

## 📊 **Estado Actual**

### ✅ **Implementado (50%)**

1. **Configuración Inicial del PIN**
   - ✅ Modal de configuración de PIN (`PinSetupModal`)
   - ✅ Validación de PIN (4+ dígitos)
   - ✅ Almacenamiento seguro del hash en SecureStore
   - ✅ Confirmación de PIN

2. **Encriptación al Guardar Documentos**
   - ✅ Pide PIN antes de guardar
   - ✅ Encripta datos sensibles (número, país, fechas, notas)
   - ✅ Encripta foto del documento
   - ✅ Guarda en base de datos encriptado

3. **Visualización Básica**
   - ✅ Carga lista de documentos
   - ✅ Genera URLs firmadas para imágenes
   - ✅ Muestra documentos en lista

### ❌ **NO Implementado (50%)**

1. **Verificación de PIN al Abrir Documentos** ⚠️ **CRÍTICO**
   - ❌ No pide PIN al abrir un documento
   - ❌ Cualquiera puede ver documentos después de crear el primero
   - ❌ Datos sensibles visibles sin autenticación

2. **Cambio de PIN**
   - ❌ Botón "Cambiar PIN" muestra "Próximamente"
   - ❌ No hay flujo para cambiar PIN
   - ❌ No hay re-encriptación de documentos

3. **Cierre de Sesión de Documentos**
   - ❌ No hay manera de "cerrar" el acceso a documentos
   - ❌ Una vez abierto, queda abierto indefinidamente
   - ❌ No hay timeout de seguridad

---

## 🎯 **Propósito del Sistema de PIN**

El PIN está diseñado para **proteger documentos sensibles** (pasaportes, visas, etc.) con una capa adicional de seguridad:

1. **Encriptación en Reposo**: Datos guardados encriptados en Supabase
2. **Autenticación al Acceder**: PIN requerido para ver documentos
3. **Protección Local**: Nadie puede ver tus documentos sin el PIN
4. **Opción Biométrica**: Face ID/Touch ID como alternativa rápida (en producción)

---

## 🔴 **Problema Actual**

### **Flujo Actual (Inseguro):**

```
Usuario abre "Travel Documents"
  ↓
¿Tiene PIN configurado?
  ├─ NO → Pide configurar PIN → Lista de documentos
  └─ SÍ → Muestra lista de documentos inmediatamente ⚠️
  
Usuario toca un documento
  ↓
Abre el visor SIN pedir PIN ⚠️
  ↓
Muestra foto y datos sensibles ⚠️
```

**Problemas:**
- ❌ PIN solo se pide una vez (al configurar)
- ❌ Después de eso, cualquiera puede ver documentos
- ❌ No hay re-autenticación
- ❌ Datos sensibles expuestos sin protección real

---

## ✅ **Flujo Correcto (Propuesto)**

### **Opción 1: Verificación al Abrir Modal (RECOMENDADO)**

```
Usuario abre "Travel Documents"
  ↓
¿Tiene PIN configurado?
  ├─ NO → Configurar PIN → Verificar PIN → Lista de documentos
  └─ SÍ → Pedir PIN (con Face ID opcional) → Lista de documentos
  
Usuario toca un documento
  ↓
Abre el visor (ya autenticado) ✅
  ↓
Muestra foto y datos sensibles ✅
  
Usuario cierra "Travel Documents"
  ↓
Sesión termina, próxima vez pide PIN de nuevo ✅
```

**Ventajas:**
- ✅ Protección al abrir la sección
- ✅ Una vez autenticado, navegación fluida
- ✅ Sesión se cierra al salir
- ✅ Balance entre seguridad y usabilidad

---

### **Opción 2: Verificación por Documento (MÁS SEGURO)**

```
Usuario abre "Travel Documents"
  ↓
¿Tiene PIN configurado?
  ├─ NO → Configurar PIN → Lista de documentos (sin datos)
  └─ SÍ → Lista de documentos (sin datos sensibles)
  
Usuario toca un documento
  ↓
Pedir PIN (con Face ID opcional) para este documento
  ↓
Desencriptar y mostrar ✅
  
Usuario toca otro documento
  ↓
Pedir PIN nuevamente (con timeout inteligente) ✅
```

**Ventajas:**
- ✅ Máxima seguridad
- ✅ Cada documento requiere autenticación
- ✅ Protección granular
- ❌ Puede ser tedioso si tienes muchos documentos

---

### **Opción 3: Verificación con Timeout (BALANCEADO)**

```
Usuario abre "Travel Documents"
  ↓
¿Tiene sesión activa (< 5 minutos)?
  ├─ SÍ → Lista de documentos ✅
  └─ NO → Pedir PIN → Lista de documentos ✅
  
Usuario toca un documento
  ↓
Abre el visor (ya autenticado) ✅
  
Usuario cierra app o 5 minutos de inactividad
  ↓
Sesión expira, próxima vez pide PIN ✅
```

**Ventajas:**
- ✅ Seguro pero no invasivo
- ✅ Timeout inteligente
- ✅ Buena experiencia de usuario

---

## 🛠️ **Plan de Implementación Propuesto**

### **Fase 1: Verificación al Abrir Modal (PRIORITARIO)** ⭐

**Archivos a modificar:**
- `src/components/profile/TravelDocumentsModal.tsx`

**Cambios:**

1. **Agregar estado de autenticación:**
```typescript
const [isAuthenticated, setIsAuthenticated] = useState(false);
```

2. **Modificar useEffect inicial:**
```typescript
useEffect(() => {
  if (visible) {
    checkPinStatus();
    // NO cargar documentos inmediatamente
    setIsAuthenticated(false); // Reset auth cada vez que se abre
  }
}, [visible]);
```

3. **Nuevo flujo de autenticación:**
```typescript
useEffect(() => {
  if (visible && hasPin && !isAuthenticated) {
    // Mostrar PIN verification
    setShowPinVerification(true);
  } else if (visible && !hasPin) {
    // Configurar PIN primero
    setShowPinSetup(true);
  } else if (visible && isAuthenticated) {
    // Ya autenticado, cargar documentos
    loadDocuments();
  }
}, [visible, hasPin, isAuthenticated]);
```

4. **Modificar handlePinVerified:**
```typescript
const handlePinVerified = async () => {
  if (pendingDocumentData) {
    // Flujo de guardar documento (actual)
    // ... código existente
  } else {
    // Flujo de autenticación para ver documentos (NUEVO)
    setIsAuthenticated(true);
    setShowPinVerification(false);
    await loadDocuments();
  }
};
```

5. **Renderizado condicional:**
```typescript
// Solo mostrar lista si está autenticado
{isAuthenticated && documents.length > 0 && (
  <ScrollView>
    {/* Lista de documentos */}
  </ScrollView>
)}

{!isAuthenticated && hasPin && (
  <View style={styles.lockScreen}>
    <Ionicons name="lock-closed" size={64} color="#ccc" />
    <Text>Ingresa tu PIN para ver tus documentos</Text>
  </View>
)}
```

**Tiempo estimado:** 30-45 minutos

---

### **Fase 2: Implementar Cambio de PIN** 🔄

**Archivos a modificar:**
- `src/components/profile/SecuritySettingsModal.tsx`
- `src/services/documentEncryption.ts`
- Nuevo: `src/components/profile/ChangePINModal.tsx`

**Flujo:**

1. Usuario toca "Cambiar PIN" en Settings
2. Modal pide PIN actual
3. Usuario ingresa nuevo PIN (con confirmación)
4. Sistema re-encripta TODOS los documentos con nuevo PIN:
   ```typescript
   async function changePIN(oldPIN: string, newPIN: string) {
     // 1. Verificar PIN actual
     if (!await verifyPin(oldPIN)) {
       throw new Error('PIN actual incorrecto');
     }
     
     // 2. Obtener todos los documentos
     const documents = await getAllDocuments();
     
     // 3. Re-encriptar cada documento
     for (const doc of documents) {
       const decrypted = await decryptDocument(doc, oldPIN);
       const encrypted = await encryptDocument(decrypted, newPIN);
       await updateDocument(doc.id, encrypted);
     }
     
     // 4. Actualizar hash del PIN
     await storePinHash(newPIN);
   }
   ```

**Tiempo estimado:** 2-3 horas

---

### **Fase 3: Timeout de Sesión** ⏱️

**Archivos a modificar:**
- `src/components/profile/TravelDocumentsModal.tsx`

**Implementación:**

1. **Agregar timestamp de última actividad:**
```typescript
const [lastActivity, setLastActivity] = useState<number>(Date.now());
const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutos
```

2. **Verificar timeout en useEffect:**
```typescript
useEffect(() => {
  if (visible && isAuthenticated) {
    const now = Date.now();
    if (now - lastActivity > SESSION_TIMEOUT) {
      // Sesión expiró
      setIsAuthenticated(false);
      setShowPinVerification(true);
    } else {
      // Actualizar timestamp
      setLastActivity(now);
    }
  }
}, [visible]);
```

3. **Actualizar actividad en interacciones:**
```typescript
const handleDocumentPress = (doc: Document) => {
  setLastActivity(Date.now()); // Actualizar actividad
  setSelectedDocument(doc);
  setShowDocumentViewer(true);
};
```

**Tiempo estimado:** 1 hora

---

### **Fase 4: Integración con Face ID (Producción)** 👤

Ya está implementado, solo necesita:
1. Descomentarse código en `SecuritySettingsModal.tsx`
2. Build de producción con EAS

**Tiempo estimado:** 5 minutos (ya está listo)

---

## 📝 **Resumen de Prioridades**

| Fase | Descripción | Prioridad | Tiempo | Estado |
|------|-------------|-----------|--------|--------|
| 1 | Verificación al abrir modal | 🔴 CRÍTICO | 45 min | ❌ Pendiente |
| 2 | Cambio de PIN | 🟡 IMPORTANTE | 2-3 hrs | ❌ Pendiente |
| 3 | Timeout de sesión | 🟢 OPCIONAL | 1 hr | ❌ Pendiente |
| 4 | Face ID en producción | 🟢 LISTO | 5 min | ✅ Listo |

---

## 🎯 **Recomendación Inmediata**

**Implementar FASE 1 AHORA** porque es crítico para la seguridad:

1. Sin ella, el PIN actual es **inútil** - solo protege al guardar
2. Cualquiera puede ver documentos después del primer acceso
3. Es la funcionalidad core del sistema de seguridad
4. Toma solo 45 minutos implementar

**Las Fases 2-3 pueden esperar** y hacerse después según prioridad.

---

## 🤔 **Mi Recomendación**

**Opción 1: Verificación al Abrir Modal** es la mejor porque:
- ✅ Balance entre seguridad y usabilidad
- ✅ No es invasivo (una vez por sesión)
- ✅ Fácil de implementar
- ✅ Estándar de la industria (apps de bancos, passwords managers)

---

**¿Quieres que implemente la Fase 1 ahora?** 🚀 Son solo 45 minutos y tu sistema de documentos quedaría realmente seguro.
