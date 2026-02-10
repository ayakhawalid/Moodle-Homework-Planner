import React, { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';

const Callback = () => {
  const { isLoading, error, user, isAuthenticated } = useAuth0();
  const { redirectToDashboard, userRole, userRoles } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      console.log('Auth0 callback - User authenticated:', user);
      console.log('User roles from custom claims:', user['https://my-app.com/roles']);
      console.log('Current URL:', window.location.href);
      console.log('Callback component loaded successfully');

      (async () => {
        let syncedRole = null;
        try {
          // Ensure user profile exists in our DB before proceeding (returns user with role)
          const synced = await apiService.user.syncProfile({
            email: user.email,
            name: user.name,
            full_name: user.given_name || user.name,
            username: user.nickname || null,
            picture: user.picture,
            email_verified: user.email_verified
          });
          syncedRole = synced?.role ?? synced?.data?.role;
          if (!syncedRole && synced && (synced._id || synced.data?._id)) {
            try {
              const profile = await apiService.user.getProfile();
              const p = profile?.data ?? profile;
              if (p?.role && ['admin', 'lecturer', 'student'].includes(p.role)) syncedRole = p.role;
            } catch (_) {}
          }

          // Username: use only Auth0 signup value (username field, nickname, or preferred_username). Ignore if it's just the email prefix.
          const signupId = localStorage.getItem('signup_id');
          const emailLocal = (user.email || '').split('@')[0];
          const auth0Username = (user.username || user.nickname || user.preferred_username || '').trim();
          const profileUpdates = {};
          if (auth0Username && auth0Username !== emailLocal) {
            profileUpdates.username = auth0Username;
          }
          if (signupId) {
            profileUpdates.student_id = signupId;
            localStorage.removeItem('signup_id');
          }
          if (Object.keys(profileUpdates).length > 0) {
            await apiService.user.updateProfile(profileUpdates);
          }

          const signupRole = localStorage.getItem('signup_role');
          const isSignupFlow = localStorage.getItem('is_signup_flow') === 'true';
          if (signupRole && isSignupFlow) {
            console.log('Submitting role request for signup:', signupRole);
            await apiService.roleRequests.submit(signupRole);
            localStorage.removeItem('signup_role');
            localStorage.removeItem('is_signup_flow');
          } else if (signupRole && !isSignupFlow) {
            localStorage.removeItem('signup_role');
          }
        } catch (e) {
          console.warn('Failed during post-signup processing (username/role request):', e);
        }
        // Only use backend role for redirect. New signups (no role in DB) go to pending or home, not student dashboard.
        console.log('Redirecting with role:', syncedRole, '(from backend; JWT role:', userRole, ')');
        if (syncedRole && ['admin', 'lecturer', 'student'].includes(syncedRole)) {
          sessionStorage.setItem('postLoginRole', syncedRole);
          const path = syncedRole === 'admin' ? '/admin/dashboard' : syncedRole === 'lecturer' ? '/lecturer/dashboard' : '/student/dashboard';
          window.location.href = path;
        } else {
          // No role assigned yet (e.g. new signup) -> role-pending or home, not student dashboard
          navigate('/role-pending', { replace: true });
        }
      })();
    }
  }, [isLoading, isAuthenticated, user, userRole, userRoles, redirectToDashboard]);

  if (isLoading) {
    return (
      <Box 
        display="flex" 
        flexDirection="column" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        gap={2}
      >
        <CircularProgress size={60} />
        <Typography variant="h6">Authenticating...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box 
        display="flex" 
        flexDirection="column" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        gap={2}
      >
        <Typography variant="h5" color="error">
          Authentication Error
        </Typography>
        <Typography variant="body1">
          {error.message}
        </Typography>
      </Box>
    );
  }

  return (
    <Box 
      display="flex" 
      justifyContent="center" 
      alignItems="center" 
      minHeight="100vh"
    >
      <Typography variant="h6">Redirecting...</Typography>
    </Box>
  );
};

export default Callback;
