// src/Components/NavBar.jsx
import React, { useState } from 'react';
import logo from '../assets/logo.png';
import { Link, useNavigate } from "react-router-dom";
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
  BarChart as BarChartIcon
} from '@mui/icons-material';

function NavBar() {
  const [openLinks, setOpenLinks] = useState(false);
  const navigate = useNavigate();

  const toggleNavBar = () => {
    setOpenLinks(!openLinks);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/");
  };

  const isLoggedIn = localStorage.getItem("token");
  const userRole = localStorage.getItem("role");
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
            <Link to="/bookrooms" className="nav-circle">Book{'\n'}Rooms</Link>
            <Link to="/timetable" className="nav-circle">
              <EventNoteIcon style={{ fontSize: '20px', marginBottom: '2px' }} />
              <span>Timetable</span>
            </Link>
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
            <Link to="/lecturer/classroom" className="nav-circle">
              <ClassIcon style={{ fontSize: '18px', marginBottom: '2px' }} />
              <span>Classroom</span>
            </Link>
            <Link to="/lecturer/stats" className="nav-circle">
              <BarChartIcon style={{ fontSize: '18px', marginBottom: '2px' }} />
              <span>Stats</span>
            </Link>
          </>
        )}

        {/* Login/Logout buttons */}
        {!isLoggedIn ? (
          <>
            <Link to="/login" className="nav-circle">
              <LoginIcon style={{ marginRight: '5px', fontSize: '18px' }} />Login
            </Link>
            <Link to="/signup" className="nav-circle">Sign up</Link>
          </>
        ) : (
          <button onClick={handleLogout} className="nav-circle logout-btn">
            <LogoutIcon style={{ marginRight: '5px', fontSize: '18px' }} />Logout
          </button>
        )}

        <button onClick={toggleNavBar}>
          <ReorderIcon style={{ marginRight: '5px', fontSize: '18px' }} />
        </button>
      </div>
    </div>

  );
}

export default NavBar;
