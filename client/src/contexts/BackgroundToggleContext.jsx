import React, { createContext, useContext, useState, useEffect } from 'react';

export const BACKGROUND_THEMES = ['white', 'green', 'teal', 'coral', 'yellow'];

const BackgroundToggleContext = createContext();

export const useBackgroundToggle = () => {
  const context = useContext(BackgroundToggleContext);
  if (!context) {
    throw new Error('useBackgroundToggle must be used within a BackgroundToggleProvider');
  }
  return context;
};

export const BackgroundToggleProvider = ({ children }) => {
  const [backgroundTheme, setBackgroundTheme] = useState(() => {
    const saved = localStorage.getItem('backgroundTheme');
    if (saved && BACKGROUND_THEMES.includes(saved)) return saved;
    const legacy = localStorage.getItem('greenBackground');
    return legacy && JSON.parse(legacy) ? 'green' : 'white';
  });

  useEffect(() => {
    localStorage.setItem('backgroundTheme', backgroundTheme);
    const body = document.body;
    BACKGROUND_THEMES.forEach(t => body.classList.remove(`${t}-background`));
    body.classList.add(`${backgroundTheme}-background`);
  }, [backgroundTheme]);

  const cycleTheme = () => {
    setBackgroundTheme(prev => {
      const i = BACKGROUND_THEMES.indexOf(prev);
      return BACKGROUND_THEMES[(i + 1) % BACKGROUND_THEMES.length];
    });
  };

  const value = {
    backgroundTheme,
    setBackgroundTheme,
    cycleTheme,
    isColoredBackground: backgroundTheme !== 'white',
  };

  return (
    <BackgroundToggleContext.Provider value={value}>
      {children}
    </BackgroundToggleContext.Provider>
  );
};
