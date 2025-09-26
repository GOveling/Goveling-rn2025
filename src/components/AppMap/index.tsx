import React from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type { AppMapProps } from './types';

export default function AppMap(props: AppMapProps) {
  // Web: cargar implementación DOM (usa maplibre-gl) sólo en web
  if (Platform.OS === 'web') {
    const WebDomMap = require('./web/WebDomMap').default as React.ComponentType<AppMapProps>;
    return <WebDomMap {...props} />;
  }

  // Expo Go: forzar WebView (sin módulo nativo)
  if (Constants.appOwnership === 'expo') {
    const WebViewMap = require('./webview/WebViewMap').default as React.ComponentType<AppMapProps>;
    return <WebViewMap {...props} />;
  }

  // Intentar nativo (Dev Client / build)
  let NativeMapComp: React.ComponentType<AppMapProps> | null = null;
  try {
    NativeMapComp = require('./native/NativeMap').default;
  } catch {
    NativeMapComp = null;
  }

  if (!NativeMapComp) {
    const WebViewMap = require('./webview/WebViewMap').default as React.ComponentType<AppMapProps>;
    return <WebViewMap {...props} />;
  }

  return <NativeMapComp {...props} />;
}
