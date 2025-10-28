import React, { useEffect } from 'react';
import { Auth0Provider } from '@auth0/auth0-react';

const Auth0ProviderWithHistory = ({ children }) => {
  const domain = import.meta.env.VITE_AUTH0_DOMAIN;
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_AUTH0_REDIRECT_URI;

  if (!domain || !clientId) {
    console.error('Auth0 domain and client ID must be provided');
    return <div>Auth0 configuration error</div>;
  }

  console.log('Auth0 Provider Config:', {
    domain,
    clientId,
    redirectUri,
    fallbackRedirect: `${window.location.origin}/callback`
  });

  // Clear Auth0 cache if audience has changed (for local dev switching)
  useEffect(() => {
    const currentAudience = import.meta.env.VITE_AUTH0_AUDIENCE;
    const cachedAudience = localStorage.getItem('auth0_audience');
    
    if (cachedAudience && cachedAudience !== currentAudience) {
      console.log('Auth0 audience changed, clearing cache...', {
        old: cachedAudience,
        new: currentAudience
      });
      
      // Clear all Auth0-related localStorage keys
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('@@auth0spajs@@') || key.includes('auth0')) {
          localStorage.removeItem(key);
          console.log('Cleared:', key);
        }
      });
    }
    
    // Store current audience to detect changes
    if (currentAudience) {
      localStorage.setItem('auth0_audience', currentAudience);
    }
  }, []);

  // Auth0 identifier does NOT include /api - determine audience from API base URL if not set
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  const baseUrlWithoutApi = apiBaseUrl.replace(/\/api$/, '');
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE || baseUrlWithoutApi;

  console.log('Auth0 Provider - Audience:', audience);

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: redirectUri || `${window.location.origin}/callback`,
        audience: audience,
        scope: "openid profile email offline_access"
      }}
      useRefreshTokens={true}
      cacheLocation="localstorage"
    >
      {children}
    </Auth0Provider>
  );
};

export default Auth0ProviderWithHistory;
