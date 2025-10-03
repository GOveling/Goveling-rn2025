# EAS Update - Guía de Uso

## 🚀 Configuración Completada

Tu proyecto Goveling está configurado para usar EAS Update para actualizaciones OTA (Over-The-Air). Esto significa que puedes actualizar tu app sin necesidad de nueva instalación.

## 📱 Cómo Ver en Expo Go

1. **Descarga Expo Go** desde App Store/Google Play
2. **Escanea el QR** generado por `npm run dev:local`
3. **Las actualizaciones se aplicarán automáticamente** cuando publiques con EAS Update

## 🛠 Comandos Disponibles

### Desarrollo Local
```bash
npm run dev:local        # Desarrollo en dispositivo/simulador
npm run dev             # Desarrollo en web
npm run dev:tunnel      # Desarrollo con túnel (para testing externo)
```

### Actualizaciones OTA
```bash
npm run update          # Actualización automática (rama actual)
npm run update:dev      # Actualización para desarrollo
npm run update:prod     # Actualización para producción
npm run deploy          # Git commit + push + actualización OTA
```

## 🔄 Flujo de Trabajo Recomendado

1. **Desarrollo**:
   ```bash
   npm run dev:local
   ```

2. **Testing en Expo Go**:
   - Escanea el QR con la app Expo Go
   - Prueba las funcionalidades

3. **Publicar Actualización**:
   ```bash
   npm run deploy
   ```
   O manualmente:
   ```bash
   git add .
   git commit -m "feat: nueva funcionalidad"
   git push
   npm run update
   ```

4. **Ver en Dashboard**: https://expo.dev/accounts/goveling/projects/goveling-rn

## 🌍 Plataformas Soportadas

- **Web**: MapLibre GL JS nativo
- **iOS/Android (Expo Go)**: WebView con MapLibre
- **iOS/Android (Build Nativo)**: MapLibre React Native

## 📊 Información del Proyecto

- **Project ID**: `082d74f5-5463-424d-b8a3-0f2330c03846`
- **Owner**: `goveling`
- **Slug**: `goveling-rn`
- **Update URL**: `https://u.expo.dev/082d74f5-5463-424d-b8a3-0f2330c03846`

## 🗺 Funcionalidades del Mapa

- ✅ Marcador rojo para ubicación del usuario
- ✅ Marcadores azules numerados para lugares de búsqueda
- ✅ Limpieza automática de marcadores por defecto
- ✅ Soporte multiplataforma (Web, WebView, Nativo)
- ✅ Fallback automático para Expo Go

## 🔧 Troubleshooting

### Error en Expo Go
- Asegúrate de estar en la misma red WiFi
- Reinicia la app Expo Go
- Verifica que el puerto 8081 esté libre

### Actualización no se refleja
- Cierra y vuelve a abrir la app en Expo Go
- Verifica que la actualización se haya publicado correctamente
- Revisa el Dashboard de EAS para confirmar el estado

### Error de compilación
- Limpia node_modules: `rm -rf node_modules && npm install`
- Verifica que todas las dependencias estén instaladas
- Revisa errores en el terminal de Metro

## 📱 Próximos Pasos

1. **Build de Producción**:
   ```bash
   eas build --platform all
   ```

2. **Submit a Store**:
   ```bash
   eas submit --platform all
   ```

3. **Implementar Apple Maps** para iOS (código ya preparado en UniversalMap.tsx)

¡Tu app ahora se actualiza automáticamente! 🎉
