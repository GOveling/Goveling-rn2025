// Polyfill for import.meta in web environments
if (typeof globalThis !== 'undefined' && !globalThis.importMeta) {
  globalThis.importMeta = {
    env: {
      NODE_ENV: process.env.NODE_ENV || 'development',
      MODE: process.env.NODE_ENV || 'development'
    },
    url: typeof window !== 'undefined' ? window.location.href : 'http://localhost'
  };
}

// Also set it on window for broader compatibility
if (typeof window !== 'undefined' && !window.importMeta) {
  window.importMeta = globalThis.importMeta;
}
