import React, { useState } from 'react';
import NavBar from './Components/NavBar';
import Home from './pages/Home';

import './App.css';
import './styles/NavBar.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';


const actions = [
  { label: 'Login', color: '#F38181' },
  { label: 'Sign Up', color: '#FCE38A' },
  { label: 'Book Room', color: '#D6F7AD' },
  { label: 'Timetable', color: '#95E1D3' },
];

function App() {
  return (
    <div className='App'>
  <Router>
    <NavBar />
    <Routes>
      <Route path='/' element={<Home />} />  
    </Routes>
  </Router>
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
