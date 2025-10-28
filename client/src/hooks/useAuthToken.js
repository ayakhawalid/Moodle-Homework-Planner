import { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { setTokenProvider } from '../services/api';

export const useAuthToken = () => {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();

  useEffect(() => {
    setTokenProvider(async () => {
      if (isAuthenticated) {
        try {
          // Determine the correct audience - Auth0 identifier does NOT include /api
          const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
          // Remove /api if present since Auth0 identifier is just the base URL
          const baseUrlWithoutApi = apiBaseUrl.replace(/\/api$/, '');
          const audience = import.meta.env.VITE_AUTH0_AUDIENCE || baseUrlWithoutApi;
          
          const token = await getAccessTokenSilently({
            authorizationParams: {
              audience: audience
            },
            // Use cached token normally; individual calls can set ignoreCache:true
            ignoreCache: false
          });
          return token || null;
        } catch (error) {
          console.error('Failed to get access token:', error);
          return null;
        }
      }
      return null;
    });
  }, [isAuthenticated, getAccessTokenSilently]);

  return { isAuthenticated };
};

const axios = require('axios');

const getMgmtToken = async () => {
  const domain = process.env.AUTH0_DOMAIN;
  const clientId = process.env.AUTH0_MGMT_CLIENT_ID;
  const clientSecret = process.env.AUTH0_MGMT_CLIENT_SECRET;
  const audience = `https://${domain}/api/v2/`;

  const resp = await axios.post(`https://${domain}/oauth/token`, {
    client_id: clientId,
    client_secret: clientSecret,
    audience,
    grant_type: 'client_credentials'
  });

  return resp.data.access_token;
};

const deleteAuth0User = async (auth0UserId) => {
  if (!auth0UserId) throw new Error('Missing Auth0 user ID');
  const token = await getMgmtToken();
  const url = `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(auth0UserId)}`;
  await axios.delete(url, { headers: { Authorization: `Bearer ${token}` } });
};

module.exports = {
  getMgmtToken,
  deleteAuth0User
};
