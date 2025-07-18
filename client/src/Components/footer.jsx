import React from "react";
import InstagramIcon from '@mui/icons-material/Instagram';

import "../styles/Footer.css";

function Footer() {
  return (
    <div className="footer">
      <div className="socialMedia">
        <a
          href="https://www.instagram.com/moodle.planner?igsh=cTg2N2lybWp1b2tl"
          target="_blank"
          rel="noopener noreferrer"
          className="instagram-link"
        >
          <InstagramIcon/>
        </a>
      </div>
      <p> &copy; 2025 HaifaUniversityPlanner.com</p>
    </div>
  );
}

export default Footer;