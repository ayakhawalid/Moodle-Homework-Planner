import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useAuth } from '../hooks/useAuth';
import Auth0LogoutButton from './Auth0LogoutButton';
import {
  House as DashboardIcon,
  BookOpen as AssignmentIcon,
  Clock as TimerIcon,
  ChartLineUp as TrendingUpIcon,
  SignOut as LogoutIcon,
  GraduationCap as GradingIcon,
  Calendar as ClassIcon,
  ChartBar as BarChartIcon,
  List as MenuIcon,
  X as CloseIcon,
  Student as SchoolIcon,
  CalendarBlank as CalendarTodayIcon,
  Users as GroupIcon,
  Exam as QuizIcon,
  PaperPlaneTilt as SendIcon,
  UsersThree as UsersIcon,
  Gear as SettingsIcon,
  ChartPie as AnalyticsIcon,
  UserCircle as AccountCircleIcon,
  ArrowsHorizontal as SwapHorizIcon,
  CheckCircle as CheckCircleIcon
} from 'phosphor-react';
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

  // Set dashboard context in session storage
  useEffect(() => {
    if (userRole) {
      sessionStorage.setItem('dashboardContext', userRole);
      console.log('Set dashboard context to:', userRole);
    }
  }, [userRole]);

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
    { path: '/student/dashboard', label: 'Dashboard', icon: <DashboardIcon size={20} weight="thin" /> },
    { path: '/student/courses', label: 'Course Enrollment', icon: <SchoolIcon size={20} weight="thin" /> },
    { path: '/student/homework', label: 'Homework Planner', icon: <AssignmentIcon size={20} weight="thin" /> },
    { path: '/student/homework-management', label: 'Homework Management', icon: <AssignmentIcon size={20} weight="thin" /> },
    { path: '/student/calendar', label: 'Calendar', icon: <CalendarTodayIcon size={20} weight="thin" /> },
    { path: '/student/classes', label: 'Classes', icon: <CalendarTodayIcon size={20} weight="thin" /> },
    { path: '/student/exams', label: 'Exams', icon: <QuizIcon size={20} weight="thin" /> },
    { path: '/student/timer', label: 'Study', icon: <TimerIcon size={20} weight="thin" /> },
    { path: '/student/partner', label: 'Choose Partner', icon: <GroupIcon size={20} weight="thin" /> },
    { path: '/profile', label: 'Profile', icon: <AccountCircleIcon size={20} weight="thin" /> },
    { path: '/role-requests', label: 'Role Requests', icon: <SwapHorizIcon size={20} weight="thin" /> }
  ];

  // Lecturer navigation items
  const lecturerNavItems = [
    { path: '/lecturer/dashboard', label: 'Dashboard', icon: <DashboardIcon size={20} weight="thin" /> },
    { path: '/lecturer/courses', label: 'Course Management', icon: <SchoolIcon size={20} weight="thin" /> },
    { path: '/lecturer/homework', label: 'Homework Management', icon: <AssignmentIcon size={20} weight="thin" /> },
    { path: '/lecturer/verifications', label: 'Verifications', icon: <CheckCircleIcon size={20} weight="thin" /> },
    { path: '/lecturer/workload-overview', label: 'Workload Overview', icon: <BarChartIcon size={20} weight="thin" /> },
    { path: '/lecturer/stats', label: 'Workload Statistics', icon: <BarChartIcon size={20} weight="thin" /> },
    { path: '/lecturer/calendar', label: 'Calendar', icon: <CalendarTodayIcon size={20} weight="thin" /> },
    { path: '/profile', label: 'Profile', icon: <AccountCircleIcon size={20} weight="thin" /> },
    { path: '/role-requests', label: 'Role Requests', icon: <SwapHorizIcon size={20} weight="thin" /> }
  ];

  // Admin navigation items
  const adminNavItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: <DashboardIcon size={20} weight="thin" /> },
    { path: '/admin/users', label: 'User Management', icon: <UsersIcon size={20} weight="thin" /> },
    { path: '/admin/analytics', label: 'System Analytics', icon: <AnalyticsIcon size={20} weight="thin" /> },
    { path: '/profile', label: 'Profile', icon: <AccountCircleIcon size={20} weight="thin" /> }
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
            <img src="/favicon.svg" alt="Logo" className="sidebar-logo" />
          </div>
          <button className="toggle-btn" onClick={toggleSidebar}>
            {isCollapsed ? <MenuIcon size={20} weight="thin" /> : <CloseIcon size={20} weight="thin" />}
          </button>
        </div>

        {/* User Info */}
        {!isCollapsed && (
          <div className="user-info">
            <div className="user-avatar">
              {auth0User?.picture ? (
                <img src={auth0User.picture} alt="Profile" />
              ) : (
                userRole === 'student' ? '👨‍🎓' : userRole === 'lecturer' ? '👨‍🏫' : '👨‍💼'
              )}
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
