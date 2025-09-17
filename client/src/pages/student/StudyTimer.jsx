import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../Components/DashboardLayout';
import { Timer as TimerIcon, PlayArrow as PlayArrowIcon, Pause as PauseIcon, Stop as StopIcon, History as HistoryIcon } from '@mui/icons-material';
import { useUserSyncContext } from '../../contexts/UserSyncContext';
import { apiService } from '../../services/api';
import '../../styles/DashboardLayout.css';

function StudyTimer() {
  const { syncStatus } = useUserSyncContext();
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [sessionTime, setSessionTime] = useState(25);
  const [breakTime, setBreakTime] = useState(5);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [todayStudyTime, setTodayStudyTime] = useState(0);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch study timer data
  useEffect(() => {
    const fetchTimerData = async () => {
      try {
        setLoading(true);
        const response = await apiService.studentDashboard.getStudyTimer();
        const data = response.data;
        
        setTodayStudyTime(data.today_hours || 0);
        setSessionHistory(data.recent_sessions || []);
        setSessionsCompleted(data.sessions_today || 0);
      } catch (err) {
        console.error('Error fetching timer data:', err);
        setError('Failed to load timer data');
      } finally {
        setLoading(false);
      }
    };

    if (syncStatus === 'synced') {
      fetchTimerData();
    }
  }, [syncStatus]);

  // Timer effect
  useEffect(() => {
    let interval = null;
    
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft => timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      // Session completed
      setIsRunning(false);
      if (!isBreak) {
        // Study session completed, start break
        setSessionsCompleted(prev => prev + 1);
        setIsBreak(true);
        setTimeLeft(breakTime * 60);
        // Save session to backend
        saveSession();
      } else {
        // Break completed, start new study session
        setIsBreak(false);
        setTimeLeft(sessionTime * 60);
      }
    }
    
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, isBreak, breakTime, sessionTime]);

  // Save completed session
  const saveSession = async () => {
    try {
      const today = new Date();
      const sessionHours = sessionTime / 60; // Convert minutes to hours
      
      await apiService.studentSubmission.saveStudySession({
        date: today.toISOString(),
        hours_studied: sessionHours,
        tasks_completed: `Completed ${sessionTime}-minute Pomodoro session`,
        goal_achieved: true,
        focus_rating: 4, // Default good focus rating
        difficulty_rating: 3, // Default medium difficulty
        subjects_studied: ['General Study']
      });
    } catch (err) {
      console.error('Error saving session:', err);
    }
  };

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Timer controls
  const startTimer = () => {
    setIsRunning(true);
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const stopTimer = () => {
    setIsRunning(false);
    setTimeLeft(isBreak ? breakTime * 60 : sessionTime * 60);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setIsBreak(false);
    setTimeLeft(sessionTime * 60);
  };

  // Custom session controls
  const startCustomSession = () => {
    setTimeLeft(sessionTime * 60);
    setIsBreak(false);
    setIsRunning(true);
  };

  if (loading) {
    return (
      <DashboardLayout userRole="student">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div>Loading timer data...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="student">
      <div className="welcome-section">
        <h1 className="welcome-title">Study Timer ⏰</h1>
        <p className="welcome-subtitle">Use the Pomodoro technique and other timing methods to enhance your study sessions</p>
      </div>

      <div className="dashboard-grid">
        {/* Main Timer Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon primary">
              <TimerIcon />
            </div>
            <div>
              <h3 className="card-title">{isBreak ? 'Break Time' : 'Study Time'}</h3>
              <p className="card-subtitle">{isBreak ? 'Take a well-deserved break' : 'Focus on your studies'}</p>
            </div>
          </div>
          <div className="card-content">
            <div style={{textAlign: 'center', margin: '20px 0'}}>
              <div style={{
                fontSize: '48px', 
                fontWeight: 'bold', 
                color: isBreak ? '#95E1D3' : '#F38181',
                marginBottom: '10px',
                fontFamily: 'monospace'
              }}>
                {formatTime(timeLeft)}
              </div>
              <div style={{display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap'}}>
                {!isRunning ? (
                  <button 
                    onClick={startTimer}
                    style={{
                      background: '#95E1D3',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '25px',
                      color: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <PlayArrowIcon /> {timeLeft === (isBreak ? breakTime * 60 : sessionTime * 60) ? 'Start' : 'Resume'}
                  </button>
                ) : (
                  <button 
                    onClick={pauseTimer}
                    style={{
                      background: '#FCE38A',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '25px',
                      color: '#333',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <PauseIcon /> Pause
                  </button>
                )}
                <button 
                  onClick={stopTimer}
                  style={{
                    background: '#F38181',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '25px',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <StopIcon /> Stop
                </button>
                <button 
                  onClick={resetTimer}
                  style={{
                    background: '#666',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '25px',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Session Card */}
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
            <div style={{marginTop: '15px'}}>
              <div style={{marginBottom: '10px'}}>
                <label style={{display: 'block', marginBottom: '5px', fontWeight: '500'}}>Study Duration:</label>
                <input 
                  type="number" 
                  value={sessionTime}
                  onChange={(e) => setSessionTime(parseInt(e.target.value) || 25)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '5px'
                  }} 
                /> minutes
              </div>
              <div style={{marginBottom: '15px'}}>
                <label style={{display: 'block', marginBottom: '5px', fontWeight: '500'}}>Break Duration:</label>
                <input 
                  type="number" 
                  value={breakTime}
                  onChange={(e) => setBreakTime(parseInt(e.target.value) || 5)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '5px'
                  }} 
                /> minutes
              </div>
              <button 
                onClick={startCustomSession}
                style={{
                  background: '#FCE38A',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '25px',
                  color: '#333',
                  cursor: 'pointer',
                  width: '100%',
                  fontWeight: '500'
                }}
              >
                Start Custom Session
              </button>
            </div>
          </div>
        </div>

        {/* Session Statistics */}
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon accent">
              <HistoryIcon />
            </div>
            <div>
              <h3 className="card-title">Today's Progress</h3>
              <p className="card-subtitle">Track your productivity</p>
            </div>
          </div>
          <div className="card-content">
            <div style={{marginTop: '15px'}}>
              <div style={{marginBottom: '10px', padding: '10px', background: '#f8f9fa', borderRadius: '8px'}}>
                <strong>Sessions Completed</strong><br />
                <small style={{color: '#666'}}>{sessionsCompleted} sessions today</small>
              </div>
              <div style={{marginBottom: '10px', padding: '10px', background: '#f8f9fa', borderRadius: '8px'}}>
                <strong>Study Time Today</strong><br />
                <small style={{color: '#666'}}>{todayStudyTime.toFixed(1)} hours</small>
              </div>
              <div style={{padding: '10px', background: '#f8f9fa', borderRadius: '8px'}}>
                <strong>Current Goal</strong><br />
                <small style={{color: '#666'}}>20 hours per week</small>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon primary">
              <HistoryIcon />
            </div>
            <div>
              <h3 className="card-title">Recent Sessions</h3>
              <p className="card-subtitle">Your study history</p>
            </div>
          </div>
          <div className="card-content">
            {sessionHistory.length > 0 ? (
              <div style={{marginTop: '15px'}}>
                {sessionHistory.slice(0, 5).map((session, index) => (
                  <div key={index} style={{marginBottom: '8px', padding: '8px', background: '#f8f9fa', borderRadius: '6px'}}>
                    <strong>{session.duration} min session</strong><br />
                    <small style={{color: '#666'}}>
                      {new Date(session.completed_at).toLocaleString()}
                    </small>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{marginTop: '15px', padding: '10px', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center', color: '#666'}}>
                No sessions recorded yet
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default StudyTimer;
