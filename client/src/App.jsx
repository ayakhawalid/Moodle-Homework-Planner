import React, { useState } from 'react';
import coffeeImage from './assets/coffee.png';

const actions = [
  { label: 'Login', color: '#F38181' },
  { label: 'Sign Up', color: '#FCE38A' },
  { label: 'Book Room', color: '#D6F7AD' },
  { label: 'Timetable', color: '#95E1D3' },
];

function App() {
  const [bgColor, setBgColor] = useState('#fff'); // default white background

  return (
    <div style={{ ...styles.outerContainer, backgroundColor: bgColor }}>
      <div style={styles.container}>
        

        <div style={styles.mainContent}>
          <img src={coffeeImage} alt="coffee" style={styles.coffeeImage} />

          <div style={styles.circleToolbar}>
            {actions.map((action, index) => (
              <button
                key={index}
                style={{
                  ...styles.circleButton,
                  backgroundColor: action.color,
                }}
                onMouseEnter={() => setBgColor(action.color)}  // change bg on hover
                onMouseLeave={() => setBgColor('#fff')}          // reset on leave
                onMouseDown={() => setBgColor(action.color)}     // keep bg on press
                onMouseUp={() => setBgColor('#fff')}              // reset on release
                onTouchStart={() => setBgColor(action.color)}    // touch start (mobile)
                onTouchEnd={() => setBgColor('#fff')}             // touch end (mobile)
                onClick={() => alert(`${action.label} clicked`)}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  outerContainer: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingTop: '2rem',
    boxSizing: 'border-box',
    transition: 'background-color 0.3s ease',  // smooth bg color transition
  },
  container: {
    width: '1000px',
    height: '90vh',
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'center',
    backgroundColor: 'transparent',
  },
  header: {
    marginBottom: '1rem',
  },
  headerTitle: {
    fontSize: '1.5rem',
    margin: 0,
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    height: '100%',
  },
  coffeeImage: {
    flexBasis: '50%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: 0,
  },
  circleToolbar: {
    flexBasis: '50%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '2rem',
    paddingLeft: '1rem',
  },
  circleButton: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    border: 'none',
    color: '#333',
    fontWeight: 'bold',
    fontSize: '1rem',
    cursor: 'pointer',
    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s ease-in-out',
  },
};

export default App;
