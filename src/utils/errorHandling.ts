/**
 * Error Handling Utilities
 * Provides graceful error handling and logging for production
 */

import { Alert } from 'react-native';

const isDevelopment = __DEV__;

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Silent logger that only shows logs in development
 */
export class SilentLogger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  debug(message: string, ...args: unknown[]) {
    if (isDevelopment) {
      console.log(`[${this.context}] ${message}`, ...args);
    }
  }

  info(message: string, ...args: unknown[]) {
    if (isDevelopment) {
      console.log(`ℹ️ [${this.context}] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: unknown[]) {
    if (isDevelopment) {
      console.warn(`⚠️ [${this.context}] ${message}`, ...args);
    }
  }

  error(message: string, error?: unknown, showToUser = false) {
    if (isDevelopment) {
      console.error(`❌ [${this.context}] ${message}`, error);
    }

    // In production, only log critical errors
    if (!isDevelopment && showToUser) {
      // You could send to error tracking service here
      // e.g., Sentry, Crashlytics, etc.
    }
  }
}

/**
 * Handles fetch errors gracefully
 */
export class FetchErrorHandler {
  private logger: SilentLogger;
  private retryCount: number;
  private maxRetries: number;

  constructor(context: string, maxRetries = 3) {
    this.logger = new SilentLogger(context);
    this.retryCount = 0;
    this.maxRetries = maxRetries;
  }

  /**
   * Execute a fetch with retry logic and graceful error handling
   */
  async executeFetch<T>(
    fetchFn: () => Promise<T>,
    options?: {
      fallbackValue?: T;
      retryDelayMs?: number;
      onError?: (error: unknown) => void;
      silent?: boolean;
    }
  ): Promise<T | null> {
    const { fallbackValue = null, retryDelayMs = 1000, onError, silent = true } = options || {};

    try {
      const result = await fetchFn();
      this.retryCount = 0; // Reset on success
      return result;
    } catch (error: unknown) {
      // Handle network errors silently
      if (this.isNetworkError(error)) {
        if (!silent) {
          this.logger.debug(`Network error (attempt ${this.retryCount + 1}/${this.maxRetries})`);
        }

        // Retry logic
        if (this.retryCount < this.maxRetries) {
          this.retryCount++;
          await this.delay(retryDelayMs * this.retryCount);
          return this.executeFetch(fetchFn, options);
        }

        // Max retries reached
        if (!silent) {
          this.logger.warn('Max retries reached, using fallback value');
        }
        onError?.(error);
        return fallbackValue as T;
      }

      // Handle other errors
      if (!silent) {
        this.logger.error('Fetch failed', error);
      }
      onError?.(error);
      return fallbackValue as T;
    }
  }

  /**
   * Check if error is a network error
   */
  private isNetworkError(error: unknown): boolean {
    const networkErrorPatterns = [
      'FunctionsFetchError',
      'Failed to send a request',
      'Network request failed',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'fetch failed',
    ];

    const errorString = error?.toString() || '';
    const errorMessage = (error as Error)?.message || '';

    return networkErrorPatterns.some(
      (pattern) => errorString.includes(pattern) || errorMessage.includes(pattern)
    );
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Handles Supabase Realtime channel errors gracefully
 */
export class RealtimeErrorHandler {
  private logger: SilentLogger;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  constructor(context: string) {
    this.logger = new SilentLogger(context);
  }

  /**
   * Handle channel status changes
   */
  handleChannelStatus(status: string, channelName?: string) {
    switch (status) {
      case 'SUBSCRIBED':
        this.logger.debug(`✅ Channel ${channelName || ''} connected`);
        this.reconnectAttempts = 0;
        break;

      case 'CHANNEL_ERROR':
      case 'TIMED_OUT':
        // Only log in development
        if (isDevelopment) {
          this.logger.debug(
            `⚠️ Channel ${channelName || ''} error (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`
          );
        }
        this.reconnectAttempts++;
        break;

      case 'CLOSED':
        this.logger.debug(`Channel ${channelName || ''} closed`);
        break;

      default:
        // Other statuses are fine
        break;
    }
  }

  /**
   * Check if should attempt reconnection
   */
  shouldReconnect(): boolean {
    return this.reconnectAttempts < this.maxReconnectAttempts;
  }

  /**
   * Reset reconnection attempts
   */
  resetReconnectAttempts() {
    this.reconnectAttempts = 0;
  }
}

/**
 * User-friendly error messages
 */
export const UserErrorMessages = {
  NETWORK_ERROR: {
    title: 'Sin conexión',
    message: 'No pudimos conectar con el servidor. Por favor verifica tu conexión a internet.',
  },
  FETCH_ERROR: {
    title: 'Error temporal',
    message: 'Estamos experimentando problemas temporales. Intenta de nuevo en unos momentos.',
  },
  REALTIME_ERROR: {
    title: 'Actualizaciones en pausa',
    message:
      'Las actualizaciones en tiempo real están temporalmente deshabilitadas. La app seguirá funcionando normalmente.',
  },
};

/**
 * Show user-friendly error alert (only in critical cases)
 */
export function showUserError(type: keyof typeof UserErrorMessages, onRetry?: () => void) {
  if (!isDevelopment) {
    const errorMessage = UserErrorMessages[type];
    Alert.alert(
      errorMessage.title,
      errorMessage.message,
      onRetry
        ? [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Reintentar', onPress: onRetry },
          ]
        : [{ text: 'OK' }]
    );
  }
}

/**
 * Create a silent logger instance
 */
export function createLogger(context: string): SilentLogger {
  return new SilentLogger(context);
}

/**
 * Create a fetch error handler instance
 */
export function createFetchHandler(context: string, maxRetries = 3): FetchErrorHandler {
  return new FetchErrorHandler(context, maxRetries);
}

/**
 * Create a realtime error handler instance
 */
export function createRealtimeHandler(context: string): RealtimeErrorHandler {
  return new RealtimeErrorHandler(context);
}
