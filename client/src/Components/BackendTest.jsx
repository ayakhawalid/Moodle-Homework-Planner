import React, { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { apiService } from '../services/api';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Button,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';

const BackendTest = () => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});

  const testEndpoint = async (name, testFn) => {
    setLoading(prev => ({ ...prev, [name]: true }));
    try {
      const result = await testFn();
      setResults(prev => ({ 
        ...prev, 
        [name]: { 
          success: true, 
          data: result,
          error: null 
        } 
      }));
    } catch (error) {
      setResults(prev => ({ 
        ...prev, 
        [name]: { 
          success: false, 
          data: null,
          error: error.message || 'Unknown error'
        } 
      }));
    } finally {
      setLoading(prev => ({ ...prev, [name]: false }));
    }
  };

  const tests = [
    {
      name: 'health',
      label: 'Health Check',
      test: () => apiService.health()
    },
    {
      name: 'profile',
      label: 'Get Profile',
      test: () => apiService.user.getProfile(),
      requiresAuth: true
    },
    {
      name: 'users',
      label: 'Get All Users (Admin)',
      test: () => apiService.user.getAll(),
      requiresAuth: true
    },
    {
      name: 'stats',
      label: 'Get User Stats (Admin)',
      test: () => apiService.user.getStats(),
      requiresAuth: true
    }
  ];

  const runAllTests = async () => {
    for (const test of tests) {
      if (test.requiresAuth && !isAuthenticated) continue;
      await testEndpoint(test.name, test.test);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
      <Typography variant="h4" gutterBottom>
        🧪 Backend API Test
      </Typography>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Authentication Status
          </Typography>
          <Chip 
            label={`Authenticated: ${isAuthenticated}`} 
            color={isAuthenticated ? 'success' : 'error'} 
          />
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            API Tests
          </Typography>
          <Button 
            onClick={runAllTests} 
            variant="contained" 
            sx={{ mb: 2 }}
            disabled={Object.values(loading).some(Boolean)}
          >
            Run All Tests
          </Button>

          {tests.map((test) => (
            <Box key={test.name} sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Button
                  onClick={() => testEndpoint(test.name, test.test)}
                  variant="outlined"
                  size="small"
                  disabled={loading[test.name] || (test.requiresAuth && !isAuthenticated)}
                >
                  {loading[test.name] ? <CircularProgress size={16} /> : 'Test'}
                </Button>
                <Typography variant="subtitle1">
                  {test.label}
                </Typography>
                {test.requiresAuth && (
                  <Chip label="Requires Auth" size="small" />
                )}
              </Box>

              {results[test.name] && (
                <Alert 
                  severity={results[test.name].success ? 'success' : 'error'}
                  sx={{ mb: 1 }}
                >
                  <Typography variant="subtitle2">
                    {results[test.name].success ? 'Success' : 'Error'}
                  </Typography>
                  <Box sx={{ bgcolor: '#f5f5f5', p: 1, borderRadius: 1, mt: 1 }}>
                    <pre style={{ margin: 0, fontSize: '12px' }}>
                      {results[test.name].success 
                        ? JSON.stringify(results[test.name].data, null, 2)
                        : results[test.name].error
                      }
                    </pre>
                  </Box>
                </Alert>
              )}
            </Box>
          ))}
        </CardContent>
      </Card>

      <Card sx={{ bgcolor: '#e3f2fd' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            💡 What to Look For
          </Typography>
          <Typography variant="body2" paragraph>
            • <strong>Health Check:</strong> Should return server status
          </Typography>
          <Typography variant="body2" paragraph>
            • <strong>Get Profile:</strong> Should return your user profile from database
          </Typography>
          <Typography variant="body2" paragraph>
            • <strong>Get All Users:</strong> Should return 403 error if you're not admin
          </Typography>
          <Typography variant="body2" paragraph>
            • <strong>Get User Stats:</strong> Should return 403 error if you're not admin
          </Typography>
          <Typography variant="body2">
            If admin endpoints return 403, it means the role checking is working but you don't have admin role in Auth0.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default BackendTest;
