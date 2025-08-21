import { useState, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { apiService, setTokenProvider, handleApiError } from '../services/api';

export const useApi = () => {
  const { getAccessTokenSilently, isAuthenticated, isLoading } = useAuth0();

  // The API is considered "ready" when Auth0 is not loading and the user is authenticated.
  const isApiReady = !isLoading && isAuthenticated;

  // Set up the token provider when the auth state changes
  useEffect(() => {
    if (isAuthenticated) {
      const getToken = async () => {
        try {
          return await getAccessTokenSilently({
            authorizationParams: {
              audience: import.meta.env.VITE_AUTH0_AUDIENCE,
            },
          });
        } catch (error) {
          console.error('Error getting access token:', error);
          return null;
        }
      };
      setTokenProvider(getToken);
    } else {
      setTokenProvider(null); // Clear the token provider for logged-out users
    }
  }, [isAuthenticated, getAccessTokenSilently]);

  return {
    api: apiService,
    isApiReady,
    handleApiError
  };
};

// Hook for API calls with loading and error states
export const useApiCall = (apiFunction, dependencies = [], initialData = null) => {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isApiReady } = useApi();

  useEffect(() => {
    const fetchData = async () => {
      if (!isApiReady) return;

      try {
        setLoading(true);
        setError(null);
        const response = await apiFunction();
        setData(response.data);
      } catch (err) {
        const errorInfo = handleApiError(err);
        setError(errorInfo);
        console.error('API call failed:', errorInfo);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isApiReady, ...dependencies]);

  const refetch = async () => {
    if (!isApiReady) return;

    try {
      setLoading(true);
      setError(null);
      const response = await apiFunction();
      setData(response.data);
      return response.data;
    } catch (err) {
      const errorInfo = handleApiError(err);
      setError(errorInfo);
      throw errorInfo;
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refetch };
};

// Hook for mutations (POST, PUT, DELETE)
export const useApiMutation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isApiReady } = useApi();

  const mutate = async (apiFunction, ...args) => {
    if (!isApiReady) {
      throw new Error('API not ready');
    }

    try {
      setLoading(true);
      setError(null);
      const response = await apiFunction(...args);
      return response.data;
    } catch (err) {
      const errorInfo = handleApiError(err);
      setError(errorInfo);
      throw errorInfo;
    } finally {
      setLoading(false);
    }
  };

  return { mutate, loading, error };
};

// Specific hooks for common API calls
export const useUserProfile = () => {
  const { api } = useApi();
  return useApiCall(() => api.user.getProfile());
};

export const useUserStats = () => {
  const { api } = useApi();
  const initialStats = { total_users: 0, verified_users: 0, roles: { students: 0, lecturers: 0, admins: 0 } };
  return useApiCall(() => api.user.getStats(), [], initialStats);
};

export const useUsers = (params = {}) => {
  const { api } = useApi();
  const initialData = { users: [], pagination: {} };
  return useApiCall(() => api.user.getAll(params), [JSON.stringify(params)], initialData);
};

export const useCourses = (params = {}) => {
  const { api } = useApi();
  return useApiCall(() => api.courses.getAll(params), [JSON.stringify(params)], []);
};

export const useHomework = (params = {}) => {
  const { api } = useApi();
  return useApiCall(() => api.homework.getAll(params), [JSON.stringify(params)], []);
};

export const useUpcomingHomework = (days = 7) => {
  const { api } = useApi();
  return useApiCall(() => api.homework.getUpcoming(days), [days], []);
};

export const useStudyProgress = (studentId) => {
  const { api } = useApi();
  return useApiCall(() => api.studyProgress.getByStudent(studentId), [studentId], []);
};

export default useApi;
