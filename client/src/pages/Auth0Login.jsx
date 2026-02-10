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
import { Login as LoginIcon } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useUserSyncContext } from '../contexts/UserSyncContext';
// Using favicon as logo
const logo = '/favicon.svg';
import '../styles/Login.css';

const Auth0Login = () => {
  const { loginWithRedirect, isLoading, error, isAuthenticated, user } = useAuth0();
  const { userRole } = useAuth();
  const { syncStatus, user: syncedUser } = useUserSyncContext();
  const location = useLocation();
  const navigate = useNavigate();
  // Use backend role when JWT has no role (e.g. after "Continue with Google" account linking)
  const effectiveRole = userRole || syncedUser?.role;
  
  // Debug logging
  useEffect(() => {
    console.log('Auth0Login - Auth State:', { 
      isAuthenticated, 
      isLoading, 
      hasUser: !!user,
      userEmail: user?.email,
      syncStatus,
      userRole
    });
  }, [isAuthenticated, isLoading, user, syncStatus, userRole]);

  const [selectedRole, setSelectedRole] = useState('student');
  const [userId, setUserId] = useState('');
  const isValidId = (val) => !val || /^\d{9}$/.test(val);
  
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
    console.log('Attempting signup with role:', selectedRole, 'id:', userId);
    try {
      localStorage.setItem('signup_role', selectedRole);
      localStorage.setItem('is_signup_flow', 'true'); // Mark this as a signup flow
      if (userId.trim() && isValidId(userId.trim())) {
        localStorage.setItem('signup_id', userId.trim());
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
        <Box 
          display="flex" 
          flexDirection="column" 
          alignItems="center" 
          justifyContent="center"
          gap={2}
          minHeight="100vh"
        >
          <CircularProgress />
          <Typography>Redirecting to login...</Typography>
        </Box>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="login-container">
        <Box 
          display="flex" 
          flexDirection="column" 
          alignItems="center" 
          justifyContent="center"
          gap={2}
          minHeight="100vh"
        >
          <CircularProgress />
          <Typography>Loading...</Typography>
        </Box>
      </div>
    );
  }

  // Clear stale localStorage if Auth0 says not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Auth0 says not authenticated, but check if localStorage has stale data
      const hasStaleToken = localStorage.getItem('token');
      if (hasStaleToken) {
        console.log('Clearing stale authentication data from localStorage');
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('user');
        sessionStorage.removeItem('user_synced');
      }
    }
  }, [isLoading, isAuthenticated]);

  // Redirect by effective role (JWT or synced backend role) so "Continue with Google" works
  const redirectByRole = (role) => {
    if (!role) {
      navigate('/role-pending');
      return;
    }
    const path = role === 'admin' ? '/admin/dashboard' : role === 'lecturer' ? '/lecturer/dashboard' : '/student/dashboard';
    window.location.href = path;
  };

  useEffect(() => {
    if (isAuthenticated && user && !isLoading) {
      if (syncStatus === 'synced') {
        if (effectiveRole) {
          console.log('User already authenticated, redirecting to dashboard...');
          redirectByRole(effectiveRole);
        } else {
          navigate('/role-pending');
        }
      } else if (syncStatus === 'error') {
        console.warn('User sync failed, attempting redirect anyway...');
        setTimeout(() => redirectByRole(effectiveRole), 1000);
      } else if (syncStatus === 'syncing') {
        const timeoutId = setTimeout(() => redirectByRole(effectiveRole), 5000);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [isAuthenticated, isLoading, user, syncStatus, effectiveRole, navigate]);

  // Only show "already logged in" if Auth0 confirms user exists AND not loading
  // Require both isAuthenticated AND user object to prevent false positives
  if (isAuthenticated && user && !isLoading) {
    return (
      <div className="login-container">
        <Box 
          display="flex" 
          flexDirection="column" 
          alignItems="center" 
          justifyContent="center"
          gap={2}
          minHeight="100vh"
        >
          <CircularProgress />
          <Typography variant="h6">
            {syncStatus === 'syncing' 
              ? 'Syncing your profile...' 
              : syncStatus === 'error'
              ? 'Redirecting...'
              : 'You are already logged in. Redirecting...'}
          </Typography>
        </Box>
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
        <CardContent sx={{ p: 2 }}>
          {mode === 'signup' ? (
            <>
              <Box textAlign="center" mb={1}>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>Choose your role</Typography>
                <Typography variant="body2" color="textSecondary">You will be redirected to Auth0 to finish sign up.</Typography>
              </Box>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>{error.message}</Alert>
              )}
              
              <Box display="flex" flexDirection="column" gap={1.5}>
                <TextField
                  label="Your ID (optional)"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  placeholder="9 digits"
                  helperText={userId && !isValidId(userId) ? 'Must be exactly 9 digits' : 'Used to identify you in course lists and reports'}
                  error={!!userId && !isValidId(userId)}
                  inputProps={{ maxLength: 9, inputMode: 'numeric', pattern: '[0-9]*' }}
                />
                <Button 
                  variant="contained"
                  onClick={() => setSelectedRole('student')}
                  sx={{
                    backgroundColor: selectedRole === 'student' ? '#95E1D3' : 'rgba(149, 225, 211, 0.3)',
                    color: '#333',
                    border: selectedRole === 'student' ? '2px solid #95E1D3' : '1px solid #95E1D3',
                    '&:hover': { 
                      backgroundColor: selectedRole === 'student' ? '#7dd3c0' : 'rgba(149, 225, 211, 0.5)' 
                    }
                  }}
                >
                  I'm a Student
                </Button>
                <Button 
                  variant="contained"
                  onClick={() => setSelectedRole('lecturer')}
                  sx={{
                    backgroundColor: selectedRole === 'lecturer' ? '#D6F7AD' : 'rgba(214, 247, 173, 0.3)',
                    color: '#333',
                    border: selectedRole === 'lecturer' ? '2px solid #D6F7AD' : '1px solid #D6F7AD',
                    '&:hover': { 
                      backgroundColor: selectedRole === 'lecturer' ? '#c8f299' : 'rgba(214, 247, 173, 0.5)' 
                    }
                  }}
                >
                  I'm a Lecturer
                </Button>
                <Button 
                  variant="contained"
                  onClick={() => setSelectedRole('admin')}
                  sx={{
                    backgroundColor: selectedRole === 'admin' ? '#FCE38A' : 'rgba(252, 227, 138, 0.3)',
                    color: '#333',
                    border: selectedRole === 'admin' ? '2px solid #FCE38A' : '1px solid #FCE38A',
                    '&:hover': { 
                      backgroundColor: selectedRole === 'admin' ? '#fbd65e' : 'rgba(252, 227, 138, 0.5)' 
                    }
                  }}
                >
                  I'm an Admin
                </Button>
                <Button 
                  variant="contained" 
                  onClick={handleSignupWithRole}
                  disabled={!!userId && !isValidId(userId)}
                  sx={{
                    backgroundColor: '#F38181',
                    color: 'white',
                    '&:hover': { backgroundColor: '#e85a6b' }
                  }}
                >
                  Continue
                </Button>
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
