import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  Typography, 
  CircularProgress,
  Alert
} from '@mui/material';
import { Login as LoginIcon } from '@mui/icons-material';
import '../styles/Login.css';

const Auth0Login = () => {
  const { loginWithRedirect, isLoading, error, isAuthenticated } = useAuth0();

  const handleLogin = () => {
    loginWithRedirect({
      authorizationParams: {
        screen_hint: 'login'
      }
    });
  };

  const handleSignup = () => {
    loginWithRedirect({
      authorizationParams: {
        screen_hint: 'signup'
      }
    });
  };

  if (isLoading) {
    return (
      <div className="login-container">
        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
          <CircularProgress />
          <Typography>Loading...</Typography>
        </Box>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="login-container">
        <Typography variant="h6">You are already logged in. Redirecting...</Typography>
      </div>
    );
  }

  return (
    <div className="login-container">
      <Card className="login-form" sx={{ maxWidth: 400, width: '100%', borderRadius: 3, boxShadow: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Box textAlign="center" mb={3}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#333' }}>
              Welcome
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Sign in to access your dashboard
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error.message}
            </Alert>
          )}

          <Box display="flex" flexDirection="column" gap={2}>
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleLogin}
              startIcon={<LoginIcon />}
              sx={{
                backgroundColor: '#1976d2',
                '&:hover': {
                  backgroundColor: '#1565c0',
                },
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 'bold'
              }}
            >
              Sign In
            </Button>

            <Button
              variant="outlined"
              size="large"
              fullWidth
              onClick={handleSignup}
              sx={{
                borderColor: '#1976d2',
                color: '#1976d2',
                '&:hover': {
                  borderColor: '#1565c0',
                  backgroundColor: 'rgba(25, 118, 210, 0.04)',
                },
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 'bold'
              }}
            >
              Sign Up
            </Button>
          </Box>

          <Box mt={3} textAlign="center">
            <Typography variant="body2" color="textSecondary">
              Secure authentication powered by Auth0
            </Typography>
          </Box>

          {/* Demo credentials info */}
          <Box mt={3} p={2} sx={{ backgroundColor: '#f5f5f5', borderRadius: 2 }}>
            <Typography variant="caption" display="block" gutterBottom sx={{ fontWeight: 'bold' }}>
              Demo Access:
            </Typography>
            <Typography variant="caption" display="block" sx={{ mb: 1 }}>
              Use the Sign Up button to create a new account, or contact your administrator for access.
            </Typography>
            <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
              <a href="/auth0-debug" style={{ color: '#1976d2', textDecoration: 'none' }}>
                🔧 Debug Auth0 Integration
              </a>
            </Typography>
            <Typography variant="caption" display="block">
              <a href="/auth0-config" style={{ color: '#1976d2', textDecoration: 'none' }}>
                ⚙️ Check Auth0 Configuration
              </a>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth0Login;
