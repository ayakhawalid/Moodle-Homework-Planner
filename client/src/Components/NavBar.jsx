// src/Components/NavBar.jsx
import React, { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useAuth } from '../hooks/useAuth';
import logo from '../assets/logo.png';
import { Link, useNavigate } from "react-router-dom";
import Auth0LogoutButton from './Auth0LogoutButton';
import {
  Login as LoginIcon,
  EventNote as EventNoteIcon,
  Reorder as ReorderIcon,
  Logout as LogoutIcon,
  Dashboard as DashboardIcon,
  Assignment as AssignmentIcon,
  Timer as TimerIcon,
  TrendingUp as TrendingUpIcon,
  Grade as GradingIcon,
  Class as ClassIcon,
  BarChart as BarChartIcon,
  AdminPanelSettings as AdminIcon,
  People as UsersIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

function NavBar() {
  const [openLinks, setOpenLinks] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated: auth0IsAuthenticated } = useAuth0();
  const { isAuthenticated, userRole, user } = useAuth();

  // Use Auth0 authentication state or localStorage fallback
  const isLoggedIn = auth0IsAuthenticated || localStorage.getItem("token");

  const toggleNavBar = () => {
    setOpenLinks(!openLinks);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/");
  };
  return (
    <div className="navbar">
      <div className="leftSide">
        {/* Logo removed */}
      </div>
      <div className="rightSide">
        {/* Empty right side - all navigation removed */}
      </div>
    </div>
  );
}

export default NavBar;
