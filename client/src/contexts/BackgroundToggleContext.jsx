import React, { createContext, useContext, useState, useEffect } from 'react';

const BackgroundToggleContext = createContext();

export const useBackgroundToggle = () => {
  const context = useContext(BackgroundToggleContext);
  if (!context) {
    throw new Error('useBackgroundToggle must be used within a BackgroundToggleProvider');
  }
  return context;
};

export const BackgroundToggleProvider = ({ children }) => {
  const [isGreenBackground, setIsGreenBackground] = useState(() => {
    // Check localStorage for saved preference, default to false (white)
    const saved = localStorage.getItem('greenBackground');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    // Save preference to localStorage whenever it changes
    localStorage.setItem('greenBackground', JSON.stringify(isGreenBackground));
    
    // Apply background class to document body
    if (isGreenBackground) {
      document.body.classList.add('green-background');
      document.body.classList.remove('white-background');
    } else {
      document.body.classList.add('white-background');
      document.body.classList.remove('green-background');
    }
  }, [isGreenBackground]);

  const toggleBackground = () => {
    setIsGreenBackground(prev => !prev);
  };

  const value = {
    isGreenBackground,
    toggleBackground
  };

  return (
    <BackgroundToggleContext.Provider value={value}>
      {children}
    </BackgroundToggleContext.Provider>
  );
};
