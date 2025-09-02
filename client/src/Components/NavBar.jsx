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
      <div className="leftSide" id = {openLinks ? "open" : "close"}>
        <Link to="/">
          <img src={logo} alt="logo" className="logo" />
        </Link>
      </div>
      <div className="rightSide">
        {/* Always visible items */}
        {!isLoggedIn && (
          <>
            <a href={`chrome-extension://efaidnbmnnnibpcajpcglclefindmkaj/https://www.haifa.ac.il/wp-content/uploads/2025/07/mat-4-%D7%AA%D7%A9%D7%A4%D7%94.pdf`} target="_blank" rel="noreferrer" className="nav-circle">
              <EventNoteIcon style={{ fontSize: '20px', marginBottom: '2px' }} />
              <span>Timetable</span>
            </a>
          </>
        )}

        {/* Student navigation items */}
        {isLoggedIn && userRole === "student" && (
          <>
            <Link to="/student/dashboard" className="nav-circle">
              <DashboardIcon style={{ fontSize: '18px', marginBottom: '2px' }} />
              <span>Dashboard</span>
            </Link>
            <Link to="/student/homework" className="nav-circle">
              <AssignmentIcon style={{ fontSize: '18px', marginBottom: '2px' }} />
              <span>Homework</span>
            </Link>
            <Link to="/student/timer" className="nav-circle">
              <TimerIcon style={{ fontSize: '18px', marginBottom: '2px' }} />
              <span>Timer</span>
            </Link>
            <Link to="/student/progress" className="nav-circle">
              <TrendingUpIcon style={{ fontSize: '18px', marginBottom: '2px' }} />
              <span>Progress</span>
            </Link>
          </>
        )}

        {/* Lecturer navigation items */}
        {isLoggedIn && userRole === "lecturer" && (
          <>
            <Link to="/lecturer/dashboard" className="nav-circle">
              <DashboardIcon style={{ fontSize: '18px', marginBottom: '2px' }} />
              <span>Dashboard</span>
            </Link>
            <Link to="/lecturer/homework-checker" className="nav-circle">
              <GradingIcon style={{ fontSize: '18px', marginBottom: '2px' }} />
              <span>Grading</span>
            </Link>
            <Link to="/lecturer/stats" className="nav-circle">
              <BarChartIcon style={{ fontSize: '18px', marginBottom: '2px' }} />
              <span>Stats</span>
            </Link>
          </>
        )}

        {/* Admin navigation items */}
        {isLoggedIn && userRole === "admin" && (
          <>
            <Link to="/admin/dashboard" className="nav-circle">
              <DashboardIcon style={{ fontSize: '18px', marginBottom: '2px' }} />
              <span>Dashboard</span>
            </Link>
            <Link to="/admin/users" className="nav-circle">
              <UsersIcon style={{ fontSize: '18px', marginBottom: '2px' }} />
              <span>Users</span>
            </Link>
            <Link to="/admin/analytics" className="nav-circle">
              <BarChartIcon style={{ fontSize: '18px', marginBottom: '2px' }} />
              <span>Analytics</span>
            </Link>
            <Link to="/admin/settings" className="nav-circle">
              <SettingsIcon style={{ fontSize: '18px', marginBottom: '2px' }} />
              <span>Settings</span>
            </Link>
          </>
        )}

        {/* Login/Signup/Logout buttons */}
        {!isLoggedIn ? (
          <>
            <Link to="/login" className="nav-circle">
              <LoginIcon style={{ marginRight: '5px', fontSize: '18px' }} />Login
            </Link>
            <Link to="/login?mode=signup" className="nav-circle">Sign Up</Link>
          </>
        ) : (
          <Auth0LogoutButton />
        )}

        <button onClick={toggleNavBar}>
          <ReorderIcon style={{ marginRight: '5px', fontSize: '18px' }} />
        </button>
      </div>
    </div>

  );
}

export default NavBar;
