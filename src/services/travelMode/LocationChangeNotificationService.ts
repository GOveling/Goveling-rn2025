/**
 * LocationChangeNotificationService
 * Sends push notifications when country or city changes are detected in background
 * Works with BackgroundTravelManager to notify users without needing to open the app
 */

import { Platform, AppState } from 'react-native';

import * as Notifications from 'expo-notifications';

import { supabase } from '~/lib/supabase';
import { logger } from '~/utils/logger';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface CountryChangeNotification {
  countryName: string;
  countryFlag: string;
  countryCode: string;
  isReturn: boolean;
  cityName?: string;
  timestamp: number;
}

export interface CityChangeNotification {
  cityName: string;
  regionName?: string;
  countryName: string;
  countryFlag: string;
  isReturn: boolean;
  timestamp: number;
}

interface NotificationCache {
  countryCode?: string;
  cityName?: string;
  timestamp: number;
}

class LocationChangeNotificationService {
  private lastNotification: NotificationCache = {
    timestamp: 0,
  };

  // Cooldown period: 30 minutes (avoid spam if GPS is bouncing)
  private readonly NOTIFICATION_COOLDOWN = 30 * 60 * 1000;

  // Cache duration: 6 hours (same as city detection cache)
  private readonly CACHE_DURATION = 6 * 60 * 60 * 1000;

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        logger.warn('📱 Location notification permissions not granted');
        return false;
      }

      logger.info('✅ Location notification permissions granted');

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('location-changes', {
          name: 'Cambios de Ubicación',
          description: 'Notificaciones cuando llegas a un nuevo país o ciudad',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#10B981',
          sound: 'default',
          enableLights: true,
          enableVibrate: true,
        });
      }

      return true;
    } catch (error) {
      logger.error('❌ Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Check if we should send a notification
   * @param type 'country' or 'city'
   * @param identifier Country code or city name
   * @returns True if notification should be sent
   */
  private shouldSendNotification(type: 'country' | 'city', identifier: string): boolean {
    const now = Date.now();

    // Check cooldown period
    if (now - this.lastNotification.timestamp < this.NOTIFICATION_COOLDOWN) {
      logger.debug(
        `⏭️  Notification cooldown active (${Math.round((now - this.lastNotification.timestamp) / 1000 / 60)} min ago)`
      );
      return false;
    }

    // Check if we've already notified for this location
    if (type === 'country' && this.lastNotification.countryCode === identifier) {
      const timeSinceLastNotification = now - this.lastNotification.timestamp;
      if (timeSinceLastNotification < this.CACHE_DURATION) {
        logger.debug(
          `⏭️  Country notification already sent recently for ${identifier} (${Math.round(timeSinceLastNotification / 1000 / 60)} min ago)`
        );
        return false;
      }
    }

    if (type === 'city' && this.lastNotification.cityName === identifier) {
      const timeSinceLastNotification = now - this.lastNotification.timestamp;
      if (timeSinceLastNotification < this.CACHE_DURATION) {
        logger.debug(
          `⏭️  City notification already sent recently for ${identifier} (${Math.round(timeSinceLastNotification / 1000 / 60)} min ago)`
        );
        return false;
      }
    }

    return true;
  }

  /**
   * Check if app is in background
   * @returns True if app is in background
   */
  private isAppInBackground(): boolean {
    const state = AppState.currentState;
    return state === 'background' || state === 'inactive';
  }

  /**
   * Send country change notification (ONLY if app is in background)
   * @param data Country change data
   * @returns True if notification was sent
   */
  async sendCountryChangeNotification(data: CountryChangeNotification): Promise<boolean> {
    const { countryName, countryFlag, countryCode, isReturn, cityName } = data;

    // CRITICAL: Only send if app is in background
    if (!this.isAppInBackground()) {
      logger.debug('⏭️  App is in foreground, skipping country notification');
      return false;
    }

    // Check if we should send this notification
    if (!this.shouldSendNotification('country', countryCode)) {
      return false;
    }

    try {
      // Check if user has notifications enabled in settings
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        logger.warn('⚠️  User has not granted notification permissions');
        return false;
      }

      // Get user's saved places in this country (for context)
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: savedPlaces } = await supabase
        .from('trip_places')
        .select('name')
        .eq('country_code', countryCode)
        .limit(3);

      const savedPlacesCount = savedPlaces?.length || 0;

      // Construct notification message
      const title = isReturn
        ? `${countryFlag} ¡Bienvenido de vuelta a ${countryName}!`
        : `${countryFlag} ¡Bienvenido a ${countryName}!`;

      let body = isReturn
        ? `Has regresado a ${countryName}.`
        : `Esta es tu primera visita a este país.`;

      if (savedPlacesCount > 0) {
        body += ` Tienes ${savedPlacesCount} lugar${savedPlacesCount > 1 ? 'es' : ''} guardado${savedPlacesCount > 1 ? 's' : ''} aquí.`;
      }

      if (cityName) {
        body += ` Ciudad detectada: ${cityName}.`;
      }

      // Send notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            type: 'country_change',
            countryCode,
            countryName,
            countryFlag,
            isReturn,
            cityName,
            timestamp: Date.now(),
          },
          sound: 'default',
          categoryIdentifier: 'location-changes',
        },
        trigger: null, // Send immediately
      });

      // Update cache
      this.lastNotification = {
        countryCode,
        timestamp: Date.now(),
      };

      logger.info(`✅ Sent country change notification: ${countryName}`);
      return true;
    } catch (error) {
      logger.error('❌ Error sending country notification:', error);
      return false;
    }
  }

  /**
   * Send city change notification (ONLY if app is in background)
   * @param data City change data
   * @returns True if notification was sent
   */
  async sendCityChangeNotification(data: CityChangeNotification): Promise<boolean> {
    const { cityName, regionName, countryName, countryFlag, isReturn } = data;

    // CRITICAL: Only send if app is in background
    if (!this.isAppInBackground()) {
      logger.debug('⏭️  App is in foreground, skipping city notification');
      return false;
    }

    // Check if we should send this notification
    if (!this.shouldSendNotification('city', cityName)) {
      return false;
    }

    try {
      // Check if user has notifications enabled in settings
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        logger.warn('⚠️  User has not granted notification permissions');
        return false;
      }

      // Get user's saved places in this city (for context)
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: savedPlaces } = await supabase
        .from('trip_places')
        .select('name')
        .ilike('city', `%${cityName}%`)
        .limit(3);

      const savedPlacesCount = savedPlaces?.length || 0;

      // Construct notification message
      const locationName = regionName ? `${cityName}, ${regionName}` : cityName;
      const title = isReturn
        ? `🏙️ ¡Bienvenido de vuelta a ${locationName}!`
        : `🏙️ ¡Bienvenido a ${locationName}!`;

      let body = isReturn ? `Has regresado a ${locationName}.` : `Primera visita a ${cityName}.`;

      if (savedPlacesCount > 0) {
        body += ` Tienes ${savedPlacesCount} lugar${savedPlacesCount > 1 ? 'es' : ''} guardado${savedPlacesCount > 1 ? 's' : ''} aquí.`;
      }

      body += ` ${countryFlag} ${countryName}`;

      // Send notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            type: 'city_change',
            cityName,
            regionName,
            countryName,
            countryFlag,
            isReturn,
            timestamp: Date.now(),
          },
          sound: 'default',
          categoryIdentifier: 'location-changes',
        },
        trigger: null, // Send immediately
      });

      // Update cache
      this.lastNotification = {
        ...this.lastNotification,
        cityName,
        timestamp: Date.now(),
      };

      logger.info(`✅ Sent city change notification: ${cityName}`);
      return true;
    } catch (error) {
      logger.error('❌ Error sending city notification:', error);
      return false;
    }
  }

  /**
   * Clear notification cache (useful for debugging)
   */
  clearCache(): void {
    this.lastNotification = {
      timestamp: 0,
    };
    logger.info('🧹 Notification cache cleared');
  }

  /**
   * Get last notification info (for debugging)
   */
  getLastNotification(): NotificationCache {
    return { ...this.lastNotification };
  }
}

// Singleton instance
export const locationChangeNotificationService = new LocationChangeNotificationService();
