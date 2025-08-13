import React, { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '../hooks/useAuth';

const Callback = () => {
  const { isLoading, error, user, isAuthenticated } = useAuth0();
  const { redirectToDashboard, userRole, userRoles } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      console.log('Auth0 callback - User authenticated:', user);
      console.log('User roles from custom claims:', user['https://my-app.com/roles']);

      // Small delay to ensure the useAuth hook has processed the user data
      setTimeout(() => {
        console.log('Redirecting user with role:', userRole);
        console.log('All user roles:', userRoles);
        redirectToDashboard();
      }, 100);
    }
  }, [isLoading, isAuthenticated, user, redirectToDashboard, userRole, userRoles]);



  if (isLoading) {
    return (
      <Box 
        display="flex" 
        flexDirection="column" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        gap={2}
      >
        <CircularProgress size={60} />
        <Typography variant="h6">Authenticating...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box 
        display="flex" 
        flexDirection="column" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        gap={2}
      >
        <Typography variant="h5" color="error">
          Authentication Error
        </Typography>
        <Typography variant="body1">
          {error.message}
        </Typography>
      </Box>
    );
  }

  return (
    <Box 
      display="flex" 
      justifyContent="center" 
      alignItems="center" 
      minHeight="100vh"
    >
      <Typography variant="h6">Redirecting...</Typography>
    </Box>
  );
};

export default Callback;
