import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Paper,
  Chip
} from '@mui/material';
import { useApi, useUserProfile, useUserStats } from '../hooks/useApi';
import { useAuth0 } from '@auth0/auth0-react';

const ApiTest = () => {
  const { isAuthenticated } = useAuth0();
  const { api, isApiReady } = useApi();
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Use the hooks for automatic data fetching
  const { data: userProfile, loading: profileLoading, error: profileError } = useUserProfile();
  const { data: userStats, loading: statsLoading, error: statsError } = useUserStats();

  const runApiTests = async () => {
    setLoading(true);
    setTestResults([]);
    const results = [];

    // Test 1: Health Check
    try {
      const response = await api.health();
      results.push({
        test: 'Health Check',
        status: 'success',
        message: 'API is healthy',
        data: response.data
      });
    } catch (error) {
      results.push({
        test: 'Health Check',
        status: 'error',
        message: error.message,
        data: null
      });
    }

    // Test 2: Auth Test (if authenticated)
    if (isAuthenticated && isApiReady) {
      try {
        const response = await api.authTest();
        results.push({
          test: 'Authentication Test',
          status: 'success',
          message: 'Authentication successful',
          data: response.data
        });
      } catch (error) {
        results.push({
          test: 'Authentication Test',
          status: 'error',
          message: error.response?.data?.message || error.message,
          data: null
        });
      }

      // Test 3: User Profile
      try {
        const response = await api.user.getProfile();
        results.push({
          test: 'User Profile',
          status: 'success',
          message: 'Profile retrieved successfully',
          data: response.data
        });
      } catch (error) {
        results.push({
          test: 'User Profile',
          status: 'error',
          message: error.response?.data?.message || error.message,
          data: null
        });
      }
    }

    setTestResults(results);
    setLoading(false);
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        MongoDB API Test
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        Test the connection to your MongoDB + Express backend
      </Typography>

      {/* Status Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Authentication Status
              </Typography>
              <Chip 
                label={isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
                color={isAuthenticated ? 'success' : 'default'}
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                API Status
              </Typography>
              <Chip 
                label={isApiReady ? 'Ready' : 'Not Ready'}
                color={isApiReady ? 'success' : 'default'}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Backend URL
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                {import.meta.env.VITE_API_BASE_URL}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Test Button */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Manual API Tests
          </Typography>
          <Button
            variant="contained"
            onClick={runApiTests}
            disabled={loading}
            sx={{ mr: 2 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Run API Tests'}
          </Button>
        </CardContent>
      </Card>

      {/* Automatic Data Display */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                User Profile (Auto-loaded)
              </Typography>
              {profileLoading && <CircularProgress size={24} />}
              {profileError && (
                <Alert severity="error">
                  Error: {profileError.message}
                </Alert>
              )}
              {userProfile && (
                <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                  <pre style={{ fontSize: '0.8rem', margin: 0 }}>
                    {JSON.stringify(userProfile, null, 2)}
                  </pre>
                </Paper>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                User Stats (Auto-loaded)
              </Typography>
              {statsLoading && <CircularProgress size={24} />}
              {statsError && (
                <Alert severity="error">
                  Error: {statsError.message}
                </Alert>
              )}
              {userStats && (
                <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                  <pre style={{ fontSize: '0.8rem', margin: 0 }}>
                    {JSON.stringify(userStats, null, 2)}
                  </pre>
                </Paper>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Manual Test Results
            </Typography>
            {testResults.map((result, index) => (
              <Alert 
                key={index}
                severity={result.status === 'success' ? 'success' : 'error'}
                sx={{ mb: 2 }}
              >
                <Typography variant="subtitle2">
                  {result.test}
                </Typography>
                <Typography variant="body2">
                  {result.message}
                </Typography>
                {result.data && (
                  <Paper sx={{ p: 1, mt: 1, bgcolor: 'rgba(255,255,255,0.1)' }}>
                    <pre style={{ fontSize: '0.7rem', margin: 0 }}>
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </Paper>
                )}
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card sx={{ mt: 3, bgcolor: '#e3f2fd' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Setup Instructions
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>1. Start MongoDB:</strong> Make sure MongoDB is running locally or configure MongoDB Atlas
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>2. Start Backend:</strong> Run <code>npm run dev</code> in the server directory
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>3. Configure Auth0:</strong> Update AUTH0_AUDIENCE in server/.env to match client
          </Typography>
          <Typography variant="body2">
            <strong>4. Test:</strong> Login with Auth0 and run the API tests above
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ApiTest;
