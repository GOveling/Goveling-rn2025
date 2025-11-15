/**
 * TravelNotificationService - Manages progressive proximity notifications
 * Sends notifications at different distance thresholds (5km, 2km, 1km, 500m, 100m, 50m, 10m)
 * Optimized for native hardware with haptic feedback
 */

import { Platform } from 'react-native';

import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface ProximityNotificationData {
  placeId: string;
  placeName: string;
  distance: number; // meters
  threshold: number; // meters
  tripId: string;
  tripName: string;
}

// Notification thresholds in meters (progressive)
export const NOTIFICATION_THRESHOLDS = [5000, 2000, 1000, 500, 100, 50, 10];

// Cooldown period to avoid notification spam (5 minutes)
const NOTIFICATION_COOLDOWN = 5 * 60 * 1000;

interface NotificationHistory {
  placeId: string;
  threshold: number;
  timestamp: number;
}

class TravelNotificationService {
  private notificationHistory: NotificationHistory[] = [];
  private lastNotificationTime: number = 0;

  /**
   * Request notification permissions
   * @returns True if permissions granted
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
        console.warn('📱 Notification permissions not granted');
        return false;
      }

      console.log('✅ Notification permissions granted');

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('travel-mode', {
          name: 'Modo Travel',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#3B82F6',
          sound: 'default',
        });
      }

      return true;
    } catch (error) {
      console.error('❌ Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Check if a notification should be sent for a place at a specific threshold
   * @param placeId Place ID
   * @param threshold Distance threshold
   * @returns True if notification should be sent
   */
  private shouldNotify(placeId: string, threshold: number): boolean {
    const now = Date.now();

    // Check cooldown period
    if (now - this.lastNotificationTime < NOTIFICATION_COOLDOWN) {
      return false;
    }

    // Check if we've already notified for this place at this threshold
    const alreadyNotified = this.notificationHistory.some(
      (history) => history.placeId === placeId && history.threshold === threshold
    );

    return !alreadyNotified;
  }

  /**
   * Mark a notification as sent
   * @param placeId Place ID
   * @param threshold Distance threshold
   */
  private markNotified(placeId: string, threshold: number): void {
    this.notificationHistory.push({
      placeId,
      threshold,
      timestamp: Date.now(),
    });

    this.lastNotificationTime = Date.now();

    // Keep history manageable (last 100 notifications)
    if (this.notificationHistory.length > 100) {
      this.notificationHistory = this.notificationHistory.slice(-100);
    }
  }

  /**
   * Format distance for notification
   * @param meters Distance in meters
   * @returns Formatted string
   */
  private formatDistance(meters: number): string {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  }

  /**
   * Send proximity notification
   * @param data Notification data
   * @returns True if notification was sent
   */
  async sendProximityNotification(data: ProximityNotificationData): Promise<boolean> {
    const { placeId, placeName, distance, threshold, tripName } = data;

    // Check if we should send this notification
    if (!this.shouldNotify(placeId, threshold)) {
      console.log(
        `⏭️  Skipping notification for ${placeName} at ${threshold}m (already notified or cooldown)`
      );
      return false;
    }

    try {
      // Display the actual calculated distance, not the threshold bucket
      const distanceText = this.formatDistance(distance);
      const isArrival = threshold <= 50;

      // Trigger haptic feedback on arrival
      if (isArrival && Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Send notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: isArrival ? 'Has llegado!' : 'Cerca de tu destino',
          body: isArrival
            ? `Has alcanzado ${placeName}`
            : `Estás a ${distanceText} de ${placeName}`,
          data: {
            placeId,
            placeName,
            distance,
            threshold,
            tripName,
            type: 'proximity',
          },
          ...(isArrival && { sound: 'default' }), // Only include sound on arrival
          categoryIdentifier: 'travel-mode',
        },
        trigger: null, // Send immediately
      });

      // Mark as notified
      this.markNotified(placeId, threshold);

      console.log(`✅ Sent notification: ${placeName} at ${distanceText}`);
      return true;
    } catch (error) {
      console.error('❌ Error sending notification:', error);
      return false;
    }
  }

  /**
   * Send welcome notification when Travel Mode is activated
   */
  async sendWelcomeNotification(tripName: string): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Modo Travel Activado',
          body: `Recibirás notificaciones cuando te acerques a los lugares de ${tripName}`,
          data: {
            type: 'welcome',
          },
          categoryIdentifier: 'travel-mode',
        },
        trigger: null,
      });

      console.log('✅ Sent welcome notification');
    } catch (error) {
      console.error('❌ Error sending welcome notification:', error);
    }
  }

  /**
   * Send route deviation notification
   */
  async sendDeviationNotification(): Promise<void> {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Desviación de Ruta',
          body: 'Parece que te has desviado de la ruta. ¿Recalcular?',
          data: {
            type: 'deviation',
          },
          sound: 'default',
          categoryIdentifier: 'travel-mode',
        },
        trigger: null,
      });

      console.log('✅ Sent deviation notification');
    } catch (error) {
      console.error('❌ Error sending deviation notification:', error);
    }
  }

  /**
   * Send navigation step notification
   */
  async sendNavigationStepNotification(instruction: string, distance: number): Promise<void> {
    try {
      const distanceText = this.formatDistance(distance);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧭 Próximo Paso',
          body: `En ${distanceText}: ${instruction}`,
          data: {
            type: 'navigation',
            instruction,
            distance,
          },
          categoryIdentifier: 'travel-mode',
        },
        trigger: null,
      });

      console.log('✅ Sent navigation step notification');
    } catch (error) {
      console.error('❌ Error sending navigation notification:', error);
    }
  }

  /**
   * Clear notification history for a specific place
   * @param placeId Place ID
   */
  clearPlaceHistory(placeId: string): void {
    this.notificationHistory = this.notificationHistory.filter(
      (history) => history.placeId !== placeId
    );
    console.log(`🧹 Cleared notification history for place ${placeId}`);
  }

  /**
   * Clear all notification history
   */
  clearAllHistory(): void {
    this.notificationHistory = [];
    this.lastNotificationTime = 0;
    console.log('🧹 Cleared all notification history');
  }

  /**
   * Get notification history (for debugging)
   */
  getHistory(): NotificationHistory[] {
    return [...this.notificationHistory];
  }

  /**
   * Cancel all notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('🧹 Cancelled all scheduled notifications');
    } catch (error) {
      console.error('❌ Error cancelling notifications:', error);
    }
  }
}

// Export singleton instance
export const travelNotificationService = new TravelNotificationService();
export default TravelNotificationService;
