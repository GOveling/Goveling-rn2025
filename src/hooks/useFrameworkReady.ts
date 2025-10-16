import { useEffect } from 'react';

export function useFrameworkReady() {
  useEffect(() => {
    // Framework initialization for web compatibility
    if (typeof window !== 'undefined') {
      // Web-specific initialization
      console.log('Framework ready for web');
    }
  }, []);
}
