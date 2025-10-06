/**
 * Utilidades para manejar OAuth callbacks de manera más robusta
 */

export interface OAuthCallbackResult {
  success: boolean;
  hasCode: boolean;
  hasError: boolean;
  errorType?: string;
  errorDescription?: string;
  needsSessionCheck: boolean;
}

/**
 * Analiza la URL actual para determinar si es un callback OAuth y su estado
 */
export const analyzeOAuthCallback = (): OAuthCallbackResult => {
  const url = window.location.href;
  const searchParams = new URLSearchParams(window.location.search);
  const hashFragment = window.location.hash;
  
  // Check for OAuth errors
  const errorParam = searchParams.get('error');
  const errorCode = searchParams.get('error_code');
  const errorDescription = searchParams.get('error_description');
  
  if (errorParam) {
    return {
      success: false,
      hasCode: false,
      hasError: true,
      errorType: errorParam,
      errorDescription: errorDescription || undefined,
      needsSessionCheck: errorCode === 'bad_oauth_callback' // Sometimes session is created despite callback error
    };
  }
  
  // Check for OAuth success indicators
  const hasCode = searchParams.has('code') || hashFragment.includes('code=');
  const hasAccessToken = hashFragment.includes('access_token');
  
  if (hasCode || hasAccessToken) {
    return {
      success: true,
      hasCode: hasCode,
      hasError: false,
      needsSessionCheck: true
    };
  }
  
  // Not an OAuth callback
  return {
    success: false,
    hasCode: false,
    hasError: false,
    needsSessionCheck: false
  };
};

/**
 * Espera hasta que se establezca una sesión o se agote el tiempo
 */
export const waitForSession = async (
  getSession: () => Promise<any>, 
  maxAttempts = 10, 
  delayMs = 1000
): Promise<{ session: any | null; attempts: number }> => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`🔄 Session check attempt ${attempt}/${maxAttempts}`);
    
    try {
      const { data, error } = await getSession();
      
      if (data?.session) {
        console.log(`✅ Session found on attempt ${attempt}`);
        return { session: data.session, attempts: attempt };
      }
      
      if (error) {
        console.error(`❌ Session check error on attempt ${attempt}:`, error);
      }
    } catch (err) {
      console.error(`💥 Exception during session check attempt ${attempt}:`, err);
    }
    
    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  console.log(`❌ No session found after ${maxAttempts} attempts`);
  return { session: null, attempts: maxAttempts };
};

/**
 * Logs detallados para debugging de OAuth
 */
export const logOAuthDebugInfo = () => {
  const info = {
    url: window.location.href,
    origin: window.location.origin,
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
    timestamp: new Date().toISOString()
  };
  
  console.log('🔍 OAuth Debug Info:', info);
  
  // Try to decode state parameter if present
  const searchParams = new URLSearchParams(window.location.search);
  const stateParam = searchParams.get('state');
  
  if (stateParam) {
    try {
      // Supabase state is usually base64 encoded JSON
      const parts = stateParam.split('.');
      if (parts.length > 1) {
        const decoded = JSON.parse(atob(parts[1]));
        console.log('🔍 Decoded state parameter:', decoded);
      }
    } catch (e) {
      console.log('⚠️ Could not decode state parameter:', stateParam);
    }
  }
  
  return info;
};
