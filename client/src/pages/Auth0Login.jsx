import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Divider,
  TextField
} from '@mui/material';
import { Login as LoginIcon, School as StudentIcon, MenuBook as LecturerIcon } from '@mui/icons-material';
// Using favicon as logo
const logo = '/favicon.svg';
import '../styles/Login.css';

const Auth0Login = () => {
  const { loginWithRedirect, isLoading, error, isAuthenticated } = useAuth0();
  const location = useLocation();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState('student');
  const [username, setUsername] = useState('');
  
  // Get mode from URL parameters
  const getModeFromURL = () => {
    try {
      const params = new URLSearchParams(location.search);
      return params.get('mode') === 'signup' ? 'signup' : 'login';
    } catch (_) {
      return 'login';
    }
  };
  
  const [mode, setMode] = useState(getModeFromURL()); // 'login' | 'signup'

  // Keep mode in sync if URL changes
  useEffect(() => {
    const newMode = getModeFromURL();
    if (newMode !== mode) {
      console.log('Mode changed from', mode, 'to', newMode);
      setMode(newMode);
    }
  }, [location.search, mode]); // Watch for URL changes

  const handleLogin = () => {
    console.log('Attempting login...');
    loginWithRedirect({
      authorizationParams: {
        screen_hint: 'login'
      }
    });
  };

  const handleSignupWithRole = async () => {
    console.log('Attempting signup with role:', selectedRole, 'username:', username);
    try {
      localStorage.setItem('signup_role', selectedRole);
      if (username.trim()) {
        localStorage.setItem('signup_username', username.trim());
      }
    } catch (_) {}
    loginWithRedirect({
      authorizationParams: {
        screen_hint: 'signup',
        'https://moodle-planner.com/role': selectedRole
      }
    });
  };

  // Auto-redirect to Auth0 login when component loads (for login mode only)
  useEffect(() => {
    console.log('useEffect triggered - isLoading:', isLoading, 'isAuthenticated:', isAuthenticated, 'mode:', mode);
    if (!isLoading && !isAuthenticated && mode === 'login') {
      console.log('Auto-redirecting to Auth0 login...');
      // Add a small delay to ensure the component is fully mounted
      setTimeout(() => {
        handleLogin();
      }, 100);
    }
  }, [isLoading, isAuthenticated, mode]);

  // For login mode, redirect immediately without showing UI
  if (mode === 'login' && !isAuthenticated && !isLoading) {
    console.log('Immediate redirect to Auth0... mode:', mode);
    // Redirect immediately
    setTimeout(() => {
      handleLogin();
    }, 50);
    return (
      <div className="login-container">
        <div className="login-logo-container">
          <img 
            src={logo} 
            alt="University Logo" 
            className="login-logo"
            onClick={() => navigate('/')}
            style={{ cursor: 'pointer' }}
          />
        </div>
        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
          <CircularProgress />
          <Typography>Redirecting to login...</Typography>
        </Box>
      </div>
    );
  }

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

  // In signup mode, show a minimal role selection then redirect to Auth0
  return (
    <div className="login-container">
      {/* Logo at the top */}
      <div className="login-logo-container">
        <img 
          src={logo} 
          alt="University Logo" 
          className="login-logo"
          onClick={() => navigate('/')}
          style={{ cursor: 'pointer' }}
        />
      </div>

      <Card className="login-form" sx={{ maxWidth: 500, width: '100%', borderRadius: 3, boxShadow: 3 }}>
        <CardContent sx={{ p: 4 }}>
          {mode === 'signup' ? (
            <>
              <Box textAlign="center" mb={2}>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>Choose your role</Typography>
                <Typography variant="body2" color="textSecondary">You will be redirected to Auth0 to finish sign up.</Typography>
              </Box>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>{error.message}</Alert>
              )}
              
              <Box display="flex" flexDirection="column" gap={2}>
                <TextField
                  label="Username (optional)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="Enter your preferred username"
                  helperText="3-30 characters: letters, numbers, underscore, dot"
                  inputProps={{ pattern: '^[a-z0-9_.]{3,30}$' }}
                />
                <Button variant={selectedRole === 'student' ? 'contained' : 'outlined'} startIcon={<StudentIcon />} onClick={() => setSelectedRole('student')}>I'm a Student</Button>
                <Button variant={selectedRole === 'lecturer' ? 'contained' : 'outlined'} startIcon={<LecturerIcon />} onClick={() => setSelectedRole('lecturer')}>I'm a Lecturer</Button>
                <Button variant={selectedRole === 'admin' ? 'contained' : 'outlined'} onClick={() => setSelectedRole('admin')}>I'm an Admin (request)</Button>
                <Button variant="contained" onClick={handleSignupWithRole}>Continue</Button>
              </Box>
            </>
          ) : (
            <>
              <Box textAlign="center" mb={2}>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>Redirecting to Login...</Typography>
                <Typography variant="body2" color="textSecondary">Please wait while we redirect you to Auth0</Typography>
              </Box>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>{error.message}</Alert>
              )}
              <Box display="flex" justifyContent="center">
                <CircularProgress size={40} />
              </Box>
            </>
          )}

          <Box mt={3} textAlign="center">
            <Typography variant="body2" color="textSecondary">
              Secure authentication powered by Auth0
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box textAlign="center" />
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth0Login;
