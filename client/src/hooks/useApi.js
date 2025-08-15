import { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { apiService, setAuthToken, handleApiError } from '../services/api';

export const useApi = () => {
  const { getAccessTokenSilently, isAuthenticated, isLoading } = useAuth0();
  const [isApiReady, setIsApiReady] = useState(false);

  // Set up API token when user is authenticated
  useEffect(() => {
    const setupApiToken = async () => {
      if (isAuthenticated && !isLoading) {
        try {
          const token = await getAccessTokenSilently({
            authorizationParams: {
              audience: import.meta.env.VITE_AUTH0_AUDIENCE,
            },
          });
          
          setAuthToken(token);
          setIsApiReady(true);
          console.log('API token set successfully');
        } catch (error) {
          console.error('Error getting access token:', error);
          setIsApiReady(false);
        }
      } else if (!isAuthenticated) {
        setAuthToken(null);
        setIsApiReady(false);
      }
    };

    setupApiToken();
  }, [isAuthenticated, isLoading, getAccessTokenSilently]);

  return {
    api: apiService,
    isApiReady,
    handleApiError
  };
};

// Hook for API calls with loading and error states
export const useApiCall = (apiFunction, dependencies = []) => {
  const [data, setData] = useState(null);
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
  return useApiCall(() => api.user.getStats());
};

export const useUsers = (params = {}) => {
  const { api } = useApi();
  return useApiCall(() => api.user.getAll(params), [JSON.stringify(params)]);
};

export const useCourses = (params = {}) => {
  const { api } = useApi();
  return useApiCall(() => api.courses.getAll(params), [JSON.stringify(params)]);
};

export const useHomework = (params = {}) => {
  const { api } = useApi();
  return useApiCall(() => api.homework.getAll(params), [JSON.stringify(params)]);
};

export const useUpcomingHomework = (days = 7) => {
  const { api } = useApi();
  return useApiCall(() => api.homework.getUpcoming(days), [days]);
};

export const useStudyProgress = (studentId) => {
  const { api } = useApi();
  return useApiCall(() => api.studyProgress.getByStudent(studentId), [studentId]);
};

export default useApi;
