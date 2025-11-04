# 📊 Estado de Implementación: Sistema de Configuración

**Fecha**: 4 de noviembre de 2025  
**Proyecto**: Goveling App

---

## 🎯 Resumen Ejecutivo

| Funcionalidad | Estado | Impacto Real | Implementación Requerida |
|--------------|---------|--------------|--------------------------|
| **Idioma** | 🟡 Parcial | Solo guarda preferencia | Conectar con i18n existente |
| **Tema** | 🔴 No Funcional | Solo guarda preferencia | Crear ThemeProvider o conectar existente |
| **Unidades** | 🟡 Parcial | Guarda pero no aplica | Conectar con componentes de distancia/temperatura |
| **Notificaciones** | 🟢 Funcional | Guarda preferencias | Backend debe leer estas preferencias |
| **Privacidad** | 🟢 Funcional | Guarda preferencias | Backend debe leer estas preferencias |

**Leyenda:**
- 🟢 = Funcional y aplicado
- 🟡 = Guarda pero no aplica automáticamente
- 🔴 = Solo UI, sin impacto real

---

## 📋 Análisis Detallado por Funcionalidad

### 1. 🌍 **IDIOMA** - 🟡 Parcialmente Implementado

#### ¿Qué funciona actualmente?
- ✅ Guarda la preferencia en AsyncStorage (`@goveling_language`)
- ✅ Muestra el idioma seleccionado en el modal
- ✅ Persiste entre sesiones

#### ¿Qué NO funciona?
- ❌ **No cambia el idioma de la app automáticamente**
- ❌ Los textos siguen en el idioma por defecto

#### ¿Por qué?
El Context guarda la preferencia pero **NO está conectado con i18n**:

```typescript
// En AppSettingsContext.tsx (línea 140-150)
const setLanguage = async (lang: Language) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
    setSettings((prev) => ({ ...prev, language: lang }));
    
    // TODO: Integrate with i18n when available  ⚠️ NO HACE NADA AÚN
    console.log('Language changed to:', lang);
  } catch (error) {
    console.error('Error setting language:', error);
    throw error;
  }
};
```

#### ✅ **Solución (Implementación Requerida)**

**Paso 1**: Conectar con i18n existente en `AppSettingsContext.tsx`:

```typescript
// Importar i18n
import i18n from '~/i18n';

// Modificar setLanguage:
const setLanguage = async (lang: Language) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
    setSettings((prev) => ({ ...prev, language: lang }));
    
    // ✅ Cambiar idioma en i18n
    await i18n.changeLanguage(lang);
    
    // ✅ También guardar en el storage de i18n
    await AsyncStorage.setItem('app.lang', lang);
    
  } catch (error) {
    console.error('Error setting language:', error);
    throw error;
  }
};
```

**Paso 2**: Cargar idioma guardado al iniciar en `loadSettings()`:

```typescript
const loadSettings = async () => {
  try {
    // ... código existente ...
    
    setSettings(loadedSettings);
    
    // ✅ Aplicar idioma guardado a i18n
    if (loadedSettings.language) {
      await i18n.changeLanguage(loadedSettings.language);
    }
    
  } catch (error) {
    console.error('Error loading app settings:', error);
  } finally {
    setIsLoading(false);
  }
};
```

**Impacto después de implementar**: 🟢 **Funcional completo**  
Todos los textos de la app cambiarán automáticamente al idioma seleccionado.

---

### 2. 🌗 **TEMA (Dark/Light)** - 🔴 No Implementado

#### ¿Qué funciona actualmente?
- ✅ Guarda la preferencia en AsyncStorage (`@goveling_theme`)
- ✅ Muestra el tema seleccionado en el modal
- ✅ Persiste entre sesiones

#### ¿Qué NO funciona?
- ❌ **No cambia colores de la app**
- ❌ La app siempre se ve igual (tema claro)

#### ¿Por qué?
El Context solo guarda pero **no hay ThemeProvider conectado**:

```typescript
// En AppSettingsContext.tsx (línea 152-162)
const setTheme = async (theme: Theme) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.THEME, theme);
    setSettings((prev) => ({ ...prev, theme }));
    
    // TODO: Apply theme to app components  ⚠️ NO HACE NADA
    console.log('Theme changed to:', theme);
  } catch (error) {
    console.error('Error setting theme:', error);
    throw error;
  }
};
```

#### ✅ **Solución (Implementación Requerida)**

Tu app ya tiene un `ThemeProvider` en `src/lib/theme`. Necesitas:

**Opción A - Modificar ThemeProvider existente:**

```typescript
// En src/lib/theme/index.tsx
import { useAppSettings } from '~/contexts/AppSettingsContext';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useAppSettings();
  const [currentTheme, setCurrentTheme] = useState('light');
  
  useEffect(() => {
    if (settings.theme === 'auto') {
      // Detectar tema del sistema
      const colorScheme = Appearance.getColorScheme();
      setCurrentTheme(colorScheme || 'light');
    } else {
      setCurrentTheme(settings.theme);
    }
  }, [settings.theme]);
  
  // ... aplicar colores según currentTheme
}
```

**Opción B - Conectar directamente en AppSettingsContext:**

```typescript
const setTheme = async (theme: Theme) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.THEME, theme);
    setSettings((prev) => ({ ...prev, theme }));
    
    // ✅ Aplicar tema inmediatamente
    if (theme === 'auto') {
      const systemTheme = Appearance.getColorScheme();
      applyTheme(systemTheme || 'light');
    } else {
      applyTheme(theme);
    }
    
  } catch (error) {
    console.error('Error setting theme:', error);
    throw error;
  }
};

function applyTheme(theme: 'light' | 'dark') {
  // Emitir evento o usar Context de tema existente
  // Esto depende de tu implementación actual de ThemeProvider
}
```

**Impacto después de implementar**: 🟢 **Funcional completo**  
Toda la app cambiará colores según el tema seleccionado.

---

### 3. 📏 **UNIDADES (Métrico/Imperial)** - 🟡 Parcialmente Implementado

#### ¿Qué funciona actualmente?
- ✅ Guarda la preferencia en AsyncStorage (`@goveling_units`)
- ✅ Toggle funciona correctamente
- ✅ Persiste entre sesiones

#### ¿Qué NO funciona?
- ❌ **Las distancias siguen mostrándose en la unidad hardcodeada**
- ❌ Las temperaturas no cambian

#### ¿Por qué?
Los componentes que muestran distancias/temperaturas **no leen la configuración**:

```typescript
// Componentes actuales hacen esto:
<Text>Distancia: 5 km</Text>  // ⚠️ Siempre en km

// Deberían hacer esto:
const { settings } = useAppSettings();
const distance = settings.units === 'metric' ? '5 km' : '3.1 mi';
<Text>Distancia: {distance}</Text>
```

#### ✅ **Solución (Implementación Requerida)**

**Paso 1**: Crear funciones helper en `src/utils/units.ts`:

```typescript
import { useAppSettings } from '~/contexts/AppSettingsContext';

export function useDistanceUnit() {
  const { settings } = useAppSettings();
  
  return {
    convert: (km: number) => {
      if (settings.units === 'imperial') {
        return { value: km * 0.621371, unit: 'mi' };
      }
      return { value: km, unit: 'km' };
    },
    format: (km: number) => {
      const { value, unit } = convert(km);
      return `${value.toFixed(1)} ${unit}`;
    }
  };
}

export function useTemperatureUnit() {
  const { settings } = useAppSettings();
  
  return {
    convert: (celsius: number) => {
      if (settings.units === 'imperial') {
        return { value: celsius * 9/5 + 32, unit: '°F' };
      }
      return { value: celsius, unit: '°C' };
    },
    format: (celsius: number) => {
      const { value, unit } = convert(celsius);
      return `${Math.round(value)}${unit}`;
    }
  };
}
```

**Paso 2**: Usar en componentes:

```typescript
// En cualquier componente que muestre distancias
import { useDistanceUnit } from '~/utils/units';

function MyComponent() {
  const distance = useDistanceUnit();
  
  return (
    <Text>
      Distancia: {distance.format(5)} {/* Automáticamente "5 km" o "3.1 mi" */}
    </Text>
  );
}
```

**Archivos a modificar:**
- `src/components/travelMode/*` - Mostrar distancias a lugares
- `src/components/trips/*` - Distancias de viajes
- Componentes de clima (si muestran temperatura)

**Impacto después de implementar**: 🟢 **Funcional completo**  
Todas las distancias y temperaturas se mostrarán en la unidad preferida.

---

### 4. 🔔 **NOTIFICACIONES** - 🟢 Funcional (Requiere Backend)

#### ¿Qué funciona actualmente?
- ✅ Guarda todas las preferencias en AsyncStorage
- ✅ Los 5 switches funcionan correctamente
- ✅ Persiste entre sesiones
- ✅ La lógica de activar/desactivar sub-opciones funciona

#### ¿Qué necesita implementación?
- ⚠️ **El backend debe leer estas preferencias antes de enviar notificaciones**

#### Estado actual:
```typescript
settings.notifications = {
  enabled: true,           // ✅ Se guarda
  tripReminders: true,     // ✅ Se guarda
  nearbyAlerts: true,      // ✅ Se guarda
  teamUpdates: true,       // ✅ Se guarda
  chatMessages: true,      // ✅ Se guarda
}
```

#### ✅ **Implementación Backend Requerida**

Cuando vayas a enviar una notificación, verifica primero:

```typescript
// En tu backend/cloud function
async function sendNotification(userId: string, type: string) {
  // 1. Leer configuración del usuario
  const settings = await getUserSettings(userId);
  
  // 2. Verificar si tiene notificaciones activas
  if (!settings.notifications.enabled) {
    console.log('User has notifications disabled');
    return; // No enviar
  }
  
  // 3. Verificar tipo específico
  if (type === 'trip_reminder' && !settings.notifications.tripReminders) {
    return; // No enviar este tipo
  }
  
  if (type === 'nearby_alert' && !settings.notifications.nearbyAlerts) {
    return; // No enviar este tipo
  }
  
  // ... resto de tipos
  
  // 4. Enviar notificación
  await sendPushNotification(userId, message);
}
```

**Opcional**: Guardar en Supabase para sincronizar entre dispositivos:

```typescript
// En AppSettingsContext.tsx
const updateNotifications = async (notifications: Partial<NotificationSettings>) => {
  try {
    const newNotifications = { ...settings.notifications, ...notifications };
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(newNotifications));
    setSettings((prev) => ({ ...prev, notifications: newNotifications }));
    
    // ✅ Opcional: Sincronizar con backend
    await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        notification_settings: newNotifications,
        updated_at: new Date().toISOString()
      });
    
  } catch (error) {
    console.error('Error updating notifications:', error);
    throw error;
  }
};
```

**Impacto**: 🟢 **Ya funcional localmente**, solo necesita integración backend.

---

### 5. 🔒 **PRIVACIDAD** - 🟢 Funcional (Requiere Lógica de Negocio)

#### ¿Qué funciona actualmente?
- ✅ Guarda todas las preferencias en AsyncStorage
- ✅ Los 3 switches funcionan correctamente
- ✅ Persiste entre sesiones

#### Estado actual:
```typescript
settings.privacy = {
  shareLocation: false,      // ✅ Se guarda
  showOnlineStatus: true,    // ✅ Se guarda
  publicProfile: false,      // ✅ Se guarda
}
```

#### ¿Qué necesita implementación?
Las diferentes partes de la app deben **respetar estas preferencias**.

#### ✅ **Implementación Requerida por Área**

**A) Compartir Ubicación con Equipo:**

```typescript
// En componentes de Travel Mode / Team Location
import { useAppSettings } from '~/contexts/AppSettingsContext';

function TeamLocationComponent() {
  const { settings } = useAppSettings();
  
  useEffect(() => {
    if (!settings.privacy.shareLocation) {
      // ❌ No compartir ubicación
      console.log('User disabled location sharing');
      return;
    }
    
    // ✅ Compartir ubicación con equipo
    shareLocationWithTeam();
  }, [settings.privacy.shareLocation]);
}
```

**B) Estado en Línea:**

```typescript
// En perfil o chat
function ProfileComponent() {
  const { settings } = useAppSettings();
  
  // Solo mostrar indicador verde si el usuario lo permite
  if (settings.privacy.showOnlineStatus && isUserOnline) {
    return <OnlineIndicator />;
  }
  
  return null; // No mostrar estado
}
```

**C) Perfil Público:**

```typescript
// En búsqueda de usuarios o compartir perfil
function ShareProfileButton() {
  const { settings } = useAppSettings();
  
  if (!settings.privacy.publicProfile) {
    return (
      <Text>Tu perfil es privado. Activa "Perfil Público" en Configuración.</Text>
    );
  }
  
  return <Button onPress={shareProfile}>Compartir Perfil</Button>;
}
```

**Impacto**: 🟢 **Ya funcional**, solo necesita que cada funcionalidad respete las preferencias.

---

## 📊 Tabla de Prioridades de Implementación

| # | Funcionalidad | Dificultad | Impacto | Prioridad |
|---|--------------|------------|---------|-----------|
| 1 | **Idioma** | 🟢 Baja | 🔥🔥🔥 Alto | **URGENTE** |
| 2 | **Unidades** | 🟡 Media | 🔥🔥 Medio | **Alta** |
| 3 | **Tema** | 🔴 Alta | 🔥🔥 Medio | Media |
| 4 | **Privacidad** | 🟡 Media | 🔥 Bajo | Media |
| 5 | **Notificaciones** | 🔴 Alta (Backend) | 🔥 Bajo | Baja |

---

## 🚀 Plan de Implementación Sugerido

### **Sprint 1: Funcionalidades Críticas (1-2 días)**

#### ✅ Tarea 1.1: Conectar Idioma con i18n
- **Archivo**: `src/contexts/AppSettingsContext.tsx`
- **Cambios**: 
  - Importar i18n
  - Modificar `setLanguage()` para llamar `i18n.changeLanguage()`
  - Modificar `loadSettings()` para aplicar idioma guardado
- **Tiempo estimado**: 30 minutos
- **Impacto**: ⭐⭐⭐⭐⭐

#### ✅ Tarea 1.2: Implementar Conversión de Unidades
- **Archivos nuevos**: 
  - `src/utils/units.ts` (crear)
- **Archivos a modificar**:
  - Componentes que muestran distancias
  - Componentes que muestran temperatura
- **Tiempo estimado**: 2-3 horas
- **Impacto**: ⭐⭐⭐⭐

---

### **Sprint 2: Funcionalidades Visuales (2-3 días)**

#### ✅ Tarea 2.1: Implementar Tema Dark/Light
- **Archivo**: `src/lib/theme/index.tsx`
- **Cambios**:
  - Conectar con `settings.theme`
  - Crear paleta de colores light/dark
  - Aplicar en toda la app
- **Tiempo estimado**: 1 día
- **Impacto**: ⭐⭐⭐

---

### **Sprint 3: Privacidad y Backend (3-5 días)**

#### ✅ Tarea 3.1: Implementar Respeto a Privacidad
- **Archivos**: Componentes de ubicación, perfil, estado
- **Tiempo estimado**: 4-6 horas
- **Impacto**: ⭐⭐

#### ✅ Tarea 3.2: Backend de Notificaciones
- **Archivos**: Cloud functions o backend
- **Tiempo estimado**: 1-2 días
- **Impacto**: ⭐⭐

---

## 📝 Código de Implementación Rápida

### 🔥 URGENTE: Conectar Idioma (15 minutos)

```typescript
// src/contexts/AppSettingsContext.tsx
// Línea 11: Agregar import
import i18n from '~/i18n';

// Línea 140-150: Reemplazar setLanguage por:
const setLanguage = async (lang: Language) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
    await AsyncStorage.setItem('app.lang', lang); // Para i18n
    await i18n.changeLanguage(lang); // ✅ ESTO APLICA EL CAMBIO
    setSettings((prev) => ({ ...prev, language: lang }));
  } catch (error) {
    console.error('Error setting language:', error);
    throw error;
  }
};

// Línea 115-135: En loadSettings(), después de setSettings():
setSettings(loadedSettings);

// ✅ Aplicar idioma guardado
if (loadedSettings.language && loadedSettings.language !== i18n.language) {
  await i18n.changeLanguage(loadedSettings.language);
}
```

**Con estos 3 cambios el idioma funcionará completamente. ✅**

---

## 🎯 Resumen Final

### Lo que funciona HOY (sin cambios):
- ✅ UI del modal completa
- ✅ Guardar/cargar todas las preferencias
- ✅ Persistencia entre sesiones
- ✅ Switches y selecciones funcionales

### Lo que NO funciona (necesita implementación):
- ❌ Cambiar idioma de la app
- ❌ Cambiar tema visual
- ❌ Aplicar unidades a distancias/temperaturas
- ❌ Backend respetar preferencias de notificaciones
- ❌ Lógica de negocio respetar privacidad

### Tiempo total de implementación completa:
- **Mínimo viable (Idioma + Unidades)**: 4-5 horas
- **Completo (Todo)**: 5-7 días

---

**¿Quieres que implemente alguna de estas funcionalidades ahora?** 

Recomiendo empezar con el **Idioma** (15 minutos) para tener impacto inmediato.
