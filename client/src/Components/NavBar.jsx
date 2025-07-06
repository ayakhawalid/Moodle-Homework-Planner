// src/Components/NavBar.jsx
import React, { useState } from 'react';
import logo from '../assets/logo.png';
import { Link, useNavigate } from "react-router-dom";
import LoginIcon from '@mui/icons-material/Login';
import EventNoteIcon from '@mui/icons-material/EventNote';
import ReorderIcon from '@mui/icons-material/Reorder';
import LogoutIcon from '@mui/icons-material/Logout';

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
  return (
    <div className="navbar">
      <div className="leftSide" id = {openLinks ? "open" : "close"}>
        <Link to="/">
          <img src={logo} alt="logo" className="logo" />
        </Link>
      </div>
      <div className="rightSide">
        <Link to="/bookrooms" className="nav-circle">Book{'\n'}Rooms</Link>
        <Link to="/timetable" className="nav-circle">
          <EventNoteIcon style={{ fontSize: '20px', marginBottom: '2px' }} />
          <span>Timetable</span>
        </Link>
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
