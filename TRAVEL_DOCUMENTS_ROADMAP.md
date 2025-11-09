# 🗺️ Travel Documents - Plan Completo de Implementación

## 📋 **Roadmap General**

```
╔════════════════════════════════════════════════════════════╗
║  SISTEMA DE DOCUMENTOS DE VIAJE - IMPLEMENTACIÓN E2EE     ║
╚════════════════════════════════════════════════════════════╝

✅ Fase 1: Base de Datos y Edge Functions
   ├─ Migración SQL (3 tablas)
   ├─ Edge Function: encrypt-document
   ├─ Edge Function: decrypt-document
   └─ TypeScript types completos

✅ Fase 2: UI Foundation
   ├─ TravelDocumentsModal con empty state
   ├─ Integración con Profile screen
   └─ Diseño responsive

✅ Fase 3: Sistema de PIN
   ├─ PinSetupModal (2 pasos)
   ├─ documentEncryption.ts service
   ├─ PBKDF2-SHA256 key derivation
   ├─ SecureStore integration
   ├─ PinVerificationModal
   └─ Debug tools (solo dev mode)

✅ Fase 4.1: Formulario de Documentos  ← COMPLETADO
   ├─ AddDocumentModal completo
   ├─ 7 tipos de documentos
   ├─ Image picker + compresión
   ├─ Date pickers nativos
   ├─ Validaciones completas
   └─ Integración con TravelDocumentsModal

🔄 Fase 4.2: Encriptación y Subida  ← SIGUIENTE
   ├─ Solicitar PIN antes de guardar
   ├─ Generar clave de encriptación
   ├─ Leer imagen como base64
   ├─ Llamar Edge Function encrypt-document
   ├─ Subir archivo a Supabase Storage
   └─ Guardar metadata en BD

🔜 Fase 4.3: Lista y Visualización
   ├─ Document list component
   ├─ Document card design
   ├─ Status badges (válido/vencido)
   ├─ Document viewer modal
   ├─ Solicitar PIN para ver
   └─ Llamar Edge Function decrypt-document

🔜 Fase 5: Autenticación Biométrica
   ├─ Instalar expo-local-authentication
   ├─ Verificar hardware biométrico
   ├─ Configuración opt-in/opt-out
   ├─ Flujo: Biometría → PIN (fallback)
   ├─ Almacenar preferencia en AsyncStorage
   └─ UI de configuración en Settings

🔜 Fase 6: Sistema de Recuperación
   ├─ Generate recovery code (6 dígitos)
   ├─ Enviar por email con Resend
   ├─ Validar código (15 min expiración)
   ├─ Desencriptar con recoveryKey
   └─ UI de recuperación

🔜 Fase 7: Sincronización Offline
   ├─ Cache de documentos en AsyncStorage
   ├─ Queue de subida pendiente
   ├─ Sync automático al conectarse
   └─ Indicadores de estado sync
```

---

## 🔐 **Flujo de Biometría (Fase 5)**

### **¿Cuándo se implementa?**

**La biometría se implementará en la Fase 5**, después de completar todo el sistema de documentos (Fase 4).

### **¿Por qué después?**

1. ✅ **Primero funcionalidad core**: PIN + Encriptación + Storage
2. ✅ **Luego mejoras de UX**: Biometría como capa adicional
3. ✅ **Fallback obligatorio**: Siempre debe funcionar con PIN
4. ✅ **Testing más fácil**: Si la biometría falla, el PIN siempre funciona

---

### **Flujo de Autenticación con Biometría**

```
┌─────────────────────────────────────────────────────────────┐
│  Usuario intenta acceder a documentos                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │ ¿Biometría habilitada?      │
         └──────────┬──────────────────┘
                    │
          ┌─────────┴─────────┐
          │                   │
         SÍ                  NO
          │                   │
          ▼                   ▼
┌────────────────────┐  ┌────────────────────┐
│ Solicitar Face ID  │  │ Solicitar PIN      │
│ / Touch ID         │  │ (PinVerification   │
│                    │  │  Modal)            │
└─────────┬──────────┘  └────────┬───────────┘
          │                      │
    ┌─────┴─────┐                │
    │           │                │
  ÉXITO      FALLO               │
    │           │                │
    ▼           ▼                │
 ┌─────┐  ┌────────────┐         │
 │✅   │  │ Solicitar  │         │
 │Acceso│  │ PIN como  │◄────────┘
 │     │  │ fallback  │
 └─────┘  └─────┬──────┘
                │
           ┌────┴────┐
           │         │
         ÉXITO    FALLO
           │         │
           ▼         ▼
        ┌─────┐  ┌────────┐
        │✅   │  │❌ 3    │
        │Acceso│  │intentos│
        └─────┘  │bloqueo │
                 └────────┘
```

---

### **Implementación Técnica (Fase 5)**

#### **1. Instalación de dependencia:**

```bash
npx expo install expo-local-authentication
```

#### **2. Verificar capacidad del dispositivo:**

```typescript
import * as LocalAuthentication from 'expo-local-authentication';

// Verificar hardware
const hasHardware = await LocalAuthentication.hasHardwareAsync();

// Verificar si está configurado (Face ID / Touch ID / Fingerprint)
const isEnrolled = await LocalAuthentication.isEnrolledAsync();

// Obtener tipo de autenticación
const authTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
// Retorna: [1] = Touch ID, [2] = Face ID, [3] = Iris, etc.
```

#### **3. Solicitar autenticación biométrica:**

```typescript
const authenticateWithBiometrics = async (): Promise<boolean> => {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Verifica tu identidad',
      cancelLabel: 'Usar PIN',
      fallbackLabel: 'Usar PIN',
      disableDeviceFallback: true, // No usar PIN del dispositivo, usar nuestro PIN
    });

    return result.success;
  } catch (error) {
    console.error('Biometric auth error:', error);
    return false;
  }
};
```

#### **4. Guardar preferencia del usuario:**

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_PREF_KEY = 'travel_docs_biometric_enabled';

// Guardar preferencia
const setBiometricEnabled = async (enabled: boolean) => {
  await AsyncStorage.setItem(BIOMETRIC_PREF_KEY, enabled.toString());
};

// Leer preferencia
const isBiometricEnabled = async (): Promise<boolean> => {
  const value = await AsyncStorage.getItem(BIOMETRIC_PREF_KEY);
  return value === 'true';
};
```

#### **5. Flujo completo en código:**

```typescript
const handleAccessDocuments = async () => {
  // 1. Verificar si biometría está habilitada
  const biometricEnabled = await isBiometricEnabled();
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();

  // 2. Intentar con biometría si está disponible y habilitada
  if (biometricEnabled && hasHardware && isEnrolled) {
    const success = await authenticateWithBiometrics();
    
    if (success) {
      // ✅ Acceso concedido
      navigateToDocuments();
      return;
    }
    // Si falla, continuar con PIN
  }

  // 3. Fallback: Solicitar PIN
  setShowPinVerification(true);
};
```

#### **6. Componente de configuración (Settings):**

```tsx
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Seguridad</Text>
  
  {biometricAvailable && (
    <View style={styles.option}>
      <View style={styles.optionLeft}>
        <Ionicons name="finger-print" size={24} color="#2196F3" />
        <View>
          <Text style={styles.optionTitle}>
            {biometricType === 'Face ID' ? 'Face ID' : 'Touch ID'}
          </Text>
          <Text style={styles.optionSubtitle}>
            Acceso rápido con biometría
          </Text>
        </View>
      </View>
      <Switch
        value={biometricEnabled}
        onValueChange={handleToggleBiometric}
      />
    </View>
  )}
</View>
```

---

### **Ventajas de la Biometría:**

✅ **UX mejorada**: Acceso más rápido sin recordar PIN
✅ **Seguridad adicional**: Autenticación a nivel de hardware
✅ **Fallback robusto**: Siempre puede usar PIN si falla
✅ **Opcional**: El usuario decide si la usa o no
✅ **Sin almacenar PIN**: La biometría no reemplaza el PIN, solo lo complementa

---

### **Limitaciones y consideraciones:**

⚠️ **No almacena el PIN**: La biometría solo verifica identidad, no desbloquea el PIN
⚠️ **Requiere hardware**: No todos los dispositivos tienen Face ID/Touch ID
⚠️ **Depende de configuración**: El usuario debe tener configurada la biometría en el dispositivo
⚠️ **Fallback obligatorio**: Siempre debe haber forma de acceder con PIN

---

## 🎯 **Estado Actual del Proyecto**

### **Completado (Fases 1-4.1):**

```
✅ Base de datos con RLS
✅ Edge Functions de encriptación
✅ Sistema de PIN seguro
✅ Formulario de documentos
✅ Image picker con compresión
✅ Validaciones completas
✅ Debug tools para desarrollo
```

### **En Desarrollo (Fase 4.2):**

```
🔄 Integrar Edge Function encrypt-document
🔄 Subir archivos a Supabase Storage
🔄 Guardar metadata en base de datos
🔄 Solicitar PIN antes de encriptar
🔄 Loading states y error handling
```

### **Pendiente (Fases 4.3-7):**

```
🔜 Lista de documentos
🔜 Document viewer
🔜 Desencriptación
🔜 Biometría (Fase 5)
🔜 Recuperación por email
🔜 Sincronización offline
```

---

## 📊 **Prioridades de Desarrollo**

### **Alta Prioridad (Ahora):**

1. **Fase 4.2**: Encriptación y subida de documentos
2. **Fase 4.3**: Visualización de documentos guardados
3. **Testing completo**: Flujo end-to-end funcionando

### **Media Prioridad (Después):**

4. **Fase 5**: Biometría para mejor UX
5. **Fase 6**: Sistema de recuperación
6. **Optimizaciones**: Performance y caché

### **Baja Prioridad (Futuro):**

7. **Fase 7**: Modo offline completo
8. **Funcionalidades extra**: Compartir, exportar, etc.

---

## 🔐 **Resumen de Seguridad**

### **Capas de Seguridad Implementadas:**

```
┌─────────────────────────────────────────────────────┐
│  NIVEL 1: Biometría (Fase 5)                       │
│  - Face ID / Touch ID / Fingerprint                │
│  - Hardware-backed                                 │
│  - Opcional                                        │
├─────────────────────────────────────────────────────┤
│  NIVEL 2: PIN (Fase 3) ✅                          │
│  - PBKDF2-SHA256 (100 iterations)                 │
│  - Salt único por usuario                          │
│  - Almacenado en SecureStore                       │
├─────────────────────────────────────────────────────┤
│  NIVEL 3: Encriptación E2EE (Fase 4.2)            │
│  - AES-256-GCM server-side                         │
│  - Dual-key system (PIN + userID)                 │
│  - Nunca se almacena sin encriptar                 │
├─────────────────────────────────────────────────────┤
│  NIVEL 4: RLS (Fase 1) ✅                          │
│  - Row Level Security en Supabase                  │
│  - Solo el propietario puede acceder               │
│  - Audit logs de acceso                            │
└─────────────────────────────────────────────────────┘
```

---

## 🎉 **Conclusión**

### **Estado Actual:**

✅ **4 de 7 fases completadas**
✅ **Formulario completamente funcional**
✅ **Sistema de seguridad robusto**
✅ **Listo para encriptación y storage**

### **Próximo Paso Inmediato:**

**Implementar Fase 4.2: Encriptación y Subida** para que los documentos se guarden de forma segura en Supabase.

### **Biometría:**

**Se implementará en Fase 5** después de tener el sistema completo funcionando con PIN.

---

**¿Listo para implementar la Fase 4.2?** 🔐📤
