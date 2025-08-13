import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { isLoading } = useAuth0();
  const { isAuthenticated, userRole } = useAuth();

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

  // If a specific role is required, check it
  if (requiredRole && userRole !== requiredRole) {
    // Redirect to appropriate dashboard based on user's actual role
    switch (userRole) {
      case "student":
        return <Navigate to="/student/dashboard" replace />;
      case "lecturer":
        return <Navigate to="/lecturer/dashboard" replace />;
      case "admin":
        return <Navigate to="/admin/dashboard" replace />;
      default:
        return <Navigate to="/role-pending" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
