import React, { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';

const Callback = () => {
  const { isLoading, error, user, isAuthenticated } = useAuth0();
  const { redirectToDashboard, userRole, userRoles } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      console.log('Auth0 callback - User authenticated:', user);
      console.log('User roles from custom claims:', user['https://my-app.com/roles']);
      console.log('Current URL:', window.location.href);
      console.log('Callback component loaded successfully');

      (async () => {
        try {
          // Ensure user profile exists in our DB before proceeding
          await apiService.user.syncProfile({
            email: user.email,
            name: user.name,
            full_name: user.given_name || user.name,
            username: user.nickname || null,
            picture: user.picture,
            email_verified: user.email_verified
          });

          // If a preferred signup username exists, update profile once after signup/login
          const preferredUsername = localStorage.getItem('signup_username');
          if (preferredUsername) {
            await apiService.user.updateProfile({ username: preferredUsername });
            localStorage.removeItem('signup_username');
          } else if (user.nickname) {
            // If no preferred username, try to set Auth0 nickname as username
            await apiService.user.updateProfile({ username: user.nickname });
          }

          // If a signup role was selected, submit a role request
          // Only submit role request if this is actually a signup (not a regular login)
          const signupRole = localStorage.getItem('signup_role');
          const isSignupFlow = localStorage.getItem('is_signup_flow') === 'true';
          
          if (signupRole && isSignupFlow) {
            console.log('Submitting role request for signup:', signupRole);
            await apiService.roleRequests.submit(signupRole);
            localStorage.removeItem('signup_role');
            localStorage.removeItem('is_signup_flow');
          } else if (signupRole && !isSignupFlow) {
            // Clean up stale signup role from localStorage if this is not a signup flow
            console.log('Cleaning up stale signup role from regular login');
            localStorage.removeItem('signup_role');
          }

        } catch (e) {
          console.warn('Failed during post-signup processing (username/role request):', e);
        } finally {
          // Immediate redirect without delay
          console.log('Redirecting user with role:', userRole);
          console.log('All user roles:', userRoles);
          console.log('Current location:', window.location.href);
          redirectToDashboard();
        }
      })();
    }
  }, [isLoading, isAuthenticated, user, userRole, userRoles, redirectToDashboard]);

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
