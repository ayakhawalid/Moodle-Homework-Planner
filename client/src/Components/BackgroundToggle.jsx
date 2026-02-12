import React from 'react';
import { useBackgroundToggle } from '../contexts/BackgroundToggleContext';
import { BACKGROUND_THEMES } from '../contexts/BackgroundToggleContext';
import '../styles/BackgroundToggle.css';

const THEME_LABELS = {
  white: 'White',
  green: 'Green',
  teal: 'Teal',
  coral: 'Coral',
  yellow: 'Yellow',
};

const THEME_LEAF_COLORS = {
  white: { fill: '#4CAF50', stroke: '#2E7D32' },
  green: { fill: '#ffffff', stroke: '#f0f0f0' },
  teal: { fill: '#ffffff', stroke: '#e0f7f5' },
  coral: { fill: '#ffffff', stroke: '#ffe5e5' },
  yellow: { fill: '#ffffff', stroke: '#fff8e0' },
};

const BackgroundToggle = () => {
  const { backgroundTheme, cycleTheme } = useBackgroundToggle();
  const nextIndex = (BACKGROUND_THEMES.indexOf(backgroundTheme) + 1) % BACKGROUND_THEMES.length;
  const nextTheme = BACKGROUND_THEMES[nextIndex];
  const colors = THEME_LEAF_COLORS[backgroundTheme] || THEME_LEAF_COLORS.white;

  return (
    <button
      className={`background-toggle ${backgroundTheme}-active`}
      onClick={cycleTheme}
      title={`Switch to ${THEME_LABELS[nextTheme]} Background`}
    >
      <div className="leaf-icon">
        <svg width="48" height="48" viewBox="0 0 64 64" fill={colors.fill}>
          <path d="M32 32 Q16 8 0 32 Q16 56 32 32"/>
          <line x1="0" y1="32" x2="32" y2="32" stroke={colors.stroke} strokeWidth="0.8"/>
        </svg>
      </div>
    </button>
  );
};

export default BackgroundToggle;
