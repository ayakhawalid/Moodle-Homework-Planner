import { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { apiService, setAuthToken } from '../services/api';

export const useUserSync = () => {
  const { user, isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();
  const [syncStatus, setSyncStatus] = useState({
    syncing: false,
    synced: false,
    error: null,
    userProfile: null
  });

  useEffect(() => {
    const syncUser = async () => {
      // Only sync if user is authenticated and not already syncing
      if (!isAuthenticated || isLoading || syncStatus.syncing || syncStatus.synced) {
        return;
      }

      console.log('Starting user sync process...');
      setSyncStatus(prev => ({ ...prev, syncing: true, error: null }));

      try {
        // Get access token
        const token = await getAccessTokenSilently({
          authorizationParams: {
            audience: import.meta.env.VITE_AUTH0_AUDIENCE,
          },
        });

        // Set token for API calls
        setAuthToken(token);
        console.log('Auth token set successfully');

        // Try to get user profile (this will create user if doesn't exist)
        const response = await apiService.user.getProfile();
        const userProfile = response.data;

        console.log('User sync successful:', userProfile);
        setSyncStatus({
          syncing: false,
          synced: true,
          error: null,
          userProfile
        });

      } catch (error) {
        console.error('User sync failed:', error);
        setSyncStatus({
          syncing: false,
          synced: false,
          error: error.response?.data?.message || error.message || 'Sync failed',
          userProfile: null
        });
      }
    };

    syncUser();
  }, [isAuthenticated, isLoading, getAccessTokenSilently, syncStatus.syncing, syncStatus.synced]);

  // Function to manually retry sync
  const retrySync = () => {
    setSyncStatus({
      syncing: false,
      synced: false,
      error: null,
      userProfile: null
    });
  };

  return {
    syncStatus,
    retrySync,
    isReady: syncStatus.synced && !syncStatus.syncing
  };
};

export default useUserSync;
