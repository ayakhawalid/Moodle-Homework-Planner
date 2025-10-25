import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  Chip,
  Button,
  CircularProgress
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

const BackendStatus = () => {
  const [status, setStatus] = useState({
    backend: 'checking',
    mongodb: 'checking',
    auth: 'checking'
  });

  const { isAuthenticated, getAccessTokenSilently } = useAuth0();

  const checkBackendStatus = async () => {
    setStatus({
      backend: 'checking',
      mongodb: 'checking',
      auth: 'checking'
    });

    // Check backend health
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/health`);
      if (response.ok) {
        setStatus(prev => ({ ...prev, backend: 'connected' }));
      } else {
        setStatus(prev => ({ ...prev, backend: 'error' }));
      }
    } catch (error) {
      setStatus(prev => ({ ...prev, backend: 'error' }));
    }

    // Check MongoDB (through backend)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/health`);
      if (response.ok) {
        const data = await response.json();
        if (data.database === 'Connected') {
          setStatus(prev => ({ ...prev, mongodb: 'connected' }));
        } else {
          setStatus(prev => ({ ...prev, mongodb: 'error' }));
        }
      } else {
        setStatus(prev => ({ ...prev, mongodb: 'error' }));
      }
    } catch (error) {
      setStatus(prev => ({ ...prev, mongodb: 'error' }));
    }

    // Check Auth (use a fresh token, not localStorage)
    if (isAuthenticated) {
      try {
        const token = await getAccessTokenSilently({
          authorizationParams: {
            audience: import.meta.env.VITE_AUTH0_AUDIENCE || 'https://moodle-homework-planner.onrender.com/api'
          },
          ignoreCache: true // force fresh token for health check
        });

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth-test`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setStatus(prev => ({ ...prev, auth: response.ok ? 'connected' : 'error' }));
      } catch (error) {
        console.error('Auth check failed:', error);
        setStatus(prev => ({ ...prev, auth: 'error' }));
      }
    } else {
      setStatus(prev => ({ ...prev, auth: 'not-authenticated' }));
    }
  };

  useEffect(() => {
    checkBackendStatus();
  }, [isAuthenticated, getAccessTokenSilently]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected': return 'success';
      case 'error': return 'error';
      case 'checking': return 'info';
      case 'no_token': return 'warning';
      case 'not-authenticated': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected': return <CheckIcon />;
      case 'error': return <ErrorIcon />;
      case 'checking': return <CircularProgress size={16} />;
      case 'no_token': return <WarningIcon />;
      case 'not-authenticated': return <WarningIcon />;
      default: return null;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'connected': return 'Connected';
      case 'error': return 'Error';
      case 'checking': return 'Checking...';
      case 'no_token': return 'No Token';
      case 'not-authenticated': return 'Not Authenticated';
      default: return 'Unknown';
    }
  };

  const allConnected = status.backend === 'connected' && 
                      status.mongodb === 'connected' && 
                      (status.auth === 'connected' || status.auth === 'no_token' || status.auth === 'not-authenticated');

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            System Status
          </Typography>
          <Button 
            size="small" 
            onClick={checkBackendStatus}
            disabled={Object.values(status).some(s => s === 'checking')}
          >
            Refresh
          </Button>
        </Box>

        <Box display="flex" gap={2} flexWrap="wrap">
          <Chip
            icon={getStatusIcon(status.backend)}
            label={`Backend: ${getStatusText(status.backend)}`}
            color={getStatusColor(status.backend)}
            size="small"
          />
          <Chip
            icon={getStatusIcon(status.mongodb)}
            label={`MongoDB: ${getStatusText(status.mongodb)}`}
            color={getStatusColor(status.mongodb)}
            size="small"
          />
          <Chip
            icon={getStatusIcon(status.auth)}
            label={`Auth: ${getStatusText(status.auth)}`}
            color={getStatusColor(status.auth)}
            size="small"
          />
        </Box>

        {!allConnected && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="subtitle2">Setup Required</Typography>
            <Typography variant="body2">
              {status.backend !== 'connected' && '• Start the backend server (npm run dev in server folder)'}
              {status.mongodb !== 'connected' && '• Check MongoDB connection'}
              {status.auth === 'error' && '• Check Auth0 configuration'}
            </Typography>
          </Alert>
        )}

        {allConnected && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="subtitle2">All Systems Ready!</Typography>
            <Typography variant="body2">
              Your MERN application is fully connected and ready to use.
            </Typography>
          </Alert>
        )}

        <Box sx={{ mt: 2, fontSize: '0.8rem', color: 'text.secondary' }}>
          <Typography variant="caption" display="block">
            Backend URL: {import.meta.env.VITE_API_BASE_URL}
          </Typography>
          <Typography variant="caption" display="block">
            Auth0 Domain: {import.meta.env.VITE_AUTH0_DOMAIN}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default BackendStatus;
