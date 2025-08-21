import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Custom hook to handle authentication state and user roles
 * This hook uses Auth0 directly and falls back to localStorage for demo mode
 */
export const useAuth = () => {
  const { isAuthenticated, isLoading, user, loginWithRedirect, logout } = useAuth0();
  const navigate = useNavigate();

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

  // Check if user has specific role
  const hasRole = useCallback((requiredRole) => {
    return userRole === requiredRole;
  }, [userRole]);

  // Check if user has any of the specified roles
  const hasAnyRole = useCallback((roleList = []) => {
    return roleList.some(role => userRoles.includes(role));
  }, [userRoles]);

  // Check if user has the required role, considering hierarchy
  const hasRequiredRole = useCallback((requiredRole) => {
    console.log('Checking required role:', requiredRole);
    console.log("User's current role(s):", userRoles);
    if (!requiredRole) return true; // No role required
    if (!userRole) return false; // User has no role

    const roleHierarchy = {
      admin: ['admin', 'lecturer', 'student'],
      lecturer: ['lecturer', 'student'],
      student: ['student'],
    };

    const allowedRoles = roleHierarchy[userRole] || [];
    const hasRole = allowedRoles.includes(requiredRole);
    console.log(`User has required role (${requiredRole}): ${hasRole}`);
    return hasRole;
  }, [userRole, userRoles]);

  // Auto-redirect based on role after Auth0 login
  const redirectToDashboard = useCallback(() => {
    if (!userRole) {
      navigate('/role-pending');
      return;
    }

    switch (userRole) {
      case 'student':
        navigate('/student/dashboard');
        break;
      case 'lecturer':
        navigate('/lecturer/dashboard');
        break;
      case 'admin':
        navigate('/admin/dashboard');
        break;
      default:
        navigate('/role-pending');
    }
  }, [userRole, navigate]);

  // Store user data in localStorage for app-wide access
  useEffect(() => {
    if (isAuthenticated && userInfo && userInfo.id) {
      // Store in localStorage for compatibility with existing code
      localStorage.setItem('token', 'auth0-jwt');
      localStorage.setItem('role', userInfo.primaryRole);
      localStorage.setItem('user', JSON.stringify(userInfo));

      console.log('User authenticated with role:', userInfo.primaryRole);
      console.log('User roles from useAuth:', userInfo.roles);
    }
  }, [isAuthenticated, userInfo]);

  return {
    // Auth state
    isAuthenticated: isLoggedIn,
    isLoading: isLoading,
    user: userInfo,

    // Role checking
    userRole: userRole,
    userRoles: userRoles,
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