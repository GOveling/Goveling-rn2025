/**
 * Global Error Configuration
 * Suppresses development-only errors in production
 */

const isDevelopment = __DEV__;

/**
 * Setup global error handlers
 */
export function setupGlobalErrorHandlers() {
  if (isDevelopment) {
    // In development, let all errors through for debugging
    return;
  }

  // Suppress Metro connection warnings in production (shouldn't happen in production builds)
  const originalConsoleWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    const message = args.join(' ');

    // Filter out Metro connection warnings
    if (message.includes('Cannot connect to Metro') || message.includes('Metro URL')) {
      return;
    }

    // Filter out HMR warnings
    if (message.includes('HMR') || message.includes('Hot Module Replacement')) {
      return;
    }

    // Let other warnings through
    originalConsoleWarn(...args);
  };

  // Suppress specific network errors from console.error
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    const message = args.join(' ');

    // Filter out known network errors that are already handled
    if (
      message.includes('FunctionsFetchError') ||
      message.includes('Failed to send a request to the Edge Function')
    ) {
      // These are handled gracefully by our error handlers
      return;
    }

    // Filter out Metro errors
    if (message.includes('Metro') || message.includes('metro')) {
      return;
    }

    // Let other errors through
    originalConsoleError(...args);
  };
}

/**
 * Setup console log filtering for production
 * Only keeps important logs, filters out verbose debug logs
 */
export function setupProductionLogging() {
  if (isDevelopment) {
    // In development, show all logs
    return;
  }

  const originalConsoleLog = console.log;
  console.log = (...args: unknown[]) => {
    const message = args.join(' ');

    // Filter out verbose emoji logs
    const verbosePatterns = [
      '📸 Fetching photos',
      '✅ Got',
      'photos for',
      '📍 Location attempt',
      '📏 Distance from last visit',
      '🔔 TripCard:',
      'channel status',
      'CHANNEL_ERROR',
      'SUBSCRIBED',
      'TIMED_OUT',
    ];

    if (verbosePatterns.some((pattern) => message.includes(pattern))) {
      return;
    }

    // Let important logs through
    originalConsoleLog(...args);
  };
}
