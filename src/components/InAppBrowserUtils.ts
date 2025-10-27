// src/components/InAppBrowserUtils.ts
import { Linking, Alert, Platform } from 'react-native';

import * as WebBrowser from 'expo-web-browser';

import { COLORS } from '../constants/colors';

export interface InAppBrowserOptions {
  /** Título del modal del navegador */
  title?: string;
  /** Color de la barra de herramientas */
  toolbarColor?: string;
  /** Color de los controles */
  controlsColor?: string;
  /** Mostrar título de la página */
  showTitle?: boolean;
  /** Habilitar colapso de barra */
  enableBarCollapsing?: boolean;
  /** Estilo de presentación */
  presentationStyle?: 'pageSheet' | 'formSheet' | 'overFullScreen' | 'overCurrentContext';
}

/**
 * Abre una URL en un navegador integrado dentro de la app
 */
export async function openInAppBrowser(
  url: string,
  options: InAppBrowserOptions = {}
): Promise<WebBrowser.WebBrowserResult> {
  try {
    // Validar y normalizar URL
    const normalizedUrl = normalizeUrl(url);

    // Configuración por defecto
    const defaultOptions: WebBrowser.WebBrowserOpenOptions = {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.OVER_FULL_SCREEN,
      controlsColor: options.controlsColor || COLORS.primary.main,
      toolbarColor: options.toolbarColor || COLORS.background.primary,
      showTitle: options.showTitle ?? true,
      enableBarCollapsing: options.enableBarCollapsing ?? false,
    };

    // Aplicar configuración específica por plataforma
    const platformOptions = Platform.select({
      ios: {
        ...defaultOptions,
        presentationStyle:
          options.presentationStyle === 'pageSheet'
            ? WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET
            : WebBrowser.WebBrowserPresentationStyle.OVER_FULL_SCREEN,
      },
      android: {
        ...defaultOptions,
        showInRecents: false, // No mostrar en apps recientes
      },
      default: defaultOptions,
    });

    console.log('🌐 Opening in-app browser:', normalizedUrl);

    const result = await WebBrowser.openBrowserAsync(normalizedUrl, platformOptions);

    console.log('🌐 Browser result:', result);
    return result;
  } catch (error) {
    console.error('❌ Error opening in-app browser:', error);
    throw error;
  }
}

/**
 * Abre una URL con fallback a navegador externo
 */
export async function openUrlWithFallback(
  url: string,
  options: InAppBrowserOptions = {},
  showFallbackAlert: boolean = true
): Promise<void> {
  try {
    await openInAppBrowser(url, options);
  } catch (error) {
    console.error('Error opening in-app browser, falling back to external:', error);

    if (showFallbackAlert) {
      Alert.alert(
        'Navegador no disponible',
        '¿Deseas abrir el enlace en tu navegador predeterminado?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Abrir',
            onPress: () => openExternalBrowser(url),
          },
        ]
      );
    } else {
      await openExternalBrowser(url);
    }
  }
}

/**
 * Abre URL en navegador externo
 */
export async function openExternalBrowser(url: string): Promise<void> {
  try {
    const normalizedUrl = normalizeUrl(url);
    const canOpen = await Linking.canOpenURL(normalizedUrl);

    if (canOpen) {
      await Linking.openURL(normalizedUrl);
    } else {
      throw new Error('Cannot open URL');
    }
  } catch (error) {
    console.error('Error opening external browser:', error);
    Alert.alert('Error', 'No se pudo abrir el enlace');
  }
}

/**
 * Normaliza una URL agregando protocolo si es necesario
 */
function normalizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    throw new Error('URL inválida');
  }

  let normalizedUrl = url.trim();

  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  return normalizedUrl;
}

/**
 * Verifica si WebBrowser está disponible
 */
export async function isInAppBrowserAvailable(): Promise<boolean> {
  try {
    // Para expo-web-browser, simplemente returnamos true ya que está disponible
    return true;
  } catch {
    return false;
  }
}

/**
 * Configuraciones preestablecidas para diferentes tipos de contenido
 */
export const BrowserPresets = {
  /** Para sitios web de lugares/restaurantes */
  place: {
    title: 'Información del lugar',
    toolbarColor: COLORS.background.primary,
    controlsColor: COLORS.primary.main,
    showTitle: true,
    enableBarCollapsing: false,
    presentationStyle: 'overFullScreen' as const,
  },

  /** Para redes sociales */
  social: {
    title: 'Red Social',
    toolbarColor: '#1DA1F2', // Twitter blue
    controlsColor: '#FFFFFF',
    showTitle: true,
    enableBarCollapsing: true,
    presentationStyle: 'pageSheet' as const,
  },

  /** Para artículos y blogs */
  article: {
    title: 'Artículo',
    toolbarColor: COLORS.background.secondary,
    controlsColor: COLORS.text.primary,
    showTitle: true,
    enableBarCollapsing: true,
    presentationStyle: 'pageSheet' as const,
  },

  /** Para documentos oficiales */
  official: {
    title: 'Documento',
    toolbarColor: COLORS.background.primary,
    controlsColor: COLORS.primary.dark,
    showTitle: true,
    enableBarCollapsing: false,
    presentationStyle: 'overFullScreen' as const,
  },
} as const;

export default {
  openInAppBrowser,
  openUrlWithFallback,
  openExternalBrowser,
  isInAppBrowserAvailable,
  BrowserPresets,
};
