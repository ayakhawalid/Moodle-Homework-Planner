// src/Components/LecturerNavBar.jsx
import React, { useState } from 'react';
import logo from '../assets/logo.png';
import { Link, useNavigate } from "react-router-dom";
import LogoutIcon from '@mui/icons-material/Logout';
import DashboardIcon from '@mui/icons-material/Dashboard';
import GradingIcon from '@mui/icons-material/Grading';
import ClassIcon from '@mui/icons-material/Class';
import BarChartIcon from '@mui/icons-material/BarChart';
import ReorderIcon from '@mui/icons-material/Reorder';

function LecturerNavBar() {
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

export default LecturerNavBar;
