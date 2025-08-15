import React from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Typography,
  Chip,
  Card,
  CardContent
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Sync as SyncIcon
} from '@mui/icons-material';
import { useAuth0 } from '@auth0/auth0-react';
import { useUserSync } from '../hooks/useUserSync';

const UserSyncStatus = ({ showDetails = false }) => {
  const { user, isAuthenticated } = useAuth0();
  const { syncStatus, retrySync, isReady } = useUserSync();

  if (!isAuthenticated) {
    return null;
  }

  // Compact status indicator
  if (!showDetails) {
    return (
      <Box display="flex" alignItems="center" gap={1}>
        {syncStatus.syncing && (
          <>
            <CircularProgress size={16} />
            <Typography variant="caption" color="textSecondary">
              Syncing...
            </Typography>
          </>
        )}
        
        {syncStatus.synced && (
          <>
            <CheckIcon sx={{ fontSize: 16, color: 'success.main' }} />
            <Typography variant="caption" color="success.main">
              Connected
            </Typography>
          </>
        )}
        
        {syncStatus.error && (
          <>
            <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />
            <Typography variant="caption" color="error.main">
              Sync Error
            </Typography>
          </>
        )}
      </Box>
    );
  }

  // Detailed status display
  return (
    <Box>
      {/* Syncing Status */}
      {syncStatus.syncing && (
        <Alert 
          severity="info" 
          icon={<CircularProgress size={20} />}
          sx={{ mb: 2 }}
        >
          <Typography variant="subtitle2">Setting up your profile...</Typography>
          <Typography variant="body2">
            Connecting your Auth0 account to the database
          </Typography>
        </Alert>
      )}

      {/* Success Status */}
      {syncStatus.synced && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="subtitle2">Profile Connected ✓</Typography>
              <Typography variant="body2">
                Your account is synced with the database
              </Typography>
            </Box>
            <Chip 
              label="Ready" 
              color="success" 
              size="small"
              icon={<CheckIcon />}
            />
          </Box>
        </Alert>
      )}

      {/* Error Status */}
      {syncStatus.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="subtitle2">Profile Sync Failed</Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {syncStatus.error}
          </Typography>
          <Button 
            size="small" 
            variant="outlined" 
            onClick={retrySync}
            startIcon={<SyncIcon />}
          >
            Retry Sync
          </Button>
        </Alert>
      )}

      {/* User Profile Details (when synced) */}
      {syncStatus.synced && syncStatus.userProfile && (
        <Card sx={{ mt: 2, bgcolor: '#f8f9fa' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Profile Information
            </Typography>
            <Box display="flex" flexDirection="column" gap={1}>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="textSecondary">Name:</Typography>
                <Typography variant="body2">{syncStatus.userProfile.name}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="textSecondary">Email:</Typography>
                <Typography variant="body2">{syncStatus.userProfile.email}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="textSecondary">Role:</Typography>
                <Chip 
                  label={syncStatus.userProfile.role} 
                  size="small"
                  color={
                    syncStatus.userProfile.role === 'admin' ? 'error' :
                    syncStatus.userProfile.role === 'lecturer' ? 'warning' : 'success'
                  }
                />
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="textSecondary">Database ID:</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  {syncStatus.userProfile._id}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="textSecondary">Last Login:</Typography>
                <Typography variant="body2">
                  {new Date(syncStatus.userProfile.last_login).toLocaleString()}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Debug Information */}
      {process.env.NODE_ENV === 'development' && (
        <Card sx={{ mt: 2, bgcolor: '#fff3e0' }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              Debug Information
            </Typography>
            <Typography variant="caption" display="block">
              Auth0 User ID: {user?.sub}
            </Typography>
            <Typography variant="caption" display="block">
              Auth0 Email: {user?.email}
            </Typography>
            <Typography variant="caption" display="block">
              Sync Status: {JSON.stringify({
                syncing: syncStatus.syncing,
                synced: syncStatus.synced,
                hasError: !!syncStatus.error
              })}
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default UserSyncStatus;
