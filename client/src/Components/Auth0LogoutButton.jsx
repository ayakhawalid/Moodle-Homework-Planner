import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Button } from '@mui/material';
import { Logout as LogoutIcon } from '@mui/icons-material';

const Auth0LogoutButton = ({ className = "nav-circle logout-btn" }) => {
  const { logout, isAuthenticated } = useAuth0();

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");

    // Auth0 logout
    logout({
      logoutParams: {
        returnTo: window.location.origin
      }
    });
  };

  if (!isAuthenticated) {
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
        <span className="nav-icon"><LogoutIcon /></span>
        {!isCollapsed && <span className="nav-label">Logout</span>}
      </button>
    );
  }

  return (
    <button onClick={handleLogout} className={className}>
      <LogoutIcon style={{ marginRight: '5px', fontSize: '18px' }} />
      Logout
    </button>
  );
};

export default Auth0LogoutButton;
