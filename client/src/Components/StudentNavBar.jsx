// src/Components/StudentNavBar.jsx
import React, { useState } from 'react';
import logo from '../assets/logo.png';
import { Link, useNavigate } from "react-router-dom";
import LogoutIcon from '@mui/icons-material/Logout';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssignmentIcon from '@mui/icons-material/Assignment';
import TimerIcon from '@mui/icons-material/Timer';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ReorderIcon from '@mui/icons-material/Reorder';

function StudentNavBar() {
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

  return (
    <div className="navbar">
      <div className="leftSide" id={openLinks ? "open" : "close"}>
        <Link to="/">
          <img src={logo} alt="logo" className="logo" />
        </Link>
      </div>
      <div className="rightSide">
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
          <span>Study</span>
        </Link>
        <button onClick={handleLogout} className="nav-circle logout-btn">
          <LogoutIcon style={{ fontSize: '18px', marginBottom: '2px' }} />
          <span>Logout</span>
        </button>
        <button onClick={toggleNavBar}>
          <ReorderIcon style={{ marginRight: '5px', fontSize: '18px' }} />
        </button>
      </div>
    </div>
  );
}

export default StudentNavBar;
