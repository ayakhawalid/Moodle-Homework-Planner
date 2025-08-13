import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useAuth, useAuth0Roles } from '../hooks/useAuth';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails,
  Chip,
  Alert
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';

const Auth0Debug = () => {
  const { isAuthenticated, user } = useAuth0();
  const { userRole, userRoles, auth0User } = useAuth();
  const auth0Roles = useAuth0Roles();

  if (!isAuthenticated) {
    return (
      <Alert severity="info">
        User is not authenticated with Auth0
      </Alert>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Auth0 Debug Information
      </Typography>

      {/* Current Role Status */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Current Role Status
          </Typography>
          <Box display="flex" gap={1} mb={2} flexWrap="wrap">
            {userRole ? (
              <Chip
                label={`Primary Role: ${userRole}`}
                color="success"
                variant="filled"
              />
            ) : (
              <Chip
                label="No Role Assigned"
                color="warning"
                variant="filled"
              />
            )}
            {userRoles.length > 1 && (
              <Chip
                label={`Additional Roles: ${userRoles.slice(1).join(', ')}`}
                color="secondary"
                variant="outlined"
              />
            )}
          </Box>
          <Typography variant="body2" color="textSecondary">
            Roles from custom claims: {userRoles.length > 0 ? JSON.stringify(userRoles) : 'No roles assigned'}
          </Typography>

          {!userRole && (
            <Alert severity="info" sx={{ mt: 2 }}>
              This user needs to have roles manually assigned in the Auth0 Dashboard under User Management → Users → [User] → Roles.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Auth0 Custom Claims */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">
            Auth0 Custom Claims
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              https://my-app.com/roles:
            </Typography>
            <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
              {JSON.stringify(user['https://my-app.com/roles'], null, 2)}
            </pre>
            
            {auth0Roles?.hasCustomRoles ? (
              <Alert severity="success" sx={{ mt: 2 }}>
                ✅ Custom roles found in ID token
              </Alert>
            ) : (
              <Alert severity="warning" sx={{ mt: 2 }}>
                ⚠️ No custom roles found. Make sure your Auth0 Post-Login Action is configured correctly.
              </Alert>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Full User Object */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">
            Full Auth0 User Object
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <pre style={{ 
            background: '#f5f5f5', 
            padding: '10px', 
            borderRadius: '4px',
            fontSize: '12px',
            overflow: 'auto',
            maxHeight: '400px'
          }}>
            {JSON.stringify(user, null, 2)}
          </pre>
        </AccordionDetails>
      </Accordion>

      {/* localStorage Data */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">
            localStorage Data
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            <Typography variant="subtitle2">Token:</Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {localStorage.getItem('token') || 'Not set'}
            </Typography>
            
            <Typography variant="subtitle2">Role:</Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {localStorage.getItem('role') || 'Not set'}
            </Typography>
            
            <Typography variant="subtitle2">User Data:</Typography>
            <pre style={{ 
              background: '#f5f5f5', 
              padding: '10px', 
              borderRadius: '4px',
              fontSize: '12px'
            }}>
              {localStorage.getItem('user') || 'Not set'}
            </pre>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Setup Instructions */}
      <Card sx={{ mt: 2, bgcolor: '#f8f9fa' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Auth0 Post-Login Action Setup
          </Typography>
          <Typography variant="body2" paragraph>
            Make sure you have created a Post-Login Action in Auth0 with this code:
          </Typography>
          <pre style={{ 
            background: '#e9ecef', 
            padding: '15px', 
            borderRadius: '4px',
            fontSize: '14px',
            overflow: 'auto'
          }}>
{`exports.onExecutePostLogin = async (event, api) => {
  const assignedRoles = (event.authorization?.roles) || [];
  api.idToken.setCustomClaim("https://my-app.com/roles", assignedRoles);
};`}
          </pre>
          <Typography variant="body2" sx={{ mt: 2 }}>
            Don't forget to assign roles to your users in the Auth0 Dashboard!
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Auth0Debug;
