import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useUserSyncContext } from '../contexts/UserSyncContext';
import { apiService } from '../services/api';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Alert,
  Chip,
  Divider,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';

const AuthDebugPanel = () => {
  const { user: auth0User, isAuthenticated, getAccessTokenSilently } = useAuth0();
  const { user: dbUser, isAdmin, isLecturer, isStudent, syncStatus, refreshUser, syncUserProfile } = useUserSyncContext();

  const [token, setToken] = React.useState(null);
  const [profileTest, setProfileTest] = React.useState(null);

  const getToken = async () => {
    try {
      // Auth0 identifier does NOT include /api
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const baseUrlWithoutApi = apiBaseUrl.replace(/\/api$/, '');
      const audience = import.meta.env.VITE_AUTH0_AUDIENCE || baseUrlWithoutApi;
      
      const accessToken = await getAccessTokenSilently({
        audience: audience,
        scope: 'read:users read:stats'
      });
      setToken(accessToken);
    } catch (error) {
      console.error('Error getting token:', error);
    }
  };

  const testProfileEndpoint = async () => {
    try {
      // Auth0 identifier does NOT include /api
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const baseUrlWithoutApi = apiBaseUrl.replace(/\/api$/, '');
      const audience = import.meta.env.VITE_AUTH0_AUDIENCE || baseUrlWithoutApi;
      
      const token = await getAccessTokenSilently({
        audience: audience,
        scope: 'read:users read:stats'
      });
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://moodle-homework-planner.onrender.com'}/api/users/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      setProfileTest({ success: true, data });
    } catch (error) {
      setProfileTest({ success: false, error: error.message });
    }
  };

  if (!isAuthenticated) {
    return (
      <Alert severity="info">
        User is not authenticated with Auth0
      </Alert>
    );
  }

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 2 }}>
      <Typography variant="h4" gutterBottom>
        🐛 Authentication Debug Panel
      </Typography>

      {/* Auth0 User Info */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Auth0 User Information
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Chip label={`Authenticated: ${isAuthenticated}`} color={isAuthenticated ? 'success' : 'error'} />
            <Chip label={`Email: ${auth0User?.email || 'N/A'}`} />
            <Chip label={`Name: ${auth0User?.name || 'N/A'}`} />
          </Box>
          
          <Typography variant="subtitle1" gutterBottom>
            🔍 Custom Claims (Roles):
          </Typography>
          <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1, mb: 2 }}>
            <pre style={{ margin: 0, fontSize: '14px' }}>
              {JSON.stringify(auth0User?.['https://my-app.com/roles'], null, 2) || 'null'}
            </pre>
          </Box>

          <Typography variant="subtitle1" gutterBottom>
            🔍 All Auth0 User Properties:
          </Typography>
          <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1, mb: 2 }}>
            <pre style={{ margin: 0, fontSize: '12px', maxHeight: '200px', overflow: 'auto' }}>
              {JSON.stringify(auth0User, null, 2) || 'null'}
            </pre>
          </Box>

          {auth0User?.['https://my-app.com/roles'] ? (
            <Alert severity="success">
              ✅ Custom roles found in Auth0 token
            </Alert>
          ) : (
            <Alert severity="error">
              ❌ No custom roles found in Auth0 token. This is the main issue!
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Database User Info */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Database User Information
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <Chip label={`Sync Status: ${syncStatus}`} color={syncStatus === 'synced' ? 'success' : 'warning'} />
            <Chip label={`DB Role: ${dbUser?.role || 'N/A'}`} />
            <Chip label={`Is Admin: ${isAdmin}`} color={isAdmin ? 'success' : 'default'} />
            <Chip label={`Is Lecturer: ${isLecturer}`} color={isLecturer ? 'success' : 'default'} />
            <Chip label={`Is Student: ${isStudent}`} color={isStudent ? 'success' : 'default'} />
          </Box>

          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Button
              onClick={refreshUser}
              variant="outlined"
              size="small"
              color="primary"
            >
              🔄 Refresh User Data
            </Button>
            <Button
              onClick={syncUserProfile}
              variant="outlined"
              size="small"
              color="secondary"
            >
              🔄 Re-sync Profile
            </Button>
            <Button
              onClick={testProfileEndpoint}
              variant="outlined"
              size="small"
              color="info"
            >
              🧪 Test Profile API
            </Button>
          </Box>

          {profileTest && (
            <Alert severity={profileTest.success ? 'success' : 'error'} sx={{ mb: 2 }}>
              <Typography variant="subtitle2">
                Profile API Test: {profileTest.success ? 'Success' : 'Error'}
              </Typography>
              <Box sx={{ bgcolor: '#f5f5f5', p: 1, borderRadius: 1, mt: 1 }}>
                <pre style={{ margin: 0, fontSize: '12px' }}>
                  {profileTest.success
                    ? JSON.stringify(profileTest.data, null, 2)
                    : profileTest.error
                  }
                </pre>
              </Box>
            </Alert>
          )}
          
          <Typography variant="subtitle1" gutterBottom>
            Database User Object:
          </Typography>
          <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
            <pre style={{ margin: 0, fontSize: '14px' }}>
              {JSON.stringify(dbUser, null, 2) || 'null'}
            </pre>
          </Box>
        </CardContent>
      </Card>

      {/* Token Debug */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Access Token Debug
          </Typography>
          <Button onClick={getToken} variant="outlined" sx={{ mb: 2 }}>
            Get Access Token
          </Button>
          {token && (
            <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Token (first 100 chars):
              </Typography>
              <pre style={{ margin: 0, fontSize: '12px', wordBreak: 'break-all' }}>
                {token.substring(0, 100)}...
              </pre>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Fix Instructions */}
      <Card sx={{ bgcolor: '#fff3cd', border: '1px solid #ffeaa7' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom color="warning.dark">
            🔧 How to Fix the Admin Access Issue
          </Typography>
          
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">
                Step 1: Create Auth0 Post-Login Action
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" paragraph>
                1. Go to your Auth0 Dashboard
              </Typography>
              <Typography variant="body2" paragraph>
                2. Navigate to Actions → Flows → Login
              </Typography>
              <Typography variant="body2" paragraph>
                3. Click "+" to add a new action
              </Typography>
              <Typography variant="body2" paragraph>
                4. Choose "Build from scratch"
              </Typography>
              <Typography variant="body2" paragraph>
                5. Name it "Add Roles to Token"
              </Typography>
              <Typography variant="body2" paragraph>
                6. Replace the code with:
              </Typography>
              <Box sx={{ bgcolor: '#f8f9fa', p: 2, borderRadius: 1, mt: 1 }}>
                <pre style={{ margin: 0, fontSize: '12px' }}>
{`exports.onExecutePostLogin = async (event, api) => {
  const assignedRoles = (event.authorization?.roles) || [];
  api.idToken.setCustomClaim("https://my-app.com/roles", assignedRoles);
  api.accessToken.setCustomClaim("https://my-app.com/roles", assignedRoles);
};`}
                </pre>
              </Box>
              <Typography variant="body2" sx={{ mt: 1 }}>
                7. Click "Deploy"
              </Typography>
              <Typography variant="body2">
                8. Drag the action to the Login flow
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">
                Step 2: Create and Assign Admin Role
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" paragraph>
                1. Go to Auth0 Dashboard → User Management → Roles
              </Typography>
              <Typography variant="body2" paragraph>
                2. Click "Create Role"
              </Typography>
              <Typography variant="body2" paragraph>
                3. Name: "admin", Description: "Administrator role"
              </Typography>
              <Typography variant="body2" paragraph>
                4. Click "Create"
              </Typography>
              <Typography variant="body2" paragraph>
                5. Go to User Management → Users
              </Typography>
              <Typography variant="body2" paragraph>
                6. Find your user ({auth0User?.email})
              </Typography>
              <Typography variant="body2" paragraph>
                7. Click on your user → Roles tab
              </Typography>
              <Typography variant="body2" paragraph>
                8. Click "Assign Roles" → Select "admin" → Assign
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">
                Step 3: Test the Fix
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" paragraph>
                1. Log out of the application
              </Typography>
              <Typography variant="body2" paragraph>
                2. Log back in
              </Typography>
              <Typography variant="body2" paragraph>
                3. Check this debug panel again
              </Typography>
              <Typography variant="body2" paragraph>
                4. You should see "admin" in the custom claims
              </Typography>
              <Typography variant="body2">
                5. Try accessing the admin dashboard
              </Typography>
            </AccordionDetails>
          </Accordion>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AuthDebugPanel;
