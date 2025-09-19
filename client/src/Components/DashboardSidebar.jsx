import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useAuth } from '../hooks/useAuth';
import Auth0LogoutButton from './Auth0LogoutButton';
import {
  Dashboard as DashboardIcon,
  Assignment as AssignmentIcon,
  Timer as TimerIcon,
  TrendingUp as TrendingUpIcon,
  Logout as LogoutIcon,
  Grade as GradingIcon,
  Class as ClassIcon,
  BarChart as BarChartIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  School as SchoolIcon,
  CalendarToday as CalendarTodayIcon,
  Group as GroupIcon,
  Quiz as QuizIcon,
  People as UsersIcon,
  Settings as SettingsIcon,
  Analytics as AnalyticsIcon,
  AccountCircle as AccountCircleIcon,
  SwapHoriz as SwapHorizIcon
} from '@mui/icons-material';
import '../styles/DashboardSidebar.css';

function DashboardSidebar({ userRole }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user: auth0User } = useAuth0();
  const { user } = useAuth();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/");
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Get user name with multiple fallbacks, prioritizing full name
  const getUserName = () => {
    // Try from our processed user object first (full_name, then name)
    if (user?.full_name && user.full_name.trim()) {
      return user.full_name;
    }
    if (user?.name && user.name !== 'User' && user.name.trim()) {
      return user.name;
    }

    // Try directly from Auth0 user object
    if (auth0User) {
      const name = auth0User.given_name ||
                   auth0User.nickname ||
                   auth0User.name ||
                   auth0User.email?.split('@')[0];
      if (name && name.trim()) return name;
    }

    // Final fallback
    return user?.email?.split('@')[0] || 'User';
  };

  // Student navigation items
  const studentNavItems = [
    { path: '/student/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { path: '/student/courses', label: 'Course Enrollment', icon: <SchoolIcon /> },
    { path: '/student/homework', label: 'Homework Planner', icon: <AssignmentIcon /> },
    { path: '/student/classes', label: 'Classes Planner', icon: <CalendarTodayIcon /> },
    { path: '/student/exams', label: 'Exams', icon: <QuizIcon /> },
    { path: '/student/timer', label: 'Study Timer', icon: <TimerIcon /> },
    { path: '/student/partner', label: 'Choose Partner', icon: <GroupIcon /> },
    { path: '/profile', label: 'Profile', icon: <AccountCircleIcon /> },
    { path: '/role-requests', label: 'Role Requests', icon: <SwapHorizIcon /> }
  ];

  // Lecturer navigation items
  const lecturerNavItems = [
    { path: '/lecturer/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { path: '/lecturer/courses', label: 'Course Management', icon: <SchoolIcon /> },
    { path: '/lecturer/homework-checker', label: 'Homework Checker', icon: <GradingIcon /> },
    { path: '/lecturer/stats', label: 'Workload Statistics', icon: <BarChartIcon /> },
    { path: '/profile', label: 'Profile', icon: <AccountCircleIcon /> },
    { path: '/role-requests', label: 'Role Requests', icon: <SwapHorizIcon /> }
  ];

  // Admin navigation items
  const adminNavItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { path: '/admin/users', label: 'User Management', icon: <UsersIcon /> },
    { path: '/admin/analytics', label: 'System Analytics', icon: <AnalyticsIcon /> },
    { path: '/profile', label: 'Profile', icon: <AccountCircleIcon /> },
    { path: '/role-requests', label: 'Role Requests', icon: <SwapHorizIcon /> }
  ];

  const navItems = userRole === 'student' ? studentNavItems :
                   userRole === 'lecturer' ? lecturerNavItems :
                   adminNavItems;

  return (
    <>
      {/* Mobile overlay */}
      {!isCollapsed && (
        <div className="sidebar-overlay" onClick={toggleSidebar}></div>
      )}
      
      <div className={`dashboard-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="logo-section">
            <img src="/src/assets/unnamed.png" alt="Logo" className="sidebar-logo" />
          </div>
          <button className="toggle-btn" onClick={toggleSidebar}>
            {isCollapsed ? <MenuIcon /> : <CloseIcon />}
          </button>
        </div>

        {/* User Info */}
        {!isCollapsed && (
          <div className="user-info">
            <div className="user-avatar">
              {userRole === 'student' ? '👨‍🎓' : userRole === 'lecturer' ? '👨‍🏫' : '👨‍💼'}
            </div>
            <div className="user-details">
              <span className="user-role">
                {userRole === 'student' ? 'Student' :
                 userRole === 'lecturer' ? 'Lecturer' : 'Administrator'}
              </span>
              <span className="user-name">
                Welcome back, {getUserName()}!
              </span>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="sidebar-nav">
          <ul className="nav-list">
            {navItems.map((item, index) => (
              <li key={index} className="nav-item">
                <Link 
                  to={item.path} 
                  className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                  title={isCollapsed ? item.label : ''}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {!isCollapsed && <span className="nav-label">{item.label}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout Button */}
        <div className="sidebar-footer">
          <Auth0LogoutButton className={`logout-btn ${isCollapsed ? 'collapsed' : ''}`} />
        </div>
      </div>
    </>
  );
}

export default DashboardSidebar;
