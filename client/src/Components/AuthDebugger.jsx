import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Divider
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useAuth0 } from '@auth0/auth0-react';

const AuthDebugger = () => {
  const { 
    user, 
    isAuthenticated, 
    isLoading, 
    error,
    getAccessTokenSilently,
    loginWithRedirect,
    logout
  } = useAuth0();
  
  const [tokenInfo, setTokenInfo] = useState(null);
  const [tokenError, setTokenError] = useState(null);
  const [apiTest, setApiTest] = useState({ loading: false, result: null, error: null });

  // Get token information
  const getTokenInfo = async () => {
    if (!isAuthenticated) return;

    try {
      setTokenError(null);
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        },
      });

      // Decode JWT payload (just for debugging - don't do this in production)
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      setTokenInfo({
        token: token.substring(0, 50) + '...',
        fullToken: token,
        payload,
        audience: payload.aud,
        issuer: payload.iss,
        subject: payload.sub,
        expiry: new Date(payload.exp * 1000).toLocaleString(),
        scopes: payload.scope?.split(' ') || [],
        roles: payload['https://my-app.com/roles'] || []
      });
    } catch (error) {
      console.error('Token error:', error);
      setTokenError(error.message);
    }
  };

  // Test API with token
  const testApiWithToken = async () => {
    setApiTest({ loading: true, result: null, error: null });

    try {
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        },
      });

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth-test`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setApiTest({ loading: false, result: data, error: null });
      } else {
        const errorData = await response.text();
        setApiTest({ 
          loading: false, 
          result: null, 
          error: `${response.status}: ${errorData}` 
        });
      }
    } catch (error) {
      setApiTest({ 
        loading: false, 
        result: null, 
        error: error.message 
      });
    }
  };

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      getTokenInfo();
    }
  }, [isAuthenticated, isLoading]);

  const getStatusIcon = (condition) => {
    if (condition === true) return <CheckIcon sx={{ color: 'success.main' }} />;
    if (condition === false) return <ErrorIcon sx={{ color: 'error.main' }} />;
    return <WarningIcon sx={{ color: 'warning.main' }} />;
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Authentication Debugger
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        Debug Auth0 authentication and API connection issues
      </Typography>

      {/* Authentication Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Authentication Status
          </Typography>
          
          <Box display="flex" gap={2} flexWrap="wrap" mb={2}>
            <Chip 
              icon={getStatusIcon(isAuthenticated)}
              label={`Authenticated: ${isAuthenticated ? 'Yes' : 'No'}`}
              color={isAuthenticated ? 'success' : 'error'}
            />
            <Chip 
              icon={getStatusIcon(!isLoading)}
              label={`Loading: ${isLoading ? 'Yes' : 'No'}`}
              color={isLoading ? 'warning' : 'success'}
            />
            <Chip 
              icon={getStatusIcon(!error)}
              label={`Error: ${error ? 'Yes' : 'No'}`}
              color={error ? 'error' : 'success'}
            />
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="subtitle2">Auth0 Error:</Typography>
              <Typography variant="body2">{error.message}</Typography>
            </Alert>
          )}

          <Box display="flex" gap={2}>
            {!isAuthenticated ? (
              <Button 
                variant="contained" 
                onClick={() => loginWithRedirect()}
                disabled={isLoading}
              >
                Login to Test
              </Button>
            ) : (
              <Button 
                variant="outlined" 
                onClick={() => logout({ returnTo: window.location.origin })}
              >
                Logout
              </Button>
            )}
            
            {isAuthenticated && (
              <Button 
                variant="outlined" 
                onClick={getTokenInfo}
                disabled={isLoading}
              >
                Refresh Token Info
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* User Information */}
      {isAuthenticated && user && (
        <Accordion sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">User Information</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <pre style={{ fontSize: '0.8rem', overflow: 'auto' }}>
              {JSON.stringify(user, null, 2)}
            </pre>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Token Information */}
      {tokenInfo && (
        <Accordion sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">JWT Token Information</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box>
              <Typography variant="subtitle2" gutterBottom>Token Preview:</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 2 }}>
                {tokenInfo.token}
              </Typography>
              
              <Typography variant="subtitle2" gutterBottom>Token Details:</Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2"><strong>Audience:</strong> {tokenInfo.audience}</Typography>
                <Typography variant="body2"><strong>Issuer:</strong> {tokenInfo.issuer}</Typography>
                <Typography variant="body2"><strong>Subject:</strong> {tokenInfo.subject}</Typography>
                <Typography variant="body2"><strong>Expires:</strong> {tokenInfo.expiry}</Typography>
                <Typography variant="body2"><strong>Scopes:</strong> {tokenInfo.scopes.join(', ')}</Typography>
                <Typography variant="body2"><strong>Roles:</strong> {tokenInfo.roles.join(', ') || 'None'}</Typography>
              </Box>

              <Typography variant="subtitle2" gutterBottom>Full Payload:</Typography>
              <pre style={{ fontSize: '0.7rem', overflow: 'auto', backgroundColor: '#f5f5f5', padding: '8px' }}>
                {JSON.stringify(tokenInfo.payload, null, 2)}
              </pre>
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {tokenError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="subtitle2">Token Error:</Typography>
          <Typography variant="body2">{tokenError}</Typography>
        </Alert>
      )}

      {/* API Test */}
      {isAuthenticated && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              API Authentication Test
            </Typography>
            
            <Button 
              variant="contained" 
              onClick={testApiWithToken}
              disabled={apiTest.loading}
              sx={{ mb: 2 }}
            >
              {apiTest.loading ? <CircularProgress size={20} /> : 'Test API Authentication'}
            </Button>

            {apiTest.result && (
              <Alert severity="success">
                <Typography variant="subtitle2">API Test Successful!</Typography>
                <pre style={{ fontSize: '0.8rem', marginTop: '8px' }}>
                  {JSON.stringify(apiTest.result, null, 2)}
                </pre>
              </Alert>
            )}

            {apiTest.error && (
              <Alert severity="error">
                <Typography variant="subtitle2">API Test Failed:</Typography>
                <Typography variant="body2">{apiTest.error}</Typography>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Configuration Check */}
      <Card sx={{ bgcolor: '#f8f9fa' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Configuration Check
          </Typography>
          
          <Typography variant="body2" paragraph>
            <strong>Frontend Config:</strong>
          </Typography>
          <Box sx={{ fontFamily: 'monospace', fontSize: '0.8rem', mb: 2 }}>
            <div>Domain: {import.meta.env.VITE_AUTH0_DOMAIN}</div>
            <div>Client ID: {import.meta.env.VITE_AUTH0_CLIENT_ID}</div>
            <div>Audience: {import.meta.env.VITE_AUTH0_AUDIENCE}</div>
            <div>Redirect URI: {import.meta.env.VITE_AUTH0_REDIRECT_URI}</div>
            <div>API Base URL: {import.meta.env.VITE_API_BASE_URL}</div>
          </Box>

          <Typography variant="body2" paragraph>
            <strong>Expected Backend Config:</strong>
          </Typography>
          <Box sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
            <div>AUTH0_DOMAIN: {import.meta.env.VITE_AUTH0_DOMAIN}</div>
            <div>AUTH0_AUDIENCE: {import.meta.env.VITE_AUTH0_AUDIENCE}</div>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AuthDebugger;
