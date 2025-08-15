import React, { useState } from 'react';
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
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useAuth0 } from '@auth0/auth0-react';

const Auth0ConfigTester = () => {
  const { 
    user, 
    isAuthenticated, 
    isLoading, 
    error,
    getAccessTokenSilently,
    loginWithRedirect
  } = useAuth0();
  
  const [tests, setTests] = useState([]);
  const [testing, setTesting] = useState(false);

  // Auto-run tests on component mount
  React.useEffect(() => {
    runConfigTests();
  }, []);

  const runConfigTests = async () => {
    setTesting(true);
    const testResults = [];

    // Test 1: Check environment variables
    testResults.push({
      name: 'Environment Variables',
      status: (import.meta.env.VITE_AUTH0_DOMAIN && 
               import.meta.env.VITE_AUTH0_CLIENT_ID && 
               import.meta.env.VITE_AUTH0_AUDIENCE) ? 'pass' : 'fail',
      details: {
        domain: import.meta.env.VITE_AUTH0_DOMAIN || 'MISSING',
        clientId: import.meta.env.VITE_AUTH0_CLIENT_ID || 'MISSING',
        audience: import.meta.env.VITE_AUTH0_AUDIENCE || 'MISSING',
        redirectUri: import.meta.env.VITE_AUTH0_REDIRECT_URI || 'MISSING'
      }
    });

    // Test 2: Check Auth0 domain accessibility
    try {
      const response = await fetch(`https://${import.meta.env.VITE_AUTH0_DOMAIN}/.well-known/jwks.json`);
      testResults.push({
        name: 'Auth0 Domain Accessibility',
        status: response.ok ? 'pass' : 'fail',
        details: `Status: ${response.status} ${response.statusText}`
      });
    } catch (error) {
      testResults.push({
        name: 'Auth0 Domain Accessibility',
        status: 'fail',
        details: `Error: ${error.message}`
      });
    }

    // Test 3: Check backend server
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/health`);
      if (response.ok) {
        const data = await response.json();
        testResults.push({
          name: 'Backend Server',
          status: 'pass',
          details: `Server running: ${data.status} at ${import.meta.env.VITE_API_BASE_URL}`
        });
      } else {
        testResults.push({
          name: 'Backend Server',
          status: 'fail',
          details: `Server error: ${response.status} ${response.statusText}`
        });
      }
    } catch (error) {
      testResults.push({
        name: 'Backend Server',
        status: 'fail',
        details: `Cannot connect to backend: ${error.message}. Make sure server is running on port 5000.`
      });
    }

    // Test 4: Check if user is authenticated
    testResults.push({
      name: 'Authentication Status',
      status: isAuthenticated ? 'pass' : 'warning',
      details: isAuthenticated ? 'User is authenticated' : 'User not authenticated (login required for token tests)'
    });

    // Test 5: Try to get access token (if authenticated)
    if (isAuthenticated) {
      try {
        const token = await getAccessTokenSilently({
          authorizationParams: {
            audience: import.meta.env.VITE_AUTH0_AUDIENCE,
          },
        });
        
        // Decode token payload for inspection
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        testResults.push({
          name: 'Access Token Generation',
          status: 'pass',
          details: {
            tokenLength: token.length,
            audience: payload.aud,
            issuer: payload.iss,
            expiry: new Date(payload.exp * 1000).toLocaleString(),
            scopes: payload.scope?.split(' ') || []
          }
        });

        // Test 6: Validate token audience
        testResults.push({
          name: 'Token Audience Validation',
          status: payload.aud === import.meta.env.VITE_AUTH0_AUDIENCE ? 'pass' : 'fail',
          details: {
            expected: import.meta.env.VITE_AUTH0_AUDIENCE,
            actual: payload.aud,
            match: payload.aud === import.meta.env.VITE_AUTH0_AUDIENCE
          }
        });

      } catch (error) {
        testResults.push({
          name: 'Access Token Generation',
          status: 'fail',
          details: `Error: ${error.message}`
        });
      }
    }

    setTests(testResults);
    setTesting(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pass': return <CheckIcon sx={{ color: 'success.main' }} />;
      case 'fail': return <ErrorIcon sx={{ color: 'error.main' }} />;
      case 'warning': return <WarningIcon sx={{ color: 'warning.main' }} />;
      default: return <InfoIcon sx={{ color: 'info.main' }} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pass': return 'success';
      case 'fail': return 'error';
      case 'warning': return 'warning';
      default: return 'info';
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Auth0 Configuration Tester
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        Test your Auth0 configuration to identify token issues
      </Typography>

      {/* Success message for API addition */}
      <Alert severity="success" sx={{ mb: 3 }}>
        <Typography variant="subtitle2">✅ Auth0 API Added!</Typography>
        <Typography variant="body2">
          Great! You've added the API to Auth0. The tests below will verify everything is working correctly.
        </Typography>
      </Alert>

      {/* Test Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" gap={2} alignItems="center">
            <Button 
              variant="contained" 
              onClick={runConfigTests}
              disabled={testing}
            >
              {testing ? <CircularProgress size={20} /> : 'Run Configuration Tests'}
            </Button>
            
            {!isAuthenticated && (
              <Button 
                variant="outlined" 
                onClick={() => loginWithRedirect()}
              >
                Login to Test Tokens
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Auth0 Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle2">Auth0 Error:</Typography>
          <Typography variant="body2">{error.message}</Typography>
        </Alert>
      )}

      {/* Test Results */}
      {tests.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Test Results
            </Typography>
            
            {tests.map((test, index) => (
              <Accordion key={index} sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box display="flex" alignItems="center" gap={2} width="100%">
                    {getStatusIcon(test.status)}
                    <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                      {test.name}
                    </Typography>
                    <Chip 
                      label={test.status.toUpperCase()} 
                      color={getStatusColor(test.status)}
                      size="small"
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <pre style={{ 
                    fontSize: '0.8rem', 
                    overflow: 'auto',
                    backgroundColor: '#f5f5f5',
                    padding: '8px',
                    borderRadius: '4px'
                  }}>
                    {typeof test.details === 'object' 
                      ? JSON.stringify(test.details, null, 2)
                      : test.details
                    }
                  </pre>
                </AccordionDetails>
              </Accordion>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Setup Instructions */}
      <Card sx={{ bgcolor: '#fff3e0' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Auth0 Setup Checklist
          </Typography>
          
          <List dense>
            <ListItem>
              <ListItemIcon>
                <InfoIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Create Auth0 API"
                secondary={`Go to Auth0 Dashboard → APIs → Create API with identifier: ${import.meta.env.VITE_AUTH0_AUDIENCE}`}
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <InfoIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Configure Application URLs"
                secondary="Set Callback URLs, Logout URLs, and CORS origins to http://localhost:5173"
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <InfoIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Enable API Access"
                secondary="In your Auth0 Application settings, make sure the API is authorized"
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <InfoIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Check Environment Variables"
                secondary="Ensure all VITE_AUTH0_* variables are set correctly in .env"
              />
            </ListItem>
          </List>

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="subtitle2">Quick Fix:</Typography>
            <Typography variant="body2">
              If tests fail, the most common issue is missing the API in Auth0 Dashboard. 
              Create an API with identifier <code>{import.meta.env.VITE_AUTH0_AUDIENCE}</code>
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Auth0ConfigTester;
