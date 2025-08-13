import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
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
  Analytics as AnalyticsIcon
} from '@mui/icons-material';
import '../styles/DashboardSidebar.css';

function DashboardSidebar({ userRole }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth0();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/");
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Student navigation items
  const studentNavItems = [
    { path: '/student/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { path: '/student/homework', label: 'Homework Planner', icon: <AssignmentIcon /> },
    { path: '/student/classes', label: 'Classes Planner', icon: <CalendarTodayIcon /> },
    { path: '/student/classroom', label: 'Courses Info', icon: <SchoolIcon /> },
    { path: '/student/exams', label: 'Exams', icon: <QuizIcon /> },
    { path: '/student/timer', label: 'Study Timer', icon: <TimerIcon /> },
    { path: '/student/partner', label: 'Choose Partner', icon: <GroupIcon /> }
  ];

  // Lecturer navigation items
  const lecturerNavItems = [
    { path: '/lecturer/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { path: '/lecturer/homework-checker', label: 'Homework Checker', icon: <GradingIcon /> },
    { path: '/lecturer/classroom', label: 'Courses Info', icon: <SchoolIcon /> },
    { path: '/lecturer/stats', label: 'Workload Statistics', icon: <BarChartIcon /> }
  ];

  // Admin navigation items
  const adminNavItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { path: '/admin/users', label: 'User Management', icon: <UsersIcon /> },
    { path: '/admin/analytics', label: 'System Analytics', icon: <AnalyticsIcon /> },
    { path: '/admin/settings', label: 'System Settings', icon: <SettingsIcon /> }
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
            {!isCollapsed && <span className="app-name">EduPlatform</span>}
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
              <span className="user-name">Welcome back!</span>
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
