import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserSyncContext } from '../contexts/UserSyncContext';

/**
 * Custom hook to handle authentication state and user roles.
 * Prefers backend (synced) role over JWT role so "Continue with Google" and role updates work.
 */
export const useAuth = () => {
  const { isAuthenticated, isLoading, user, loginWithRedirect, logout } = useAuth0();
  const navigate = useNavigate();
  const { user: syncedUser, syncStatus } = useUserSyncContext();

  const userRoles = useMemo(() => {
    // Use JWT roles from Auth0
    if (user && user['https://my-app.com/roles']) {
      return user['https://my-app.com/roles'];
    }

    // Fallback for legacy demo login compatibility
    const storedRole = localStorage.getItem('role');
    return storedRole ? [storedRole] : [];
  }, [user]);

  const userRole = useMemo(() => (userRoles.length > 0 ? userRoles[0] : null), [userRoles]);

  // Prefer backend/synced role. When sync has completed, backend is source of truth: null role = pending (do not use JWT).
  const effectiveRole = useMemo(() => {
    const fromCallback = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('postLoginRole') : null;
    if (syncStatus === 'synced' && syncedUser != null) {
      return syncedUser.role ?? null;
    }
    return fromCallback ?? userRole ?? null;
  }, [syncedUser, syncStatus, userRole]);

  // Clear post-login role once sync has a role so we don't use stale data on next visit
  useEffect(() => {
    if (syncedUser?.role && typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('postLoginRole');
    }
  }, [syncedUser?.role]);

  const userInfo = useMemo(() => {
    if (user) {
      let userName = 'User';
      try {
        userName = user.name ||
                   user.nickname ||
                   user.given_name ||
                   user.family_name ||
                   user.preferred_username ||
                   user.email?.split('@')[0] ||
                   user.email ||
                   'User';
      } catch (error) {
        console.error('Error extracting user name:', error);
        userName = user.email?.split('@')[0] || 'User';
      }

      return {
        id: user.sub,
        name: userName,
        email: user.email,
        picture: user.picture,
        roles: userRoles,
        primaryRole: userRole,
        emailVerified: user.email_verified
      };
    }

    // Fallback for demo login from localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        return {
          ...parsed,
          roles: userRoles,
          primaryRole: userRole
        };
      } catch (e) {
        return null;
      }
    }
    // Return a default "guest" user object instead of null.
    return {
      id: null,
      name: 'Guest',
      email: null,
      roles: [],
      primaryRole: null
    };
  }, [user, userRoles, userRole]);

  // Check if user is authenticated (Auth0 or localStorage)
  const isLoggedIn = isAuthenticated || !!localStorage.getItem('token');

  // Enhanced logout that clears both Auth0 and localStorage
  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    sessionStorage.removeItem('user_synced'); // Clear the sync flag on logout

    if (isAuthenticated) {
      logout({
        logoutParams: {
          returnTo: window.location.origin
        }
      });
    } else {
      // For demo login, just redirect to home
      navigate('/');
    }
  }, [isAuthenticated, logout, navigate]);

  // Enhanced login that redirects to Auth0
  const handleLogin = useCallback(() => {
    loginWithRedirect();
  }, [loginWithRedirect]);

  // Check if user has specific role (use effective role from backend when available)
  const hasRole = useCallback((requiredRole) => {
    return effectiveRole === requiredRole;
  }, [effectiveRole]);

  // Check if user has any of the specified roles
  const hasAnyRole = useCallback((roleList = []) => {
    if (effectiveRole && roleList.includes(effectiveRole)) return true;
    return roleList.some(role => userRoles.includes(role));
  }, [effectiveRole, userRoles]);

  // Check if user has the required role, considering hierarchy (use effective role)
  const hasRequiredRole = useCallback((requiredRole) => {
    if (!requiredRole) return true;
    if (!effectiveRole) return false;

    const roleHierarchy = {
      admin: ['admin', 'lecturer', 'student'],
      lecturer: ['lecturer', 'student'],
      student: ['student'],
    };

    const allowedRoles = roleHierarchy[effectiveRole] || [];
    return allowedRoles.includes(requiredRole);
  }, [effectiveRole]);

  // Auto-redirect based on effective role (backend over JWT)
  const redirectToDashboard = useCallback(() => {
    if (!effectiveRole) {
      navigate('/role-pending');
      return;
    }

    const path = effectiveRole === 'admin' ? '/admin/dashboard'
      : effectiveRole === 'lecturer' ? '/lecturer/dashboard'
      : '/student/dashboard';
    window.location.href = path;
  }, [effectiveRole, navigate]);

  // Store user data in localStorage (use effective role so backend role is reflected)
  useEffect(() => {
    if (isAuthenticated && userInfo && userInfo.id) {
      localStorage.setItem('token', 'auth0-jwt');
      localStorage.setItem('role', effectiveRole || userInfo.primaryRole);
      localStorage.setItem('user', JSON.stringify({ ...userInfo, primaryRole: effectiveRole || userInfo.primaryRole }));

      console.log('User authenticated with role:', effectiveRole || userInfo.primaryRole);
    }
  }, [isAuthenticated, userInfo, effectiveRole]);

  return {
    // Auth state
    isAuthenticated: isLoggedIn,
    isLoading: isLoading,
    user: userInfo,

    // Role: prefer backend (synced) over JWT so app behaves consistently
    userRole: effectiveRole,
    userRoles: effectiveRole ? [effectiveRole, ...userRoles.filter(r => r !== effectiveRole)] : userRoles,
    hasRole,
    hasAnyRole,
    hasRequiredRole,

    // Actions
    login: handleLogin,
    logout: handleLogout,
    redirectToDashboard,

    // Raw Auth0 data (for debugging)
    auth0User: user,
    auth0IsAuthenticated: isAuthenticated
  };
};

/**
 * Hook specifically for accessing Auth0 roles and debugging
 */
export const useAuth0Roles = () => {
  const { user } = useAuth0();

  if (!user) return null;

  return {
    customRoles: user['https://my-app.com/roles'],
    allClaims: user,
    hasCustomRoles: !!user['https://my-app.com/roles']
  };
};