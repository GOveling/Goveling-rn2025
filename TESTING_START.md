# 📱 Instrucciones de Testing Manual - INICIO

**Fecha**: 16 de octubre de 2025  
**Estado**: Servidor corriendo ✅  

---

## 🎯 Cómo Proceder con el Testing

### El servidor Expo está corriendo en la terminal

En la ventana de terminal verás:

```
› Press a │ open Android
› Press i │ open iOS simulator  
› Press w │ open web
```

---

## 📋 Pasos para Testing

### **Paso 1: Abrir la App**

Elige una opción según tu dispositivo disponible:

#### **Opción A: iOS Simulator** (Recomendado en Mac)
1. En la terminal de Expo, presiona la tecla **`i`**
2. Espera que se abra el simulador de iOS
3. La app se instalará y abrirá automáticamente

#### **Opción B: Android Emulator**
1. Asegúrate de tener un emulador Android corriendo
2. En la terminal de Expo, presiona la tecla **`a`**
3. La app se instalará en el emulador

#### **Opción C: Dispositivo Físico** (iOS o Android)
1. Instala **Expo Go** desde App Store/Play Store
2. Escanea el QR code que aparece en la terminal
3. La app se abrirá en Expo Go

---

### **Paso 2: Observar el Inicio**

Una vez que la app abra, verifica:

✅ **La app inicia sin crashes**
- No hay pantalla roja de error
- No se cierra inmediatamente
- Muestra la pantalla de login/home

✅ **Console logs en la terminal**
- Busca errores en rojo
- Warnings en amarillo son aceptables si dicen:
  - "Google Maps API no configurada" (opcional)
  - "Weather API no configurada" (opcional)
  - "shadow* deprecated" (pre-existente)

---

### **Paso 3: Testing de Funcionalidades Críticas**

Sigue este checklist (usa `TESTING_GUIDE.md` para detalles):

#### 🔐 **1. Autenticación** (5 min)
- [ ] Login con credenciales existentes funciona
- [ ] Signup permite crear cuenta
- [ ] Forgot password permite recuperación
- [ ] Navegación post-login correcta

#### 🏠 **2. Home Tab** (3 min)
- [ ] Widget de ubicación muestra tu ciudad
- [ ] Temperatura aparece
- [ ] Si tienes viaje activo, aparece CurrentTripCard
- [ ] Contador de viajes próximos correcto

#### 🔍 **3. Explore Tab** (3 min)
- [ ] Búsqueda de lugares funciona
- [ ] Categorías se despliegan
- [ ] Mapa/lista toggle funciona

#### ✈️ **4. Trips Tab** (3 min)
- [ ] Lista de viajes se carga
- [ ] Filtros (active, upcoming, past) funcionan
- [ ] Puedes abrir detalles de un viaje

#### 👤 **5. Profile Tab** (2 min)
- [ ] Datos de usuario se cargan
- [ ] Settings accesible
- [ ] Logout funciona

---

### **Paso 4: Verificar Console**

Durante el testing, mantén un ojo en la terminal donde corre Expo:

**🟢 Logs Normales** (OK):
```
[i18n] Setting language to: en
[supabase] Client created successfully
✅ APIs core configuradas correctamente
```

**🔴 Errores Críticos** (Reportar):
```
ERROR Error: ...
ERROR TypeError: ...
ERROR Cannot read property ...
```

**🟡 Warnings Aceptables** (Ignorar si son pre-existentes):
```
⚠️ Google Maps API no configurada
⚠️ Weather API no configurada
"shadow*" style props are deprecated
```

---

## ✅ Criterios de Éxito

### **Testing Exitoso Si:**
- ✅ App inicia sin crashes
- ✅ Puedes navegar entre todos los tabs
- ✅ Login/Logout funciona
- ✅ No hay errores rojos nuevos en console
- ✅ Funcionalidades principales operan

### **Reportar Problema Si:**
- ❌ App crashea al iniciar
- ❌ Algún tab no carga
- ❌ Funcionalidad que antes funcionaba está rota
- ❌ Errores rojos nuevos en console
- ❌ Cambios visuales inesperados

---

## 🐛 Si Encuentras un Problema

1. **Toma nota del error**:
   - ¿En qué pantalla ocurrió?
   - ¿Qué acción causó el error?
   - ¿Qué dice el mensaje de error?

2. **Copia el error de la terminal**:
   ```bash
   # El texto en rojo que dice ERROR
   ```

3. **Usa el template en `TESTING_GUIDE.md`**:
   - Sección "Cómo Reportar Problemas"
   - Incluye pasos de reproducción

4. **Identifica el package**:
   - Revisa `MODERNIZATION_REVIEW.md`
   - Busca qué archivo fue modificado
   - Anota el commit hash

---

## 🔄 Si Necesitas Recargar

**Recargar la app**:
- En la terminal de Expo, presiona **`r`**
- O agita el dispositivo y selecciona "Reload"

**Reiniciar el servidor**:
```bash
# Presiona Ctrl+C para detener
# Luego ejecuta:
npx expo start
```

---

## 📊 Testing Estimado

| Fase | Tiempo | Crítico |
|------|--------|---------|
| Inicio y navegación | 5 min | ✅ |
| Funcionalidades básicas | 10 min | ✅ |
| Funcionalidades avanzadas | 10 min | ⚠️ |
| **Total** | **~25 min** | |

---

## 🎯 Objetivo

**Verificar que los 10 packages de refactorización NO causaron regresiones**

Los cambios fueron en:
- Limpieza de código (imports, variables)
- Tipos TypeScript
- Documentación (comentarios)
- Hooks (useEffect dependencies)

**NO debería haber cambios en funcionalidad o apariencia**

---

## ✨ Próximo Paso

**Una vez completado el testing:**

1. Si todo OK ✅:
   - Marca fase de testing como completa
   - Decide sobre packages opcionales 11-28

2. Si hay problemas ⚠️:
   - Reporta usando template
   - Evalúa si es crítico o menor
   - Decide rollback si necesario

---

**¡Éxito con el testing! 🚀**

*Cualquier duda, revisa `TESTING_GUIDE.md` para detalles completos*
