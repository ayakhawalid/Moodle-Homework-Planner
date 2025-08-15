import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useAuth } from '../hooks/useAuth';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Button,
  Alert,
  Chip,
  Divider
} from '@mui/material';
import { 
  HourglassEmpty as PendingIcon,
  Refresh as RefreshIcon,
  ContactSupport as ContactIcon
} from '@mui/icons-material';

const RolePending = () => {
  const { user, logout } = useAuth0();
  const { userRole, userRoles, logout: authLogout } = useAuth();

  const handleRefresh = () => {
    // Refresh the page to check if roles have been assigned
    window.location.reload();
  };

  const handleLogout = () => {
    authLogout();
  };

  return (
    <Box 
      display="flex" 
      justifyContent="center" 
      alignItems="center" 
      minHeight="100vh"
      sx={{ backgroundColor: '#f5f5f5', p: 2 }}
    >
      <Card sx={{ maxWidth: 600, width: '100%' }}>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <PendingIcon sx={{ fontSize: 80, color: '#ff9800', mb: 2 }} />
          
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#333' }}>
            Account Setup Pending
          </Typography>
          
          <Typography variant="h6" color="textSecondary" paragraph>
            Welcome, {user?.name || user?.email?.split('@')[0] || user?.email}!
          </Typography>

          <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
            <Typography variant="body1" gutterBottom>
              <strong>Your account has been created successfully!</strong>
            </Typography>
            <Typography variant="body2">
              However, your role has not been assigned yet. An administrator needs to assign you a role 
              (Student, Lecturer, or Admin) before you can access the platform.
            </Typography>
          </Alert>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
              Account Information:
            </Typography>
            <Box display="flex" justifyContent="center" gap={1} mb={2}>
              <Chip label={`Email: ${user?.email}`} variant="outlined" />
              <Chip 
                label={userRoles.length > 0 ? `Roles: ${userRoles.join(', ')}` : 'No roles assigned'} 
                color={userRoles.length > 0 ? 'success' : 'warning'}
                variant="outlined"
              />
            </Box>
          </Box>

          <Divider sx={{ mb: 3 }} />

          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
            What happens next?
          </Typography>
          
          <Box sx={{ textAlign: 'left', mb: 3 }}>
            <Typography variant="body2" paragraph>
              1. <strong>Administrator Review:</strong> An administrator will review your account and assign the appropriate role.
            </Typography>
            <Typography variant="body2" paragraph>
              2. <strong>Role Assignment:</strong> You will be assigned one of these roles:
            </Typography>
            <Box sx={{ ml: 2, mb: 2 }}>
              <Typography variant="body2">• <strong>Student:</strong> Access to student dashboard and learning materials</Typography>
              <Typography variant="body2">• <strong>Lecturer:</strong> Access to teaching tools and course management</Typography>
              <Typography variant="body2">• <strong>Admin:</strong> Full system access and user management</Typography>
            </Box>
            <Typography variant="body2" paragraph>
              3. <strong>Access Granted:</strong> Once your role is assigned, you can log in again to access your dashboard.
            </Typography>
          </Box>

          <Box display="flex" gap={2} justifyContent="center" flexWrap="wrap">
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              sx={{ backgroundColor: '#1976d2' }}
            >
              Check Role Status
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<ContactIcon />}
              href="mailto:admin@yourcompany.com"
              sx={{ borderColor: '#1976d2', color: '#1976d2' }}
            >
              Contact Admin
            </Button>
            
            <Button
              variant="text"
              onClick={handleLogout}
              sx={{ color: '#666' }}
            >
              Logout
            </Button>
          </Box>

          <Box sx={{ mt: 3, p: 2, backgroundColor: '#f8f9fa', borderRadius: 2 }}>
            <Typography variant="caption" color="textSecondary">
              <strong>Note:</strong> This process ensures proper access control and security. 
              You will receive an email notification once your role has been assigned.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default RolePending;
