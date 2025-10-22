import React from 'react';
import { useBackgroundToggle } from '../contexts/BackgroundToggleContext';
import '../styles/BackgroundToggle.css';

const BackgroundToggle = () => {
  const { isGreenBackground, toggleBackground } = useBackgroundToggle();

  return (
    <button 
      className={`background-toggle ${isGreenBackground ? 'green-active' : 'white-active'}`}
      onClick={toggleBackground}
      title={isGreenBackground ? 'Switch to White Background' : 'Switch to Green Background'}
    >
      <div className="leaf-icon">
        {isGreenBackground ? (
          // White leaf when background is green
          <svg width="48" height="48" viewBox="0 0 64 64" fill="#ffffff">
            <path d="M32 32 Q16 8 0 32 Q16 56 32 32"/>
            <line x1="0" y1="32" x2="32" y2="32" stroke="#f0f0f0" strokeWidth="0.8"/>
          </svg>
        ) : (
          // Green leaf when background is white
          <svg width="48" height="48" viewBox="0 0 64 64" fill="#4CAF50">
            <path d="M32 32 Q16 8 0 32 Q16 56 32 32"/>
            <line x1="0" y1="32" x2="32" y2="32" stroke="#2E7D32" strokeWidth="0.8"/>
          </svg>
        )}
      </div>
    </button>
  );
};

export default BackgroundToggle;
