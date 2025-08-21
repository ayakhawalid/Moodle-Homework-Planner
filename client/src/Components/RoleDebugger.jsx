import React, { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useUserSyncContext } from '../contexts/UserSyncContext';
import { Box, Typography, Button, Paper } from '@mui/material';

const RoleDebugger = () => {
  const { user: auth0User, getAccessTokenSilently } = useAuth0();
  const { user, syncStatus, refreshUser } = useUserSyncContext();

  const [tokenInfo, setTokenInfo] = React.useState(null);

  useEffect(() => {
    const decodeToken = async () => {
      if (auth0User) {
        try {
          const token = await getAccessTokenSilently();
          // Decode JWT token (basic decoding)
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          
          const decoded = JSON.parse(jsonPayload);
          setTokenInfo(decoded);
        } catch (error) {
          console.error('Error decoding token:', error);
        }
      }
    };

    decodeToken();
  }, [auth0User, getAccessTokenSilently]);

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Role Debug Information
      </Typography>
      
      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">Auth0 User Info:</Typography>
        <pre>{JSON.stringify(auth0User, null, 2)}</pre>
      </Paper>

      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">Backend User Info:</Typography>
        <pre>{JSON.stringify(user, null, 2)}</pre>
      </Paper>

      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">Token Claims:</Typography>
        <pre>{JSON.stringify(tokenInfo, null, 2)}</pre>
      </Paper>

      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">Role Check:</Typography>
        <Typography>isAdmin: {user?.role === 'admin' ? '✅ TRUE' : '❌ FALSE'}</Typography>
        <Typography>Current Role: {user?.role || 'undefined'}</Typography>
        <Typography>Sync Status: {syncStatus}</Typography>
      </Paper>

      <Button variant="contained" onClick={refreshUser}>
        Refresh User Data
      </Button>
    </Box>
  );
};

export default RoleDebugger;
