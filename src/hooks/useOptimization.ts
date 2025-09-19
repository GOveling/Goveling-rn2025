import React from 'react';
import { supabase } from '~/lib/supabase';

// Custom hook for optimized data fetching with caching
export function useOptimizedQuery<T>(
  queryKey: string,
  queryFn: () => Promise<T>,
  dependencies: React.DependencyList = [],
  cacheTime: number = 5 * 60 * 1000 // 5 minutes default
) {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  
  // Simple in-memory cache
  const cacheRef = React.useRef<Map<string, { data: T; timestamp: number }>>(new Map());
  
  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check cache first
      const cached = cacheRef.current.get(queryKey);
      if (cached && Date.now() - cached.timestamp < cacheTime) {
        setData(cached.data);
        setLoading(false);
        return;
      }
      
      const result = await queryFn();
      
      // Update cache
      cacheRef.current.set(queryKey, {
        data: result,
        timestamp: Date.now()
      });
      
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [queryKey, queryFn, cacheTime, ...dependencies]);
  
  React.useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const refetch = React.useCallback(() => {
    // Clear cache for this query
    cacheRef.current.delete(queryKey);
    fetchData();
  }, [queryKey, fetchData]);
  
  return { data, loading, error, refetch };
}

// Hook for debounced values (useful for search inputs)
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);
  
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
}

// Hook for intersection observer (lazy loading images/components)
export function useIntersectionObserver(
  targetRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = React.useState(false);
  
  React.useEffect(() => {
    const target = targetRef.current;
    if (!target) return;
    
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);
    
    observer.observe(target);
    
    return () => {
      observer.unobserve(target);
    };
  }, [targetRef, options]);
  
  return isIntersecting;
}
