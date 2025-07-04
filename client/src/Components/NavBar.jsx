// src/Components/NavBar.jsx
import React, { useState } from 'react';
import logo from '../assets/logo.png';
import { Link } from "react-router-dom";
import LoginIcon from '@mui/icons-material/Login';
import EventNoteIcon from '@mui/icons-material/EventNote';
import ReorderIcon from '@mui/icons-material/Reorder';

function NavBar() {
  const [openLinks, setOpenLinks] = useState(false);
  const toggleNavBar = () => {
    setOpenLinks(!openLinks);
  };
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
        <Link to="/login" className="nav-circle">
          <LoginIcon style={{ marginRight: '5px', fontSize: '18px' }} />Login
        </Link>
        <Link to="/signup" className="nav-circle">Sign up</Link>
        <button onClick={toggleNavBar}>
          <ReorderIcon style={{ marginRight: '5px', fontSize: '18px' }} />
        </button>
      </div>
    </div>

  );
}

export default NavBar;
