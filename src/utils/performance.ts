import React from 'react';

// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startTiming(name: string): void {
    this.metrics.set(name, Date.now());
  }

  endTiming(name: string): number {
    const startTime = this.metrics.get(name);
    if (!startTime) {
      console.warn(`No start time found for metric: ${name}`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.metrics.delete(name);

    if (__DEV__) {
      console.log(`Performance: ${name} took ${duration}ms`);
    }

    return duration;
  }

  measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.startTiming(name);
    return fn().finally(() => {
      this.endTiming(name);
    });
  }

  measureSync<T>(name: string, fn: () => T): T {
    this.startTiming(name);
    try {
      return fn();
    } finally {
      this.endTiming(name);
    }
  }
}

// Memory usage tracking
export const useMemoryWarning = (threshold: number = 50) => {
  React.useEffect(() => {
    const checkMemory = () => {
      // This would integrate with React Native's memory APIs
      // For now, we'll use a placeholder
      if (__DEV__) {
        console.log('Memory check - threshold:', threshold);
      }
    };

    const interval = setInterval(checkMemory, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [threshold]);
};

// Bundle size analyzer (development only)
export const logBundleSize = () => {
  if (__DEV__) {
    console.log('Bundle analysis available in development mode');
    // This would integrate with Metro bundler analytics
  }
};

// Performance HOC for components
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return React.memo<P>(function PerformanceTrackedComponent(props) {
    const monitor = PerformanceMonitor.getInstance();
    
    React.useEffect(() => {
      monitor.startTiming(`${componentName}_mount`);
      return () => {
        monitor.endTiming(`${componentName}_mount`);
      };
    }, []);

    return React.createElement(Component, props);
  });
}
