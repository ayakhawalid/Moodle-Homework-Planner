import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Button } from '@mui/material';
import { SignOut as LogoutIcon } from 'phosphor-react';

const Auth0LogoutButton = ({ className = "nav-circle logout-btn" }) => {
  const { logout, isAuthenticated } = useAuth0();

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");

    // Auth0 logout
    if (isAuthenticated) {
      logout({
        logoutParams: {
          returnTo: window.location.origin
        }
      });
    } else {
      // Fallback for demo login
      window.location.href = '/';
    }
  };

  // Show logout button if authenticated with Auth0 OR if there's a token in localStorage
  const shouldShowLogout = isAuthenticated || localStorage.getItem("token");

  if (!shouldShowLogout) {
    return null;
  }

  // Check if this is for the sidebar (different styling)
  const isSidebar = className.includes('logout-btn') && !className.includes('nav-circle');
  const isCollapsed = className.includes('collapsed');

  if (isSidebar) {
    return (
      <button
        onClick={handleLogout}
        className={className}
        title={isCollapsed ? 'Logout' : ''}
      >
        <span className="nav-icon"><LogoutIcon size={20} weight="thin" /></span>
        {!isCollapsed && <span className="nav-label">Logout</span>}
      </button>
    );
  }

  return (
    <button onClick={handleLogout} className={className}>
      <LogoutIcon size={18} weight="thin" style={{ marginRight: '5px' }} />
      Logout
    </button>
  );
};

export default Auth0LogoutButton;
