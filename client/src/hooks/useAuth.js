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
      // Try different ways to get the user's name
      let userName = 'User'; // Default fallback

      try {
        // Check all possible name fields from Auth0
        userName = user.name ||
                  user.nickname ||
                  user.given_name ||
                  user.family_name ||
                  user.preferred_username;

        // If no name available, extract from email
        if (!userName && user.email) {
          userName = user.email.split('@')[0];
        }

        // If still no name, use email
        if (!userName) {
          userName = user.email || 'User';
        }

        console.log('Auth0 User Data:', user);
        console.log('Available name fields:', {
          name: user.name,
          nickname: user.nickname,
          given_name: user.given_name,
          family_name: user.family_name,
          email: user.email,
          preferred_username: user.preferred_username
        });
        console.log('Final extracted User Name:', userName);
      } catch (error) {
        console.error('Error extracting user name:', error);
        userName = user.email?.split('@')[0] || 'User';
      }

      return {
        id: user.sub,
        name: userName,
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
