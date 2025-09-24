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
            audience: import.meta.env.VITE_AUTH0_AUDIENCE || 'http://localhost:5000',
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
      // First, try to get existing user profile
      let freshUser;
      try {
        freshUser = await apiService.user.getProfile();
      } catch (profileError) {

        // If profile doesn't exist, sync/create it first
        const userData = {
          email: auth0User.email,
          name: auth0User.name,
          picture: auth0User.picture,
          email_verified: auth0User.email_verified
        };

        await apiService.user.syncProfile(userData);

        // Then get the fresh user data
        freshUser = await apiService.user.getProfile();
        console.log('Created and retrieved new user profile:', freshUser);
      }

      setUser({
        ...freshUser,
        auth0User: auth0User
      });
      setSyncStatus('synced');
      console.log('User synced successfully:', freshUser);
    } catch (error) {
      console.error('Failed to sync user profile:', error);
      setError(error);
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
        const refreshedUser = await apiService.user.getProfile();
        setUser({
          ...refreshedUser,
          auth0User: auth0User
        });
        console.log('User refreshed successfully:', refreshedUser);
      } catch (error) {
        console.error('Failed to refresh user:', error);
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
