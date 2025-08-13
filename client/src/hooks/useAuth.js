import { useAuth0 } from '@auth0/auth0-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Custom hook to handle authentication state and user roles
 * Integrates with Auth0 Post-Login Action that sets roles in custom claims
 */
export const useAuth = () => {
  const { isAuthenticated, isLoading, user, loginWithRedirect, logout } = useAuth0();
  const navigate = useNavigate();

  // Get user roles from Auth0 custom claims
  const getUserRoles = () => {
    if (user && user['https://my-app.com/roles']) {
      return user['https://my-app.com/roles'];
    }

    // Fallback to localStorage for demo login compatibility
    const storedRole = localStorage.getItem('role');
    return storedRole ? [storedRole] : [];
  };

  // Get primary user role (first role in the array)
  const getUserRole = () => {
    const roles = getUserRoles();
    return roles.length > 0 ? roles[0] : null; // Return null if no roles assigned
  };

  // Get user info with role
  const getUserInfo = () => {
    if (user) {
      return {
        id: user.sub,
        name: user.name || user.nickname || 'User',
        email: user.email,
        picture: user.picture,
        roles: getUserRoles(),
        primaryRole: getUserRole(),
        emailVerified: user.email_verified
      };
    }

    // Fallback for demo login
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        return {
          ...parsed,
          roles: [localStorage.getItem('role') || 'student'],
          primaryRole: localStorage.getItem('role') || 'student'
        };
      } catch (e) {
        return null;
      }
    }

    return null;
  };

  // Check if user is authenticated (Auth0 or localStorage)
  const isLoggedIn = isAuthenticated || !!localStorage.getItem('token');

  // Enhanced logout that clears both Auth0 and localStorage
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    
    if (isAuthenticated) {
      logout({
        logoutParams: {
          returnTo: window.location.origin
        }
      });
    } else {
      // For demo login, just redirect to home
      window.location.href = '/';
    }
  };

  // Enhanced login that redirects to Auth0
  const handleLogin = () => {
    loginWithRedirect();
  };

  // Check if user has specific role
  const hasRole = (requiredRole) => {
    const userRole = getUserRole();
    return userRole === requiredRole;
  };

  // Check if user has any of the specified roles
  const hasAnyRole = (roleList) => {
    const userRoles = getUserRoles();
    return roleList.some(role => userRoles.includes(role));
  };

  // Auto-redirect based on role after Auth0 login
  const redirectToDashboard = () => {
    const role = getUserRole();

    if (!role) {
      // User has no assigned roles - redirect to a pending page or show message
      navigate('/role-pending');
      return;
    }

    switch (role) {
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
        // Unknown role - redirect to pending page
        navigate('/role-pending');
    }
  };

  // Store user data in localStorage for app-wide access
  useEffect(() => {
    if (isAuthenticated && user) {
      const userRole = getUserRole();
      const userInfo = getUserInfo();

      // Store in localStorage for compatibility with existing code
      localStorage.setItem('token', 'auth0-jwt');
      localStorage.setItem('role', userRole);
      localStorage.setItem('user', JSON.stringify(userInfo));

      console.log('User authenticated with role:', userRole);
      console.log('User roles:', getUserRoles());
    }
  }, [isAuthenticated, user]);

  return {
    // Auth state
    isAuthenticated: isLoggedIn,
    isLoading,
    user: getUserInfo(),

    // Role checking
    userRole: getUserRole(),
    userRoles: getUserRoles(),
    hasRole,
    hasAnyRole,

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
