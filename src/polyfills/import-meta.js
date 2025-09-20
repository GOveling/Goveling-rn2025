// Comprehensive import.meta polyfill for all environments
(function() {
  'use strict';
  
  // Define import.meta object
  var importMeta = {
    env: {
      NODE_ENV: (typeof process !== 'undefined' && process.env && process.env.NODE_ENV) || 'development',
      MODE: (typeof process !== 'undefined' && process.env && process.env.NODE_ENV) || 'development',
      DEV: ((typeof process !== 'undefined' && process.env && process.env.NODE_ENV) || 'development') === 'development',
      PROD: ((typeof process !== 'undefined' && process.env && process.env.NODE_ENV) || 'development') === 'production'
    },
    url: (typeof window !== 'undefined' && window.location) ? window.location.href : 'http://localhost:8081'
  };

  // Set on globalThis
  if (typeof globalThis !== 'undefined') {
    globalThis.importMeta = importMeta;
    if (!globalThis['import']) {
      globalThis['import'] = { meta: importMeta };
    }
  }

  // Set on window
  if (typeof window !== 'undefined') {
    window.importMeta = importMeta;
    if (!window['import']) {
      window['import'] = { meta: importMeta };
    }
  }

  // Set on global (Node.js)
  if (typeof global !== 'undefined') {
    global.importMeta = importMeta;
    if (!global['import']) {
      global['import'] = { meta: importMeta };
    }
  }

  // Override any existing import.meta references
  if (typeof Object !== 'undefined' && Object.defineProperty) {
    try {
      // Try to define import.meta on the global scope
      var contexts = [];
      if (typeof window !== 'undefined') contexts.push(window);
      if (typeof globalThis !== 'undefined') contexts.push(globalThis);
      if (typeof global !== 'undefined') contexts.push(global);
      
      contexts.forEach(function(context) {
        if (context && !context.hasOwnProperty('import')) {
          Object.defineProperty(context, 'import', {
            value: { meta: importMeta },
            writable: false,
            enumerable: false,
            configurable: true
          });
        }
      });
    } catch (e) {
      // Silently fail if we can't define the property
      console.warn('Could not define import.meta polyfill:', e.message);
    }
  }
})();
