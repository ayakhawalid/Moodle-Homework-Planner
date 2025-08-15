import React, { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider
} from '@mui/material';
import {
  Login as LoginIcon,
  School as StudentIcon,
  MenuBook as LecturerIcon
} from '@mui/icons-material';
import '../styles/Login.css';
import BackendStatus from '../Components/BackendStatus';

const Auth0Login = () => {
  const { loginWithRedirect, isLoading, error, isAuthenticated } = useAuth0();
  const [selectedRole, setSelectedRole] = useState('student');
  const [showRoleSelection, setShowRoleSelection] = useState(false);

  const handleLogin = () => {
    console.log('Attempting login...');
    loginWithRedirect({
      authorizationParams: {
        screen_hint: 'login'
      }
    });
  };

  const handleSignupClick = () => {
    setShowRoleSelection(true);
  };

  const handleSignupWithRole = () => {
    console.log('Attempting signup with role:', selectedRole);
    loginWithRedirect({
      authorizationParams: {
        screen_hint: 'signup',
        // Pass the selected role as a parameter
        role: selectedRole
      }
    });
  };

  const handleBackToLogin = () => {
    setShowRoleSelection(false);
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
      {/* Backend Status */}
      <BackendStatus />

      <Card className="login-form" sx={{ maxWidth: 450, width: '100%', borderRadius: 3, boxShadow: 3 }}>
        <CardContent sx={{ p: 4 }}>
          {!showRoleSelection ? (
            // Login/Signup Selection
            <>
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
                  onClick={handleSignupClick}
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
            </>
          ) : (
            // Role Selection for Signup
            <>
              <Box textAlign="center" mb={3}>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#333' }}>
                  Choose Your Role
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  Select your role to create your account
                </Typography>
              </Box>

              <FormControl component="fieldset" sx={{ width: '100%', mb: 3 }}>
                <FormLabel component="legend" sx={{ mb: 2, fontWeight: 'bold' }}>
                  I am a:
                </FormLabel>
                <RadioGroup
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  sx={{ gap: 1 }}
                >
                  <FormControlLabel
                    value="student"
                    control={<Radio />}
                    label={
                      <Box display="flex" alignItems="center" gap={1}>
                        <StudentIcon sx={{ color: '#4caf50' }} />
                        <Box>
                          <Typography variant="body1" fontWeight="bold">Student</Typography>
                          <Typography variant="body2" color="textSecondary">
                            Access learning materials and track progress
                          </Typography>
                        </Box>
                      </Box>
                    }
                    sx={{
                      border: selectedRole === 'student' ? '2px solid #4caf50' : '1px solid #ddd',
                      borderRadius: 2,
                      p: 2,
                      m: 0,
                      '&:hover': { backgroundColor: '#f5f5f5' }
                    }}
                  />
                  <FormControlLabel
                    value="lecturer"
                    control={<Radio />}
                    label={
                      <Box display="flex" alignItems="center" gap={1}>
                        <LecturerIcon sx={{ color: '#ff9800' }} />
                        <Box>
                          <Typography variant="body1" fontWeight="bold">Lecturer</Typography>
                          <Typography variant="body2" color="textSecondary">
                            Manage courses and teach students
                          </Typography>
                        </Box>
                      </Box>
                    }
                    sx={{
                      border: selectedRole === 'lecturer' ? '2px solid #ff9800' : '1px solid #ddd',
                      borderRadius: 2,
                      p: 2,
                      m: 0,
                      '&:hover': { backgroundColor: '#f5f5f5' }
                    }}
                  />
                </RadioGroup>
              </FormControl>

              <Box display="flex" flexDirection="column" gap={2}>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  onClick={handleSignupWithRole}
                  sx={{
                    backgroundColor: selectedRole === 'student' ? '#4caf50' : '#ff9800',
                    '&:hover': {
                      backgroundColor: selectedRole === 'student' ? '#388e3c' : '#f57c00',
                    },
                    py: 1.5,
                    fontSize: '1.1rem',
                    fontWeight: 'bold'
                  }}
                >
                  Create {selectedRole === 'student' ? 'Student' : 'Lecturer'} Account
                </Button>

                <Button
                  variant="text"
                  size="large"
                  fullWidth
                  onClick={handleBackToLogin}
                  sx={{ color: '#666' }}
                >
                  Back to Login
                </Button>
              </Box>
            </>
          )}

          <Box mt={3} textAlign="center">
            <Typography variant="body2" color="textSecondary">
              Secure authentication powered by Auth0
            </Typography>
          </Box>

          {/* Demo credentials info */}
          <Divider sx={{ my: 3 }} />

          <Box textAlign="center">
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Secure authentication powered by Auth0
            </Typography>

            <Box mt={2} display="flex" justifyContent="center" gap={2} flexWrap="wrap">
              <Typography variant="caption">
                <a href="/auth0-config-test" style={{ color: '#1976d2', textDecoration: 'none' }}>
                  🔧 Test Auth0 Config
                </a>
              </Typography>
              <Typography variant="caption">
                <a href="/auth-debug" style={{ color: '#1976d2', textDecoration: 'none' }}>
                  🔍 Debug Auth
                </a>
              </Typography>
              <Typography variant="caption">
                <a href="/api-test" style={{ color: '#1976d2', textDecoration: 'none' }}>
                  🔗 Test API
                </a>
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth0Login;
