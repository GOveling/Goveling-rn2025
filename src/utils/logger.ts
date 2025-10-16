/**
 * Logger Utility - Conditional logging based on environment
 * 
 * In production (__DEV__ = false):
 * - debug(), info(), warn() are no-ops (do nothing)
 * - error() still logs to console for critical errors
 * 
 * In development (__DEV__ = true):
 * - All methods log normally
 * 
 * Usage:
 * import { logger } from '~/utils/logger';
 * logger.debug('Debug info:', data);
 * logger.info('User logged in');
 * logger.warn('Deprecated API used');
 * logger.error('Critical error:', error);
 */

const isDevelopment = __DEV__;

/**
 * Logger with environment-aware methods
 */
export const logger = {
  /**
   * Debug logs - Only in development
   * Use for detailed debugging information
   */
  debug: (...args: any[]): void => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Info logs - Only in development
   * Use for general information
   */
  info: (...args: any[]): void => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  /**
   * Warning logs - Only in development
   * Use for non-critical issues
   */
  warn: (...args: any[]): void => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  /**
   * Error logs - Always logged
   * Use for critical errors that should be tracked in production
   * 
   * In production, you can integrate with error tracking services
   * like Sentry, Firebase Crashlytics, etc.
   */
  error: (...args: any[]): void => {
    console.error(...args);
    
    // TODO: In production, send to error tracking service
    // if (!isDevelopment) {
    //   Sentry.captureException(args[0]);
    // }
  },

  /**
   * Group logs - Only in development
   * Use to create collapsible log groups
   */
  group: (label: string): void => {
    if (isDevelopment && console.group) {
      console.group(label);
    }
  },

  /**
   * Group end - Only in development
   */
  groupEnd: (): void => {
    if (isDevelopment && console.groupEnd) {
      console.groupEnd();
    }
  },

  /**
   * Table logs - Only in development
   * Use to display data in table format
   */
  table: (data: any): void => {
    if (isDevelopment && console.table) {
      console.table(data);
    }
  },

  /**
   * Time tracking - Only in development
   * Use to measure execution time
   */
  time: (label: string): void => {
    if (isDevelopment && console.time) {
      console.time(label);
    }
  },

  /**
   * Time tracking end - Only in development
   */
  timeEnd: (label: string): void => {
    if (isDevelopment && console.timeEnd) {
      console.timeEnd(label);
    }
  },

  /**
   * Trace logs - Only in development
   * Use to display stack trace
   */
  trace: (...args: any[]): void => {
    if (isDevelopment && console.trace) {
      console.trace(...args);
    }
  }
};

/**
 * Performance logger utility
 * Tracks operation timing with automatic logging
 */
export class PerformanceLogger {
  private startTime: number;
  private label: string;

  constructor(label: string) {
    this.label = label;
    this.startTime = Date.now();
    logger.debug(`⏱️ [${label}] Started`);
  }

  /**
   * End performance tracking and log duration
   */
  end(): number {
    const duration = Date.now() - this.startTime;
    logger.debug(`⏱️ [${this.label}] Completed in ${duration}ms`);
    return duration;
  }

  /**
   * Log intermediate checkpoint
   */
  checkpoint(name: string): void {
    const elapsed = Date.now() - this.startTime;
    logger.debug(`⏱️ [${this.label}] ${name} at ${elapsed}ms`);
  }
}

/**
 * Decorator for async functions to log execution time
 * 
 * @example
 * const fetchData = logPerformance('fetchData', async () => {
 *   const response = await fetch(url);
 *   return response.json();
 * });
 */
export function logPerformance<T extends (...args: any[]) => Promise<any>>(
  label: string,
  fn: T
): T {
  return (async (...args: any[]) => {
    const perf = new PerformanceLogger(label);
    try {
      const result = await fn(...args);
      perf.end();
      return result;
    } catch (error) {
      perf.end();
      logger.error(`❌ [${label}] Failed:`, error);
      throw error;
    }
  }) as T;
}

/**
 * Create a namespaced logger for specific modules
 * 
 * @example
 * const log = createNamespacedLogger('HomeTab');
 * log.debug('Component mounted');
 */
export function createNamespacedLogger(namespace: string) {
  return {
    debug: (...args: any[]) => logger.debug(`[${namespace}]`, ...args),
    info: (...args: any[]) => logger.info(`[${namespace}]`, ...args),
    warn: (...args: any[]) => logger.warn(`[${namespace}]`, ...args),
    error: (...args: any[]) => logger.error(`[${namespace}]`, ...args),
  };
}

export default logger;
