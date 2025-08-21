import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useUserSyncContext } from '../contexts/UserSyncContext';
import { Box, Typography, Button, Card, CardContent } from '@mui/material';

const AuthTest = () => {
  const { isAuthenticated, user: auth0User } = useAuth0();
  const { user, isAdmin, isLecturer, isStudent, syncStatus } = useUserSyncContext();

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Authentication Test
      </Typography>
      
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6">Auth0 Status</Typography>
          <Typography>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</Typography>
          <Typography>User: {auth0User?.email || 'None'}</Typography>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6">Database User Status</Typography>
          <Typography>Sync Status: {syncStatus}</Typography>
          <Typography>User: {user?.email || 'None'}</Typography>
          <Typography>Role: {user?.role || 'None'}</Typography>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6">Role Checks</Typography>
          <Typography>Is Admin: {isAdmin ? 'Yes' : 'No'}</Typography>
          <Typography>Is Lecturer: {isLecturer ? 'Yes' : 'No'}</Typography>
          <Typography>Is Student: {isStudent ? 'Yes' : 'No'}</Typography>
        </CardContent>
      </Card>

      <Button 
        variant="contained" 
        onClick={() => window.location.href = '/admin/dashboard'}
        disabled={!isAdmin}
      >
        Test Admin Access
      </Button>
    </Box>
  );
};

export default AuthTest;
