# 🌍 Sistema de Detección de Países - Documentación

## 📋 Resumen

El sistema detecta automáticamente cuando el usuario viaja a un nuevo país y muestra un modal de bienvenida con confeti. La detección ocurre **al abrir la app** (no solo en Travel Mode).

---

## 🎯 Flujo de Detección

### **1. Al Abrir la App**

```
Usuario abre app → useCountryDetectionOnAppStart
                 ↓
         Obtiene ubicación GPS actual
                 ↓
         Detecta país por coordenadas
                 ↓
         Consulta última visita en DB
                 ↓
         ┌──────────────────┐
         │ ¿País cambió?    │
         └──────────────────┘
                 ↓
        ┌─────────────────┐
        │     SÍ          │      NO
        │                 │
        ↓                 ↓
   Muestra modal     Actualiza caché
   Guarda en DB      (sin modal)
   Actualiza stats
```

---

## 📂 Archivos Implementados

### **1. Hook Global** (`src/hooks/useCountryDetectionOnAppStart.ts`)
**Responsabilidad:** Detectar país al abrir la app

**Funciones clave:**
- `detectCurrentCountry()` - Obtiene GPS y detecta país
- `saveCountryVisit()` - Guarda visita en DB
- `dismissModal()` - Cierra el modal

**Triggers:**
- ✅ Al montar la app (launch)
- ✅ Al volver del background (foreground)

**Logs:**
```typescript
🚀 App launched - detecting country...
📍 Current coordinates: [lat, lng]
🎯 Detected country: 🇨🇱 Chile (CL)
💾 Last visit: Chile (CL) on 2025-11-01
✅ Still in Chile - no modal needed
```

---

### **2. Modal de Bienvenida** (`src/components/travelMode/CountryWelcomeModal.tsx`)
**Muestra:**
- 🎊 Confeti animado
- 🇨🇱 Bandera del país (emoji grande)
- 📝 Descripción del país
- 📍 Lugares guardados en ese país (max 10)
- 🔄 Badge "Bienvenido de vuelta" si es regreso

**Props:**
```typescript
interface Props {
  visible: boolean;
  countryInfo: CountryInfo; // código, nombre, bandera, descripción
  isReturn: boolean;
  savedPlaces: Array<{ name, city, icon }>;
  onClose: () => void;
  onConfirm: () => void;
}
```

---

### **3. Integración en Home** (`app/(tabs)/index.tsx`)
```tsx
// Hook de detección
const { pendingCountryVisit, dismissModal } = useCountryDetectionOnAppStart();

// Modal condicional
{pendingCountryVisit && (
  <CountryWelcomeModal
    visible={true}
    countryInfo={pendingCountryVisit.countryInfo}
    isReturn={pendingCountryVisit.isReturn}
    savedPlaces={[]} // Sin lugares en modal de app-start
    onClose={dismissModal}
    onConfirm={dismissModal}
  />
)}
```

---

## 🔄 Lógica Anti-Duplicados

### **En DB (Supabase Function)**
```sql
CREATE FUNCTION should_add_country_visit(
  p_user_id UUID,
  p_country_code TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM country_visits
    WHERE user_id = p_user_id
    AND country_code = p_country_code
    AND entry_date = (
      SELECT MAX(entry_date)
      FROM country_visits
      WHERE user_id = p_user_id
    )
  );
END;
$$ LANGUAGE plpgsql;
```

### **En App (CountryDetectionService)**
```typescript
checkCountryChange(coordinates) {
  const currentCountry = detectCountry(coordinates);
  
  // Si es el mismo país que el último detectado
  if (this.lastDetectedCountry?.countryCode === currentCountry.countryCode) {
    return null; // No hay cambio
  }
  
  // País diferente: retornar evento
  return {
    countryInfo: currentCountry,
    isReturn: this.countryHistory.includes(currentCountry.countryCode),
    coordinates,
    previousCountryCode: this.lastDetectedCountry?.countryCode
  };
}
```

---

## 📊 Base de Datos

### **Tabla `country_visits`**
```sql
CREATE TABLE country_visits (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  trip_id UUID, -- Opcional: asociar a viaje específico
  country_code TEXT NOT NULL, -- "CL", "IT", "US"
  country_name TEXT NOT NULL, -- "Chile", "Italy", "United States"
  entry_date TIMESTAMPTZ NOT NULL, -- Fecha/hora de llegada
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  is_return BOOLEAN DEFAULT FALSE,
  places_count INTEGER DEFAULT 0,
  previous_country_code TEXT -- País anterior
);
```

### **Trigger Automático**
```sql
CREATE TRIGGER update_country_stats
AFTER INSERT OR DELETE ON country_visits
FOR EACH ROW
EXECUTE FUNCTION update_country_stats();

-- Actualiza automáticamente travel_stats.countries_count
```

---

## 🎬 Escenarios de Uso

### **Escenario 1: Primera Vez en País**
```
Usuario en Chile (primera vez)
↓
Abre app → Detecta Chile
↓
DB: Sin visitas previas
↓
RESULTADO: 
✅ Muestra modal con confeti
✅ Guarda visita en DB (entry_date = NOW)
✅ travel_stats.countries_count = 1
```

### **Escenario 2: Mismo País**
```
Usuario en Chile
Cierra app por 2 horas
Abre app (sigue en Chile)
↓
Detecta Chile
↓
DB: Última visita = Chile
↓
RESULTADO:
✅ NO muestra modal
✅ Actualiza caché local
✅ App se abre normalmente
```

### **Escenario 3: Viaje a Nuevo País**
```
Usuario en Chile
Viaja a Italia (4 días después)
Abre app en Italia
↓
Detecta Italia
↓
DB: Última visita = Chile
↓
RESULTADO:
✅ Muestra modal "Bienvenido a Italia 🇮🇹"
✅ Guarda visita: entry_date = NOW
✅ travel_stats.countries_count = 2
✅ previous_country_code = "CL"
```

### **Escenario 4: Regreso a País Visitado**
```
Usuario ya estuvo en Chile antes
Viaja y regresa a Chile
Abre app
↓
Detecta Chile
↓
DB: Última visita = Italia, pero Chile existe en historial
↓
RESULTADO:
✅ Muestra modal "Bienvenido de vuelta a Chile 🇨🇱"
✅ Guarda visita con is_return = TRUE
✅ Badge especial en VisitedCountriesModal
```

---

## 🔧 Smart Initialization en Travel Mode

**Problema resuelto:** Evitar duplicados entre detección al abrir app y Travel Mode

**Solución:**
```typescript
// En startTravelMode() de useTravelModeSimple.ts
const currentLocation = await Location.getCurrentPositionAsync();
const currentCountry = countryDetectionService.detectCountry(coords);

const { data: lastVisit } = await supabase
  .from('country_visits')
  .select('country_code')
  .order('entry_date', DESC)
  .limit(1);

if (lastVisit.country_code === currentCountry.countryCode) {
  // MISMO PAÍS: Usar caché
  countryDetectionService.setLastCountry(currentCountry.countryCode);
} else {
  // PAÍS DIFERENTE: Reset para detectar
  countryDetectionService.reset();
}
```

**Resultado:**
- Si abres Travel Mode en el mismo país → No muestra modal
- Si abres Travel Mode en país diferente → Detecta y muestra modal

---

## 🌍 Países Soportados (25+)

```typescript
COUNTRY_BOUNDARIES = [
  { code: 'CL', name: 'Chile', flag: '🇨🇱', latRange: [-56, -17], lngRange: [-76, -66] },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', latRange: [-55, -21], lngRange: [-73, -53] },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', latRange: [-34, 5], lngRange: [-74, -34] },
  { code: 'PE', name: 'Peru', flag: '🇵🇪', latRange: [-18, 0], lngRange: [-81, -68] },
  { code: 'US', name: 'United States', flag: '🇺🇸', latRange: [24, 49], lngRange: [-125, -66] },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', latRange: [36, 47], lngRange: [6, 19] },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', latRange: [36, 44], lngRange: [-10, 4] },
  { code: 'FR', name: 'France', flag: '🇫🇷', latRange: [42, 51], lngRange: [-5, 9] },
  // ... 17+ más
];
```

---

## 🎨 Personalización

### **Cambiar Descripción de País**
```typescript
// En CountryDetectionService.ts
{
  code: 'CL',
  name: 'Chile',
  description: 'Tu descripción personalizada aquí',
  continent: 'South America'
}
```

### **Cambiar Lugares Mostrados**
```typescript
// En HomeTab (app/(tabs)/index.tsx)
savedPlaces={
  state.savedPlaces
    .filter(p => p.country_code === countryInfo.countryCode)
    .slice(0, 10)
}
```

### **Deshabilitar Detección**
```typescript
// Comentar el hook en HomeTab
// const { pendingCountryVisit, dismissModal } = useCountryDetectionOnAppStart();
```

---

## 🐛 Debugging

### **Ver Logs de Detección**
```bash
# En React Native Debugger o Metro
🚀 App launched - detecting country...
📍 Current coordinates: [-33.4489, -70.6693]
🎯 Detected country: 🇨🇱 Chile (CL)
💾 Last visit: Chile (CL) on 2025-11-01T10:30:00Z
✅ Still in Chile - no modal needed
```

### **Ver Datos en DB**
```sql
-- Ver todas las visitas
SELECT * FROM country_visits
WHERE user_id = 'tu-user-id'
ORDER BY entry_date DESC;

-- Ver stats actualizadas
SELECT countries_count FROM travel_stats
WHERE user_id = 'tu-user-id';
```

### **Forzar Detección**
```typescript
// En useCountryDetectionOnAppStart.ts
// Comentar línea 213:
// if (lastVisit.country_code === currentCountry.countryCode) { ... }
```

---

## ✅ Checklist de Testing

- [ ] Abrir app en mismo país → No muestra modal
- [ ] Simular GPS en país diferente → Muestra modal
- [ ] Verificar INSERT en `country_visits`
- [ ] Verificar actualización de `travel_stats.countries_count`
- [ ] Abrir Travel Mode después → No duplica modal
- [ ] Volver del background → Detecta cambio
- [ ] Modal de bienvenida de vuelta con badge
- [ ] Timeline en VisitedCountriesModal con fechas correctas

---

## 📝 Próximas Mejoras

1. **Asociar a Trip Activo** - Agregar `trip_id` cuando hay viaje activo
2. **Google Geocoding API** - Reemplazar coordenadas por API precisa
3. **Contar Lugares por País** - Actualizar `places_count` correctamente
4. **Notificación Push** - "¡Bienvenido a [País]!"
5. **Estadísticas Avanzadas** - Días por país, país favorito, etc.

---

## 🔗 Archivos Relacionados

- `src/hooks/useCountryDetectionOnAppStart.ts` - Hook principal
- `src/services/travelMode/CountryDetectionService.ts` - Lógica de detección
- `src/components/travelMode/CountryWelcomeModal.tsx` - Modal de bienvenida
- `src/components/profile/VisitedCountriesModal.tsx` - Timeline de países
- `supabase/migrations/20251031_country_visits.sql` - Schema DB
- `app/(tabs)/index.tsx` - Integración en Home

---

**Fecha:** 1 de noviembre de 2025  
**Estado:** ✅ Implementado y funcional
