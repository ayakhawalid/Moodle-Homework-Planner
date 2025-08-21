import React from 'react';
import { Alert, Button, Box } from '@mui/material';
import { useAuth } from '../hooks/useAuth';

const PermissionError = ({ error, onRetry }) => {
  const { login } = useAuth();

  const handleLogin = () => {
    login({
      appState: { returnTo: window.location.pathname }
    });
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600, margin: '0 auto' }}>
      <Alert 
        severity="error" 
        sx={{ mb: 2 }}
        action={
          <Button color="inherit" size="small" onClick={onRetry}>
            Retry
          </Button>
        }
      >
        <strong>Access Denied</strong>
        <br />
        {error?.message || 'You do not have permission to access this resource.'}
      </Alert>
      
      <Box sx={{ textAlign: 'center', mt: 2 }}>
        <Button 
          variant="contained" 
          onClick={handleLogin}
          sx={{ mr: 1 }}
        >
          Login Again
        </Button>
        <Button 
          variant="outlined" 
          onClick={() => window.location.href = '/'}
        >
          Go Home
        </Button>
      </Box>
    </Box>
  );
};

export default PermissionError;
