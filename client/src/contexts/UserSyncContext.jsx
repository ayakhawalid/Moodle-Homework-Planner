import { createContext, useContext, useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { apiService } from "../services/api";
import { setTokenProvider } from "../services/api";

// Create context
const UserSyncContext = createContext();

// Provider component
export const UserSyncProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [error, setError] = useState(null);
  const { isAuthenticated, getAccessTokenSilently, user: auth0User } = useAuth0();

  // Set up token provider for API service
  useEffect(() => {
    console.log('UserSyncContext - Setting up token provider, isAuthenticated:', isAuthenticated);
    setTokenProvider(async () => {
      console.log('UserSyncContext - Token provider called, isAuthenticated:', isAuthenticated);
      if (isAuthenticated) {
        try {
          const token = await getAccessTokenSilently({
            audience: import.meta.env.VITE_AUTH0_AUDIENCE || 'https://moodle-homework-planner.onrender.com',
            scope: 'read:users read:stats'
          });
          console.log('UserSyncContext - Token retrieved successfully:', !!token);
          return token;
        } catch (error) {
          console.error('Failed to get access token:', error);
          return null;
        }
      }
      console.log('UserSyncContext - Not authenticated, returning null token');
      return null;
    });
  }, [isAuthenticated, getAccessTokenSilently]);

  // Helper function to retry API calls with exponential backoff
  const retryWithBackoff = async (apiCall, maxRetries = 2, delay = 2000) => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
        const isLastAttempt = attempt === maxRetries;
        
        if (isLastAttempt || !isTimeout) {
          throw error;
        }
        
        console.log(`Sync attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  };

  // Sync user profile with backend
  const syncUserProfile = async () => {
    if (!isAuthenticated || !auth0User) {
      setUser(null);
      setSyncStatus('idle');
      return;
    }

    setSyncStatus('syncing');
    setError(null);

    try {
      // First, try to get existing user profile with retry
      let freshUser;
      try {
        freshUser = await retryWithBackoff(() => apiService.user.getProfile());
      } catch (profileError) {
        console.log('Profile fetch failed, attempting to create profile...');

        // If profile doesn't exist, sync/create it first with retry
        const userData = {
          email: auth0User.email,
          name: auth0User.name,
          picture: auth0User.picture,
          email_verified: auth0User.email_verified
        };

        await retryWithBackoff(() => apiService.user.syncProfile(userData));

        // Then get the fresh user data with retry
        freshUser = await retryWithBackoff(() => apiService.user.getProfile());
        console.log('Created and retrieved new user profile:', freshUser);
      }

      setUser({
        ...freshUser,
        auth0User: auth0User
      });
      setSyncStatus('synced');
      console.log('User synced successfully:', freshUser);
    } catch (error) {
      console.error('Failed to sync user profile after retries:', error);
      
      // Check if it's a timeout error
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        console.error('User sync timed out after all retries - backend may be too slow or unresponsive');
        setError({
          ...error,
          isTimeout: true,
          message: 'Connection timeout - the server is taking too long to respond. This may happen on first request after inactivity. The request will retry automatically.'
        });
        // Don't set status to error immediately - allow user to retry
        // The UI can show a retry button
      } else {
        setError(error);
      }
      
      setSyncStatus('error');
    }
  };

  // Sync user profile when authentication state changes
  useEffect(() => {
    if (isAuthenticated && auth0User) {
      syncUserProfile();
    } else {
      setUser(null);
      setSyncStatus('idle');
    }
  }, [isAuthenticated, auth0User]);

  // Refresh user data
  const refreshUser = async () => {
    if (isAuthenticated && auth0User) {
      try {
        const refreshedUser = await retryWithBackoff(() => apiService.user.getProfile());
        setUser({
          ...refreshedUser,
          auth0User: auth0User
        });
        setSyncStatus('synced');
        setError(null);
        console.log('User refreshed successfully:', refreshedUser);
      } catch (error) {
        console.error('Failed to refresh user after retries:', error);
        
        // Check if it's a timeout error
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          console.error('User refresh timed out - backend may be slow or unresponsive');
          setError({
            ...error,
            isTimeout: true,
            message: 'Connection timeout - the server is taking too long to respond. Please try again.'
          });
        } else {
          setError(error);
        }
        setSyncStatus('error');
      }
    }
  };

  const value = {
    user,
    syncStatus,
    error,
    isAuthenticated,
    isAdmin: user?.role === 'admin',
    isLecturer: user?.role === 'lecturer',
    isStudent: user?.role === 'student',
    hasRole: (role) => user?.role === role,
    hasAnyRole: (roles) => roles.includes(user?.role),
    refreshUser,
    syncUserProfile
  };

  return (
    <UserSyncContext.Provider value={value}>
      {children}
    </UserSyncContext.Provider>
  );
};

// Custom hook for consuming the context
export const useUserSyncContext = () => {
  const context = useContext(UserSyncContext);
  if (!context) {
    throw new Error('useUserSyncContext must be used within a UserSyncProvider');
  }
  return context;
};
