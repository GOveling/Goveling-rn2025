# 🗺️ MapTiler con Botón de Ubicación

## ✨ Nuevas Funcionalidades

### 📍 **Botón de Ubicación con Lottie Animation**

Todos los mapas de MapTiler ahora incluyen un botón flotante de ubicación que permite al usuario encontrar su ubicación actual.

#### **Características:**
- **🎬 Animación Lottie**: Usa el archivo `location-circle.json` para una experiencia visual atractiva
- **🔘 Estado Activable**: El botón cambia de color cuando está activo
- **📱 Multiplataforma**: Funciona en Web, iOS y Android
- **🎯 Posicionamiento Inteligente**: Se ajusta automáticamente según la plataforma

#### **Ubicación del Botón:**
- **Web**: Esquina inferior derecha (bottom: 20px)
- **Mobile**: Esquina inferior derecha (bottom: 80px) - evita interferir con controles nativos

### 🛠️ **Implementación Técnica**

#### **Archivos Creados:**
1. `src/components/LocationButton.tsx` - Componente del botón con Lottie
2. `assets/animations/location-circle.json` - Animación Lottie del pin de ubicación

#### **Archivos Modificados:**
1. `src/components/MapTilerMap.tsx` - Integración del botón en todos los mapas

### 🎮 **Cómo Usar**

1. **Activar Ubicación**: Hacer clic en el botón circular flotante
2. **Animación**: El ícono se anima y cambia de color cuando está activo
3. **Ubicación en Mapa**: Se muestra un punto azul con su ubicación actual
4. **Desactivar**: Hacer clic nuevamente para desactivar

### 🌍 **Compatibilidad de Plataformas**

#### **Web (MapLibre GL JS)**
- ✅ Geolocalización HTML5
- ✅ Marcador de usuario personalizado
- ✅ Animación Lottie completa

#### **iOS (Apple Maps)**
- ✅ Botón de ubicación funcional
- ✅ Integración con permisos nativos
- ✅ Animación Lottie

#### **Android/Expo Go (WebView)**
- ✅ Geolocalización via WebView
- ✅ Marcador de usuario
- ✅ Animación Lottie

### 🔧 **Dependencias Agregadas**

```bash
npm install lottie-react-native react-native-svg --legacy-peer-deps
```

### 📝 **API del Componente**

```typescript
interface LocationButtonProps {
  onLocationPress: () => void;
  isActive?: boolean;
  style?: any;
}
```

### 🎨 **Estilos Personalizables**

- **Tamaño**: 48x48px por defecto
- **Color Inactivo**: Fondo blanco con sombra
- **Color Activo**: Fondo azul (#007AFF)
- **Animación**: 32x32px centrada

### 🚀 **Próximas Mejoras**

- [ ] Seguimiento de ubicación en tiempo real
- [ ] Diferentes estilos de marcador de usuario
- [ ] Integración con brújula
- [ ] Historial de ubicaciones
- [ ] Modo de navegación

### 🐛 **Resolución de Problemas**

**Si el botón no aparece:**
1. Verificar que las dependencias de Lottie estén instaladas
2. Confirmar que el archivo `location-circle.json` esté en `assets/animations/`
3. Reiniciar el servidor de desarrollo

**Si la ubicación no funciona:**
1. Verificar permisos de ubicación en el navegador/dispositivo
2. Confirmar que la conexión sea HTTPS en producción
3. Verificar que la API key de MapTiler esté configurada

---

🎉 **¡El botón de ubicación está listo para usar en todos los mapas de la aplicación!**
