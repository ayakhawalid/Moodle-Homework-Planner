import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
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
import '../styles/Login.css';

const Auth0Login = () => {
  const { loginWithRedirect, isLoading, error, isAuthenticated } = useAuth0();

  const [selectedRole, setSelectedRole] = useState('student');
  const initialMode = (() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('mode') === 'signup' ? 'signup' : 'login';
    } catch (_) {
      return 'login';
    }
  })();
  const [mode, setMode] = useState(initialMode); // 'login' | 'signup'

  // Keep mode in sync if URL changes (optional)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const m = params.get('mode') === 'signup' ? 'signup' : 'login';
    if (m !== mode) setMode(m);
  }, [mode]);

  const handleLogin = () => {
    console.log('Attempting login...');
    loginWithRedirect({
      authorizationParams: {
        screen_hint: 'login'
      }
    });
  };

  const handleSignupWithRole = async () => {
    console.log('Attempting signup with role:', selectedRole);
    try {
      localStorage.setItem('signup_role', selectedRole);
    } catch (_) {}
    loginWithRedirect({
      authorizationParams: {
        screen_hint: 'signup',
        'https://moodle-planner.com/role': selectedRole
      }
    });
  };

  // If not signup mode, redirect directly to Auth0 login
  useEffect(() => {
    if (!isLoading && !isAuthenticated && mode !== 'signup') {
      handleLogin();
    }
  }, [isLoading, isAuthenticated, mode]);

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
                <Button variant={selectedRole === 'student' ? 'contained' : 'outlined'} startIcon={<StudentIcon />} onClick={() => setSelectedRole('student')}>I'm a Student</Button>
                <Button variant={selectedRole === 'lecturer' ? 'contained' : 'outlined'} startIcon={<LecturerIcon />} onClick={() => setSelectedRole('lecturer')}>I'm a Lecturer</Button>
                <Button variant={selectedRole === 'admin' ? 'contained' : 'outlined'} onClick={() => setSelectedRole('admin')}>I'm an Admin (request)</Button>
                <Button variant="contained" onClick={handleSignupWithRole}>Continue</Button>
              </Box>
            </>
          ) : (
            <>
              <Box textAlign="center" mb={2}>
                <Typography variant="h6">Redirecting to login...</Typography>
              </Box>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>{error.message}</Alert>
              )}
              <Box display="flex" justifyContent="center"><CircularProgress /></Box>
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
