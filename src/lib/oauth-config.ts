// OAuth Configuration
export const OAUTH_CONFIG = {
  development: {
    redirectUrl: `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081'}/auth/callback`,
    allowedOrigins: [
      'http://localhost:8081',
      'https://localhost:8081',
      'http://127.0.0.1:8081',
      'https://127.0.0.1:8081'
    ]
  },
  production: {
    redirectUrl: 'https://your-production-domain.com/auth/callback',
    allowedOrigins: [
      'https://your-production-domain.com'
    ]
  }
};

export const getRedirectUrl = () => {
  const env = process.env.NODE_ENV || 'development';
  return OAUTH_CONFIG[env as keyof typeof OAUTH_CONFIG].redirectUrl;
};

export const isValidOrigin = (origin: string) => {
  const env = process.env.NODE_ENV || 'development';
  return OAUTH_CONFIG[env as keyof typeof OAUTH_CONFIG].allowedOrigins.includes(origin);
};
