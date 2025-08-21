import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { isLoading } = useAuth0();
  const { isAuthenticated, userRole, hasRequiredRole } = useAuth();

  // Show loading spinner while Auth0 is checking authentication
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
        <Typography variant="h6">Loading...</Typography>
      </Box>
    );
  }

  // Check if user is authenticated
  if (!isAuthenticated) {
    return <Navigate to="/auth0-login" replace />;
  }

  // Check if user has any role assigned
  if (!userRole) {
    return <Navigate to="/role-pending" replace />;
  }

  // If a specific role is required, check if the user has it
  if (!hasRequiredRole(requiredRole)) {
    // If not, redirect to the user's own dashboard
    return <Navigate to={`/${userRole}/dashboard`} replace />;
  }

  return children;
};

export default ProtectedRoute;
