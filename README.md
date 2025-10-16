## v125 — Home 1:1 (Current Trip + Nearby Alerts + Weather header con toggle °C/°F)

> Nota (Oct 2025): Se consolidó el Home. El archivo activo único es `app/(tabs)/index.tsx`. Se eliminó la versión legacy `app/home/index.tsx` (y su Inbox huérfano) para evitar duplicidad. Si necesitas un Inbox futuro, crear nueva ruta/tab o modal dedicada.

- **Weather header**: ciudad (reverse geocode), fecha local y temperatura **tap-to-toggle** entre **°C/°F** (usa Edge Function `weather_now` con Open‑Meteo, sin API key).
- **Current Trip**: detecta **trip activo** o **próximo** (countdown), muestra nombre y **botones** a **Lugares del Trip** y **Modo Travel** (si activo). Con **skeleton shimmer**.
- **Nearby Alerts**: interruptor **Travel Mode**; muestra **mapa MapLibre** con marcadores numerados y **lista** ordenada por distancia de **lugares guardados** o del **trip activo**.
- **Helpers**: `src/lib/home.ts`, `src/lib/weather.ts`, `src/lib/travelStore.ts`.
- **Edge Function**: `weather_now` (Open‑Meteo).

### Despliegue

```bash
# Edge function de clima
supabase functions deploy weather_now --no-verify-jwt

# App
npm i
npx expo run:ios
npx expo run:android
```

## v126 — Notificaciones 100% (Firebase FCM iOS+Android) + Inbox en Home

- **Device tokens** (`device_tokens`), **Inbox** (`notifications_inbox`).
- **Edge Function `push_send`**: recibe `user_ids[]`, `title`, `body`, `data` → inserta en inbox y envía vía **FCM** (iOS/Android).
- **Cliente**: registra token con `@react-native-firebase/messaging`, guarda en DB, maneja foreground con `expo-notifications`, y muestra **campanita** en Home que abre el **Inbox**.

### Configuración Firebase

1. Crea un proyecto en **Firebase** y añade Apps iOS y Android.
2. Descarga **GoogleService-Info.plist** (iOS) y **google-services.json** (Android). Colócalos en:
   - iOS: `ios/GoogleService-Info.plist`
   - Android: `android/app/google-services.json`
3. Agrega tu **FCM Server Key** como variable de entorno en Supabase:
   - `FCM_SERVER_KEY=AAAA...`

### Expo (config plugin)

Instala dependencias:

```bash
npm i @react-native-firebase/app @react-native-firebase/messaging expo-notifications
npx expo prebuild
npx pod-install
```

En `app.json` añade el plugin de Firebase si no está (react-native-firebase lo configura en nativo tras prebuild).

### Despliegue

```bash
# DB
supabase db push

# Edge
supabase functions deploy push_send --no-verify-jwt
```

### En el cliente

- Se registra el token al abrir **Home** (puedes moverlo a la raíz del app).
- Foreground: muestra heads-up con `expo-notifications` y persiste en `notifications_inbox`.
- Background/quit: FCM muestra push nativo (config de Firebase).

## v127 — Notificaciones conectadas 100%

- **Manage Team**:
  - Enviar invitación → push a usuario existente (si hay perfil por email).
  - Aceptar invitación → push al **owner**.
  - Rechazar/Remover → push al afectado.
- **Travel Mode Nearby**:
  - Al acercarse al punto más próximo: **notificación local** (“Estás cerca…”).
  - Hook opcional para **notificar colaboradores** (descomentable en `NearbyAlerts`).
- **Inbox**: todos los envíos pasan por `push_send`, que **guarda en Inbox** además de empujar FCM.

### Notas

- Mantuvimos el enfoque **sin Supabase Realtime** (no requerido para push).
- Puedes llamar `push_send` también desde tus Edge Functions (p.ej. cuando se crea un gasto compartido, etc.).

## v128 — My Trips pulido total (iOS/Android)

- **Index** de trips con **+ New Trip**, **Editar** y **Eliminar**.
- **Nuevo Trip**: **DatePickers nativos**, **zona horaria**, validaciones UX.
- **Detalle** con pestañas: **Overview**, **Places**, **AI Smart Route**, **Accommodation**, **Team**, **Settings**.
- **AI Smart Route**: Edge Function `smart_route` (heurística NN + 2‑opt light) para ordenar lugares sin costos externos.
- **Accommodation**: CRUD con check‑in/out.
- **Trip Settings**: compartir ubicación + timezone por viaje.
- Tablas nuevas: `accommodations`, `trip_settings`, `route_cache` (para cachear rutas si deseas).

### Despliegue

```bash
supabase db push
supabase functions deploy smart_route --no-verify-jwt

npm i @react-native-community/datetimepicker
npx expo prebuild
npx pod-install
npx expo run:ios
npx expo run:android
```

## v129 — AI Smart Route (Detallada con Google Directions)

- **Tabs**: _Itinerary_ (paso a paso incluyendo **transporte público** con línea, agencia, headsign, paradas), _Map_ (Polyline + marcadores), _Analytics_ (distancia/tiempos).
- **Selector de modo**: walking / driving / bicycling / transit.
- **Selector de tramo** A→B (entre puntos consecutivos del trip).
- **Edge Function `google-directions`**: llama a Google Directions con tu **API key** (env server-side), **decodifica polilínea** y **cachea** en `directions_cache` para reducir costos.
- **Hook RN** `useDirections`: consume la función, maneja loading/error/cached.

### Configuración

1. En Supabase (Project → Settings → Functions → Env):
   - `GOOGLE_MAPS_API_KEY=AIza...`
2. Despliegue:

```bash
supabase db push
supabase functions deploy google-directions --no-verify-jwt
```

3. App:

```bash
npm i
npx expo prebuild
npx pod-install
npx expo run:ios
npx expo run:android
```

> El mapa usa **MapLibre** (sin costos). Las rutas detalladas usan **Google Directions** (con caché). Puedes alternar entre heurística gratuita (v128) y rutas detalladas (v129).

## v130 — Ruta completa del día + caché por día

- **Picker de día** (DatePicker) para construir/ver la ruta de esa fecha.
- Botón **“Ruta completa”**: calcula **todas** las direcciones entre puntos consecutivos del día y concatena **polilíneas** en el mapa.
- **Métricas totales** del día (distancia y duración) + desglose por segmento.
- **Guardar día** → persiste el **orden** en `route_cache (trip_id, day, places[])`. Al cargar, reordena según caché.
- Mantiene el modo detallado con **Google Directions** y **caché** de tramos (`directions_cache`).

### Despliegue

```bash
supabase db push
# (Ya debes tener deployeada google-directions de v129)
npm i @react-native-community/datetimepicker
npx expo prebuild && npx pod-install
npx expo run:ios
npx expo run:android
```

## v131 — Explore→AddToTrip (con día) + Travel Mode guiado por la ruta del día

- **Explore → Add to Trip** (`app/explore/add-to-trip.tsx`): selector de **día** y alta en `trip_places` + **append** al `route_cache(day)`.
- **Travel Mode (guiado)** (`app/trips/[id]/live.tsx`):
  - Carga el **orden del día** desde `route_cache` y **omite** lugares **ya visitados** (tabla `trip_place_visits`).
  - Navega al **siguiente destino**: pasos detalle (Google Directions), **polilínea** en MapLibre y **UserLocation**.
  - **Detección de llegada** (heurística ~100m): botón **“Marcar visitado”** → inserta en `trip_place_visits` y **remueve** de la lista.
- **Route screen** añade CTA **“Iniciar Travel Mode”** para el día actual.
- Nueva tabla: `trip_place_visits`.

### Despliegue

```bash
supabase db push
npm i @react-native-community/datetimepicker
npx expo prebuild && npx pod-install
npx expo run:ios
npx expo run:android
```

## v132 — Travel Mode: Auto‑siguiente + Push al equipo + heurística de llegada

- **Auto‑siguiente**: al marcar visita, avanza automáticamente al siguiente destino (configurable en pantalla).
- **Push a colaboradores** (v127 `push_send`): al llegar, notifica “Tu compañero llegó a …” (opcional por lógica actual).
- **Detección de llegada mejorada**:
  - **Radio dinámico** según **velocidad** (caminata/bici/auto).
  - Chequeo de **heading** (brújula) para confirmar que el usuario se dirige hacia el destino.
  - Radio base ≈ **70–140 m** (ajustable).
- **Nota sobre IA/ML**: La versión RN+Expo actual no integra aún un servicio externo de clustering/ML para repartir lugares por **día/horario**. La lógica usa:
  - Ordenación heurística (v128) y/o **Google Directions** por tramo/día (v129–v130).
  - **Cache** de orden diario (`route_cache`).  
    Si deseas paridad 1:1 con el sistema externo (clustering por proximidad/horario/prioridad), podemos integrar tu **API ML** vía una **Edge Function** y UI para asignación automática de días/slots.

## v133 — Integración ML Externa (V2 → V1 → Local) + botón “Planificar con IA”

- Variables `.env`:
  - `EXPO_PUBLIC_ML_API_BASE=https://goveling-ml.onrender.com/api`
  - `EXPO_PUBLIC_ML_PRIMARY_VERSION=v2`
  - `EXPO_PUBLIC_ML_FALLBACK_VERSION=v1`
- Servicio `aiRoutesService`:
  - `generateHybridItineraryV2(req)` intenta **/v2/itinerary/generate-hybrid**, cae a **/v1/itinerary/generate-hybrid** y, si falla, **local** (`getRouteConfigurations`).
- UI: en `AI Smart Route` aparece **“Planificar con IA”**.
  - Envía `trip_id`, `start/end_date`, `daily_window (09:00–18:00)`, **accommodations** y **places** (con priority opcional).
  - Escribe el **orden por día** en `route_cache` (y guarda `metrics/version` en el payload opcional).
  - Actualiza la vista del **día actual** si viene en la respuesta.

> **Compatibilidad**: Se mantiene intacta la lógica de la app; la API externa debe respetar el contrato `{ days: [{ date, places:[{id,name,lat,lng,eta,etd}], metrics? }] }`. Si tu API ya funciona así, no hay que tocar más la app.

## v134 — Add-to-Trip sin día (ML decide) + Itinerary con ETA/ETD y bloques

- **Add to Trip** ya **no** pide día: el usuario elige un **Trip existente** o crea uno nuevo; la **IA asignará el día** después. Campo de **fecha tentativa** es opcional.
- **AI Smart Route** (Itinerary):
  - Si `route_cache(day)` contiene objetos con `type`, `eta`, `etd`, se renderiza un **timeline** con:
    - `type:'place'` → nombre + **ETA–ETD**.
    - `type:'free_block'` → bloque de tiempo libre (nota opcional).
    - `type:'transfer_block'` → bloque de traslado (nota opcional).
  - Se guardan **métricas** por día en `route_cache.summary` (distancia, duración, versión ML).
- **Travel Mode** ignora bloques no‑place y guía por el **orden de lugares** del día.

## v135 — Itinerary con minimapas + Travel Mode que respeta ETA/ETD

- **Itinerary** (AI Smart Route): cada `place` puede mostrar un **mini‑mapa** (MapLibre) en la fila. Toggle **Mostrar minimapas** ON/OFF.
- **Travel Mode**:
  - **Respeta ETA/ETD** del plan ML: muestra banner de estado (temprano / tarde / dentro de ventana).
  - **Auto‑skip** configurable: salta automáticamente si aún no es hora o ya pasó la ventana.
  - Mantiene **auto‑siguiente**, llegada por **radio dinámico + heading**, y notificación al equipo.

## v136 — Auto‑modo por tramo + polilíneas por color

- **Ruta del día (AI Smart Route)**: cada **segmento A→B** se calcula probando **transit/walking/bicycling/driving** y se elige el **más rápido** (por duración). El mapa muestra **una polilínea por segmento** con **color por modo** y una **leyenda**.
- **Travel Mode**: al navegar hacia el siguiente destino, determina automáticamente el **mejor modo** para ese tramo y pinta la polilínea con el color del modo elegido.
- Helper nuevo: `fetchBestMode(origin, destination, preferredOrder)` en `useDirections.ts`.

## v137 — P0 COMPLETO (Auth + Explore + Profile mínimo + Booking)

**Auth**: Pantalla unificada login/signup + OTP (Resend vía Edge) + Google (AuthSession stub) + sign‑out.  
**Explore**: Búsqueda (Places v2 via Edge), Near Me, radio 0.5/1/2 km, mapa con resultados, ficha de lugar y **Add to Trip** (sin día).  
**Profile (mínimo)**: Personal info, avatar (galería + upload a Storage público), preferencias push/email, **Cerrar sesión** al final.  
**Booking**: pantalla con accesos a afiliados (seeds).

### Deploy

```bash
supabase db push
supabase functions deploy resend-otp --no-verify-jwt
supabase functions deploy places-search --no-verify-jwt

# .env
EXPO_PUBLIC_RESEND_API_URL=/functions/v1/resend-otp
EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_IOS=...
EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ANDROID=...
EXPO_PUBLIC_PLACES_API=/functions/v1/places-search

npm i expo-auth-session expo-image-picker
npx expo prebuild && npx pod-install
npx expo run:ios
npx expo run:android
```

## v138 — P1 COMPLETO (Reviews + Docs cifrados + Achievements/Stats + i18n/dark mode)

- **Reviews**: ver/escribir/editar/eliminar reseñas globales por lugar.  
  Rutas: `/explore/reviews`, `/explore/review-edit`. Tabla: `place_reviews`.
- **Documentos cifrados**: **AES‑256‑CBC + HMAC** (Encrypt‑then‑MAC) con subida a Storage privado y metadata en `secure_documents`.  
  Pantalla: `/profile/documents` (demo con passphrase de ejemplo). Biblioteca: `src/lib/secureDocs.ts`.
- **Achievements/Stats**: resumen (países, ciudades, lugares) + logros por umbral.  
  Pantalla: `/profile/achievements`. Tablas: `travel_stats`, `travel_badges` (semillas).
- **i18n (7 idiomas)** y **dark mode**: `src/i18n/*` + `/settings`. (Strings base listos; expandir según UI).

## v139 — P2 COMPLETO

- **Visitas** (`trip_visits`) + **trigger SQL** que recalcula **travel_stats** automáticamente (países/ciudades/lugares) al marcar llegadas desde Travel Mode.
- **Analytics por modo**: persistimos `summary.modes` (conteo de segmentos por modo) y UI de barras en tab **Analytics** de AI Smart Route.
- **Docs cifrados offline**: cola local (AsyncStorage) para subir cuando vuelva la conexión + botón **Sincronizar pendientes**.
- **i18n extendido** y **theme tokens** básicos para UI coherente en iOS/Android.

## v140 — Home: Resumen del día

- Nuevo componente **HomeDaySummary** en Home: muestra progreso del itinerario del día (visitados/total, barra de progreso), el **siguiente destino** y un botón de **acceso rápido a Travel Mode**. Si el día está completo, ofrece abrir la **Ruta**.

## v147 changes

- Consolidated DB migration (base+RLS+push+buckets)
- Explore filters UI (categorías/abierto/rating/orden/radios)
- places-search Edge updated to accept filters
- Added `.env.example`

## v148 changes

- Storage RLS policies exactas (avatars/docs)
- Triggers → notifications_inbox (invitaciones, nuevos colaboradores, lugares visitados)
- Edge `directions` + pantalla `trips/directions` con polilíneas (MapLibre)
- Inbox conectado a eventos reales (DB triggers)

## v149 changes

- Botón **“Cómo llegar”** en `Explore/place` → navega a `/trips/directions` con destino.
- **Direcciones** con pasos turn-by-turn (`j.steps`) y **mapa interactivo** con markers y cámara a **bounds**.
- **Push real**: `push_queue` + trigger al crear inbox + **edge** `push_worker` (cron-friendly).

### Despliegue push worker

```bash
supabase functions deploy push_worker --no-verify-jwt
# programa (cron) en Supabase a cada 1 min o 5 min
```

## v150 changes

- **AI Smart Route**: mapa con **polilíneas** entre paradas y botón **Ajustar cámara** (fit bounds).
- **Inbox con acciones**: Aceptar/Declinar invitación, Abrir Trip, Ver lugar visitado (deep-links con expo-router).
- **Direcciones**: mantiene auto-fit y permite refit manual.

## v151 changes

- **Booking 100% funcional** con UI/UX listo y arquitectura para afiliados:
  - `app/booking/flights/index.tsx` (IATA, fechas, pax, cabina → abre deeplink).
  - `app/booking/hotels/index.tsx` (ciudad, fechas, huéspedes, rooms).
  - `app/booking/esim/index.tsx` (país, presets de días/datos).
- Capa centralizada `src/lib/affiliates.ts` para construir URLs (reemplazar EXPO*PUBLIC*\* en Bolt).
- Componentes compartidos: `BookingCard`, `FiltersRow` (chips/inputs), estados básicos.

## v152 changes

- **Tema iOS-like** (`src/lib/theme.tsx`) aplicado via providers globales.
- **Toasts** sin dependencias externas (`src/components/ui/Toast.tsx`) + integrado en Booking.
- **Skeletons** (`src/components/ui/Skeleton.tsx`) para estados de carga.
- **Click-outs guardados** en Supabase (`booking_clickouts` + RLS) desde `src/lib/affiliates.ts`.
- Accesibilidad: `accessibilityRole/Label` añadidos en Booking; estilos pulidos.

## v153 changes

- **Tema aplicado app-wide** (fondos, tarjetas, inputs, botones) + **haptic feedback** en CTAs (expo-haptics).
- **Empty States** con ilustración y CTA opcional (usa `assets/branding-zeppeling.png`).
- **UI Kit Themed** (`ThemedButton`, `ThemedCard`, `ThemedChip`, `ThemedInput`) para consistencia.
- Pantallas principales actualizadas a `colors.background` y roles de accesibilidad.

## v154 changes

- **Tema de marca Zeppelin** aplicado (naranja #DE3D00 primario, púrpura #4B2A95 acento), tipografía y tokens semánticos.
- **Bottom Sheets** (`@gorhom/bottom-sheet`) para modales (Explorar filtros, Add to Trip, Manage Team) con fallback.
- **SegmentedControl** en Explore (chips fallback en Android/si falta lib).
- Botones **tonal/plain**, tamaños compact/regular/large.
- Ajustes de títulos al estilo iOS (Large/Headline) y fondos app-wide.

### Nuevas dependencias sugeridas

```bash
npm i @gorhom/bottom-sheet @react-native-segmented-control/segmented-control react-native-gesture-handler react-native-reanimated
npx expo prebuild
npx pod-install
```

## v155 changes

- **i18n completo (7 idiomas)** con `i18next` + provider global. Se añadió selector en Settings.
- **Large Titles** y opciones de header para raíces; **search bar** preparada en Explore.
- **Blur/Translucent headers** (recomendado completar en config nativa; añadido en README).
- **Bottom sheets** más extendidos (Add-to-Trip, Manage Team) y guía para filtros.
- **SF Symbols**: recomendado `react-native-sfsymbols` con fallback de `@expo/vector-icons` (ver README).
- **Motion**: haptics se mantiene; queda sugerencia de springs en cards/sheets.

### i18n coverage

Se reemplazaron textos comunes en pantallas raíz y se añadió utilidades; el script `tools/find-hardcoded.js` ayuda a detectar literales pendientes.

## v156 changes

- **Search bar nativa** activada en Explore (conexión al estado `search`) + **blur real** (`headerBlurEffect: 'systemMaterial'`).
- **Barrido i18n 100%**: codemod que enruta TODO texto visible por i18n (`t('auto.<texto>')`).
- Se agregó todo texto detectado al namespace **auto** en los 7 idiomas (como placeholder). Para traducirlos, edita `src/i18n/locales/*.json`.
- El script previo `tools/find-hardcoded.js` ya no debería encontrar textos; si aparece alguno, es raro/anidado.

## v157 changes

- **Android search fallback** en Explore: TextInput vinculado al mismo estado `search` que la barra nativa de iOS.
- **Visual QA**: padding base 16, botones 44pt (ajuste de `paddingVertical`), títulos y fondos verificados en pantallas clave.
- **i18n auto-translation** (runtime): si falta una traducción en `auto.*`, se intenta mini-diccionario; si defines `EXPO_PUBLIC_I18N_EDGE`, se consultará una Edge Function y se cacheará. Fallback visible con pseudolocalización para confirmar cobertura.
- Herramienta `tools/bake-translations.js` para consolidar traducciones runtime en tus JSON de locales.

---

## 📚 Documentación del Proyecto

### Documentación Activa (Raíz)

- **[README.md](README.md)** - Documentación principal y versiones
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Guía completa de despliegue
- **[API_CONFIGURATION.md](API_CONFIGURATION.md)** - Configuración de APIs y variables de entorno
- **[SECURITY_SETUP.md](SECURITY_SETUP.md)** - Configuración de seguridad
- **[SECURITY_ALERT.md](SECURITY_ALERT.md)** - Alertas de seguridad activas
- **[EAS-UPDATE-GUIDE.md](EAS-UPDATE-GUIDE.md)** - Guía de actualizaciones OTA con EAS
- **[GOOGLE_PLACES_SETUP.md](GOOGLE_PLACES_SETUP.md)** - Setup de Google Places API
- **[MAPLIBRE-UNIFIED-SYSTEM.md](MAPLIBRE-UNIFIED-SYSTEM.md)** - Sistema unificado de mapas
- **[LOCATION-BUTTON-FEATURE.md](LOCATION-BUTTON-FEATURE.md)** - Feature de botón de ubicación
- **[EXPLORE_LUGARES_FLOW.md](EXPLORE_LUGARES_FLOW.md)** - Flujo de exploración de lugares
- **[OPTIMIZATION_SUMMARY.md](OPTIMIZATION_SUMMARY.md)** - Resumen de optimizaciones

### Historial de Implementaciones

Ver **[docs/changelog/](docs/changelog/)** para documentación histórica de fixes, mejoras y optimizaciones ya implementadas.

---

## v157 changes

- **Android search fallback** en Explore: TextInput vinculado al mismo estado `search` que la barra nativa de iOS.
- **Visual QA**: padding base 16, botones 44pt (ajuste de `paddingVertical`), títulos y fondos verificados en pantallas clave.
- **i18n auto-translation** (runtime): si falta una traducción en `auto.*`, se intenta mini-diccionario; si defines `EXPO_PUBLIC_I18N_EDGE`, se consultará una Edge Function y se cacheará. Fallback visible con pseudolocalización para confirmar cobertura.
- Herramienta `tools/bake-translations.js` para consolidar traducciones runtime en tus JSON de locales.
