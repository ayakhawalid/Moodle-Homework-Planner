import React from 'react';
import DashboardLayout from '../../Components/DashboardLayout';
import { Timer as TimerIcon, PlayArrow as PlayArrowIcon, Pause as PauseIcon, History as HistoryIcon } from '@mui/icons-material';
import '../../styles/DashboardLayout.css';

function StudyTimer() {
  return (
    <DashboardLayout userRole="student">
      <div className="welcome-section">
        <h1 className="welcome-title">Study Timer ⏰</h1>
        <p className="welcome-subtitle">Use the Pomodoro technique and other timing methods to enhance your study sessions</p>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon primary">
              <TimerIcon />
            </div>
            <div>
              <h3 className="card-title">Pomodoro Timer</h3>
              <p className="card-subtitle">25/5 minute cycles</p>
            </div>
          </div>
          <div className="card-content">
            <p>The classic Pomodoro technique: 25 minutes of focused study followed by a 5-minute break.</p>
            <div style={{textAlign: 'center', margin: '20px 0'}}>
              <div style={{fontSize: '48px', fontWeight: 'bold', color: '#F38181', marginBottom: '10px'}}>
                25:00
              </div>
              <div style={{display: 'flex', gap: '10px', justifyContent: 'center'}}>
                <button style={{
                  background: '#95E1D3',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '25px',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  <PlayArrowIcon /> Start
                </button>
                <button style={{
                  background: '#F38181',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '25px',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  <PauseIcon /> Pause
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon secondary">
              <PlayArrowIcon />
            </div>
            <div>
              <h3 className="card-title">Custom Sessions</h3>
              <p className="card-subtitle">Set your own timing</p>
            </div>
          </div>
          <div className="card-content">
            <p>Create custom study sessions with your preferred duration and break intervals.</p>
            <div style={{marginTop: '15px'}}>
              <div style={{marginBottom: '10px'}}>
                <label style={{display: 'block', marginBottom: '5px', fontWeight: '500'}}>Study Duration:</label>
                <input type="number" placeholder="30" style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '5px'
                }} /> minutes
              </div>
              <div style={{marginBottom: '15px'}}>
                <label style={{display: 'block', marginBottom: '5px', fontWeight: '500'}}>Break Duration:</label>
                <input type="number" placeholder="10" style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '5px'
                }} /> minutes
              </div>
              <button style={{
                background: '#FCE38A',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '25px',
                color: '#333',
                cursor: 'pointer',
                width: '100%',
                fontWeight: '500'
              }}>
                Start Custom Session
              </button>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon accent">
              <HistoryIcon />
            </div>
            <div>
              <h3 className="card-title">Session History</h3>
              <p className="card-subtitle">Track your progress</p>
            </div>
          </div>
          <div className="card-content">
            <p>View your study session history and track your productivity over time.</p>
            <div className="progress-container">
              <div className="progress-label">
                <span>Today's Study Time</span>
                <span>2.5 hrs</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{width: '62%'}}></div>
              </div>
            </div>
          </div>
          <div className="card-stats">
            <div className="stat-item">
              <span className="stat-value">5</span>
              <span className="stat-label">Sessions</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">18</span>
              <span className="stat-label">This Week</span>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon primary">
              <TimerIcon />
            </div>
            <div>
              <h3 className="card-title">Study Statistics</h3>
              <p className="card-subtitle">Your productivity metrics</p>
            </div>
          </div>
          <div className="card-content">
            <p>Analyze your study patterns and improve your productivity.</p>
            <div style={{marginTop: '15px'}}>
              <div style={{marginBottom: '10px', padding: '10px', background: '#f8f9fa', borderRadius: '8px'}}>
                <strong>Average Session Length</strong><br />
                <small style={{color: '#666'}}>28 minutes</small>
              </div>
              <div style={{marginBottom: '10px', padding: '10px', background: '#f8f9fa', borderRadius: '8px'}}>
                <strong>Most Productive Time</strong><br />
                <small style={{color: '#666'}}>2:00 PM - 4:00 PM</small>
              </div>
              <div style={{padding: '10px', background: '#f8f9fa', borderRadius: '8px'}}>
                <strong>Weekly Goal Progress</strong><br />
                <small style={{color: '#666'}}>15/20 hours completed</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default StudyTimer;
