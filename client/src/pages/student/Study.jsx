import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../Components/DashboardLayout';
import { useAuth0 } from '@auth0/auth0-react';
import { Timer as TimerIcon, PlayArrow as PlayArrowIcon, Pause as PauseIcon, Stop as StopIcon, History as HistoryIcon, VolumeOff as VolumeOffIcon, VolumeUp as VolumeUpIcon, TrendingUp as TrendingUpIcon, Flag as TargetIcon, Edit as EditIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { Typography, Box, Card, CardContent, Grid, Button, TextField, CircularProgress, Alert, LinearProgress, Chip, List, ListItem, ListItemText, ListItemIcon, Divider } from '@mui/material';
import { useUserSyncContext } from '../../contexts/UserSyncContext';
import { apiService } from '../../services/api';
import '../../styles/DashboardLayout.css';
import '../../styles/HomeworkCard.css';

function Study() {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();
  const { syncStatus } = useUserSyncContext();
  
  // Timer state
  const [isRunning, setIsRunning] = useState(() => {
    const saved = localStorage.getItem('studyTimer_isRunning');
    return saved ? JSON.parse(saved) : false;
  });
  const [isBreak, setIsBreak] = useState(() => {
    const saved = localStorage.getItem('studyTimer_isBreak');
    return saved ? JSON.parse(saved) : false;
  });
  const [timeLeft, setTimeLeft] = useState(() => {
    const saved = localStorage.getItem('studyTimer_timeLeft');
    return saved ? parseInt(saved) : 25 * 60; // 25 minutes in seconds
  });
  const [sessionTime, setSessionTime] = useState(() => {
    const saved = localStorage.getItem('studyTimer_sessionTime');
    return saved ? parseInt(saved) : 25;
  });
  const [breakTime, setBreakTime] = useState(() => {
    const saved = localStorage.getItem('studyTimer_breakTime');
    return saved ? parseInt(saved) : 5;
  });
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [todayStudyTime, setTodayStudyTime] = useState(0);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Study Progress state
  const [studyData, setStudyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [weeklyGoal, setWeeklyGoal] = useState(20); // Default 20 hours
  const [editingGoal, setEditingGoal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Save timer state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('studyTimer_isRunning', JSON.stringify(isRunning));
  }, [isRunning]);

  useEffect(() => {
    localStorage.setItem('studyTimer_isBreak', JSON.stringify(isBreak));
  }, [isBreak]);

  useEffect(() => {
    localStorage.setItem('studyTimer_timeLeft', timeLeft.toString());
  }, [timeLeft]);

  useEffect(() => {
    localStorage.setItem('studyTimer_sessionTime', sessionTime.toString());
  }, [sessionTime]);

  useEffect(() => {
    localStorage.setItem('studyTimer_breakTime', breakTime.toString());
  }, [breakTime]);

  // Play notification sound
  const playNotificationSound = () => {
    if (!audioEnabled) return;
    
    try {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // 800Hz tone
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
      
      console.log('Notification sound played');
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  // Fetch study timer data
  useEffect(() => {
    const fetchTimerData = async () => {
      try {
        const response = await apiService.studentDashboard.getStudyTimer();
        const data = response.data;
        
        setTodayStudyTime(data.today_hours || 0);
        setSessionHistory(data.recent_sessions || []);
        setSessionsCompleted(data.sessions_today || 0);
      } catch (err) {
        console.error('Error fetching timer data:', err);
        setError('Failed to load timer data');
      }
    };

    if (syncStatus === 'synced') {
      fetchTimerData();
    }
  }, [syncStatus]);

  // Fetch study progress data
  useEffect(() => {
    const fetchStudyProgress = async () => {
      if (!isAuthenticated) return;
      setLoading(true);
      setError(null);
      try {
        const token = await getAccessTokenSilently();
        const response = await apiService.studentDashboard.getStudyProgress(30); // Last 30 days
        setStudyData(response.data);
        
        // Debug logging for study progress data
        console.log('=== STUDY PROGRESS DATA DEBUG ===');
        console.log('Study progress data received:', response.data);
        console.log('Weekly breakdown:', response.data.weekly_breakdown);
        console.log('Overview:', response.data.overview);
        console.log('Recent sessions:', response.data.recent_sessions);
        console.log('=== END STUDY PROGRESS DATA DEBUG ===');
        
        // Set weekly goal from data or default
        if (response.data.overview?.weekly_goal) {
          setWeeklyGoal(response.data.overview.weekly_goal);
        }
      } catch (err) {
        console.error('Error fetching study progress:', err);
        setError(err.response?.data?.error || 'Failed to fetch study progress data.');
      } finally {
        setLoading(false);
      }
    };

    fetchStudyProgress();
  }, [isAuthenticated, getAccessTokenSilently]);

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
      
      // Play notification sound
      playNotificationSound();
      
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
      
      console.log('Attempting to save study session:', {
        date: today.toISOString(),
        hours_studied: sessionHours,
        sessionTime: sessionTime
      });
      
      const response = await apiService.studentDashboard.saveStudySession({
        date: today.toISOString(),
        hours_studied: sessionHours,
        tasks_completed: `Completed ${sessionTime}-minute Pomodoro session`,
        goal_achieved: true,
        focus_rating: 4, // Default good focus rating
        difficulty_rating: 3, // Default medium difficulty
        subjects_studied: [{ subject: 'General Study', hours: sessionHours }]
      });
      
      console.log('Study session save response:', response.data);
      
      // Clear localStorage after successful save
      localStorage.removeItem('studyTimer_isRunning');
      localStorage.removeItem('studyTimer_isBreak');
      localStorage.removeItem('studyTimer_timeLeft');
      
      // Refresh the timer data to show updated stats
      const timerDataResponse = await apiService.studentDashboard.getStudyTimer();
      const timerData = timerDataResponse.data;
      setTodayStudyTime(timerData.today_hours || 0);
      setSessionHistory(timerData.recent_sessions || []);
      setSessionsCompleted(timerData.sessions_today || 0);
      
      console.log('Study session saved successfully and data refreshed');
    } catch (err) {
      console.error('Error saving session:', err);
      console.error('Error details:', err.response?.data);
      setError(`Failed to save session: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleUpdateWeeklyGoal = async () => {
    setSubmitting(true);
    try {
      const token = await getAccessTokenSilently();
      // This endpoint would need to be created on the backend
      await apiService.studentDashboard.updateWeeklyGoal(weeklyGoal);
      setEditingGoal(false);
      // Refresh data
      const response = await apiService.studentDashboard.getStudyProgress(30);
      setStudyData(response.data);
    } catch (err) {
      console.error('Error updating weekly goal:', err);
      setError('Failed to update weekly goal. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getProgressPercentage = () => {
    if (!studyData || !weeklyGoal) return 0;
    return Math.min((studyData.overview?.total_hours / weeklyGoal) * 100, 100);
  };

  const getProgressColor = () => {
    const percentage = getProgressPercentage();
    if (percentage >= 100) return 'success';
    if (percentage >= 75) return 'primary';
    if (percentage >= 50) return 'warning';
    return 'error';
  };

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Format study time - show minutes if less than 1 hour, otherwise show hours
  const formatStudyTime = (hours) => {
    if (!hours || hours === 0) return '0 min';
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `${minutes} min`;
    }
    return `${hours.toFixed(1)}h`;
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
    
    // Clear localStorage when resetting
    localStorage.removeItem('studyTimer_isRunning');
    localStorage.removeItem('studyTimer_isBreak');
    localStorage.removeItem('studyTimer_timeLeft');
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
          <div>Loading study data...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout userRole="student">
        <Alert severity="error">{error}</Alert>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="student">
      <div className="dashboard-grid">
        {/* First row: Timer, Custom Sessions, Weekly Goal - share width and fit the page */}
        <Box sx={{ gridColumn: '1 / -1', display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {/* Main Timer Card */}
        <div className="dashboard-card" style={{ flex: '1 1 280px', minWidth: 0 }}>
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
            <div style={{textAlign: 'center', margin: '25px 0'}}>
              <div style={{
                fontSize: '56px', 
                fontWeight: '200',
                color: '#666',
                marginBottom: '15px',
                fontFamily: '"SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif',
                letterSpacing: '0.5px'
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
                      background: '#95E1D3',
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
                <div style={{marginTop: '15px', display: 'flex', justifyContent: 'center'}}>
                  <button 
                    onClick={() => setAudioEnabled(!audioEnabled)}
                    style={{
                      background: audioEnabled ? '#D6F7AD' : '#FCE38A',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      color: '#333',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '14px'
                    }}
                  >
                    {audioEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
                    {audioEnabled ? 'Sound On' : 'Sound Off'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Custom Session Card */}
          <div className="dashboard-card" style={{ flex: '1 1 280px', minWidth: 0 }}>
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
              <div style={{marginTop: '20px'}}>
                <div style={{marginBottom: '15px'}}>
                  <label style={{display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px'}}>Study Duration:</label>
                  <input 
                    type="number" 
                    value={sessionTime}
                    onChange={(e) => setSessionTime(parseInt(e.target.value) || 25)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }} 
                  /> <span style={{fontSize: '14px', fontWeight: '500'}}>minutes</span>
                </div>
                <div style={{marginBottom: '20px'}}>
                  <label style={{display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px'}}>Break Duration:</label>
                  <input 
                    type="number" 
                    value={breakTime}
                    onChange={(e) => setBreakTime(parseInt(e.target.value) || 5)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }} 
                  /> <span style={{fontSize: '14px', fontWeight: '500'}}>minutes</span>
                </div>
                <button 
                  onClick={startCustomSession}
                  style={{
                    background: '#FCE38A',
                    border: 'none',
                    padding: '12px 20px',
                    borderRadius: '25px',
                    color: '#333',
                    cursor: 'pointer',
                    width: '100%',
                    fontWeight: '600',
                    fontSize: '14px'
                  }}
                >
                  Start Custom Session
                </button>
              </div>
            </div>
          </div>

          {/* Weekly Goal Card */}
          <div className="dashboard-card" style={{ flex: '1 1 280px', minWidth: 0 }}>
            <div className="card-header">
              <div className="card-icon primary">
                <TargetIcon />
              </div>
              <div>
                <h3 className="card-title">Weekly Goal</h3>
                <p className="card-subtitle">Set your study target</p>
              </div>
            </div>
            <div className="card-content">
              {editingGoal ? (
                <Box sx={{ mb: 2 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Weekly Goal (hours)"
                    value={weeklyGoal}
                    onChange={(e) => setWeeklyGoal(parseInt(e.target.value) || 0)}
                    sx={{ mb: 2 }}
                  />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      onClick={handleUpdateWeeklyGoal}
                      disabled={submitting}
                      sx={{ 
                        backgroundColor: '#fff',
                        color: '#333',
                        fontSize: '12px',
                        padding: '8px 16px',
                        border: '1px solid rgba(0, 0, 0, 0.12)',
                        '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)', border: '1px solid rgba(0, 0, 0, 0.2)' }
                      }}
                    >
                      {submitting ? 'Saving...' : 'Save Goal'}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => setEditingGoal(false)}
                      disabled={submitting}
                      sx={{ 
                        backgroundColor: 'rgba(0,0,0,0.04)',
                        color: '#333',
                        fontSize: '12px',
                        padding: '8px 16px',
                        border: '1px solid rgba(0, 0, 0, 0.12)',
                        '&:hover': { backgroundColor: 'rgba(0,0,0,0.08)', border: '1px solid rgba(0, 0, 0, 0.2)' }
                      }}
                    >
                      Cancel
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 2, gap: 1 }}>
                  <Typography variant="h6" sx={{ color: '#666', fontWeight: 'bold', fontSize: '1.2rem' }}>
                    {weeklyGoal} hours/week
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => setEditingGoal(true)}
                    disabled={editingGoal}
                    sx={{ 
                      minWidth: 'auto',
                      padding: '4px',
                      color: '#333',
                      '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
                    }}
                  >
                    <EditIcon sx={{ fontSize: '18px' }} />
                  </Button>
                </Box>
              )}

              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body1" sx={{ color: '#666', fontWeight: '500' }}>
                    This Week: {(() => {
                      // Calculate this week's total study hours
                      const today = new Date();
                      const startOfWeek = new Date(today);
                      startOfWeek.setDate(today.getDate() - today.getDay()); // Start from Sunday
                      startOfWeek.setHours(0, 0, 0, 0);
                      
                      let thisWeekHours = 0;
                      if (studyData?.recent_sessions) {
                        studyData.recent_sessions.forEach(session => {
                          const sessionDate = new Date(session.date);
                          if (sessionDate >= startOfWeek) {
                            thisWeekHours += session.hours_studied || 0;
                          }
                        });
                      }
                      return formatStudyTime(thisWeekHours);
                    })()}
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#666', fontWeight: '500' }}>
                    {(() => {
                      // Calculate this week's progress percentage
                      const today = new Date();
                      const startOfWeek = new Date(today);
                      startOfWeek.setDate(today.getDate() - today.getDay());
                      startOfWeek.setHours(0, 0, 0, 0);
                      
                      let thisWeekHours = 0;
                      if (studyData?.recent_sessions) {
                        studyData.recent_sessions.forEach(session => {
                          const sessionDate = new Date(session.date);
                          if (sessionDate >= startOfWeek) {
                            thisWeekHours += session.hours_studied || 0;
                          }
                        });
                      }
                      return weeklyGoal > 0 ? Math.min((thisWeekHours / weeklyGoal) * 100, 100).toFixed(1) : 0;
                    })()}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(() => {
                    // Calculate this week's progress percentage
                    const today = new Date();
                    const startOfWeek = new Date(today);
                    startOfWeek.setDate(today.getDate() - today.getDay());
                    startOfWeek.setHours(0, 0, 0, 0);
                    
                    let thisWeekHours = 0;
                    if (studyData?.recent_sessions) {
                      studyData.recent_sessions.forEach(session => {
                        const sessionDate = new Date(session.date);
                        if (sessionDate >= startOfWeek) {
                          thisWeekHours += session.hours_studied || 0;
                        }
                      });
                    }
                    return weeklyGoal > 0 ? Math.min((thisWeekHours / weeklyGoal) * 100, 100) : 0;
                  })()}
                  color={(() => {
                    const today = new Date();
                    const startOfWeek = new Date(today);
                    startOfWeek.setDate(today.getDate() - today.getDay());
                    startOfWeek.setHours(0, 0, 0, 0);
                    
                    let thisWeekHours = 0;
                    if (studyData?.recent_sessions) {
                      studyData.recent_sessions.forEach(session => {
                        const sessionDate = new Date(session.date);
                        if (sessionDate >= startOfWeek) {
                          thisWeekHours += session.hours_studied || 0;
                        }
                      });
                    }
                    const percentage = weeklyGoal > 0 ? (thisWeekHours / weeklyGoal) * 100 : 0;
                    if (percentage >= 100) return 'success';
                    if (percentage >= 75) return 'primary';
                    if (percentage >= 50) return 'warning';
                    return 'error';
                  })()}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={`${studyData?.overview?.total_study_days || 0} study days`}
                  sx={{ 
                    backgroundColor: 'rgba(149, 225, 211, 0.3)', 
                    color: '#333',
                    border: '1px solid #95E1D3',
                    fontSize: '12px',
                    height: '28px'
                  }}
                  variant="outlined"
                  size="small"
                />
                <Chip
                  label={`${formatStudyTime(studyData?.overview?.average_hours_per_day || 0)} daily avg`}
                  sx={{ 
                    backgroundColor: 'rgba(214, 247, 173, 0.3)', 
                    color: '#333',
                    border: '1px solid #D6F7AD',
                    fontSize: '12px',
                    height: '28px'
                  }}
                  variant="outlined"
                  size="small"
                />
              </Box>
            </div>
          </div>
          </Box>

          {/* Study Analytics & Recent Sessions side by side */}
          <Box sx={{ gridColumn: '1 / -1', display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'stretch' }}>
          {/* Combined Study Statistics & Weekly Breakdown */}
          <div className="dashboard-card" style={{ flex: '0 0 auto', width: '100%', maxWidth: '560px', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', boxSizing: 'border-box' }}>
            <div className="card-header" style={{ flexShrink: 0 }}>
              <div className="card-icon secondary">
                <TrendingUpIcon />
              </div>
              <div style={{ minWidth: 0 }}>
                <h3 className="card-title">Study Analytics & Weekly Progress</h3>
                <p className="card-subtitle">Your comprehensive study overview</p>
              </div>
            </div>
            <div className="card-content" style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', width: '100%', boxSizing: 'border-box' }}>
              {/* Statistics Row */}
              <Grid container spacing={2} sx={{ mb: 2, justifyContent: 'center', width: '100%', maxWidth: '100%' }}>
                <Grid item xs={3} sx={{ minWidth: 0 }}>
                  <Box sx={{ textAlign: 'center', p: 1.5, backgroundColor: 'rgba(149, 225, 211, 0.3)', borderRadius: 2, color: '#333', minHeight: '72px', display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '100%', boxSizing: 'border-box' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5, fontSize: '1rem' }} noWrap>{formatStudyTime(studyData?.overview?.total_hours || 0)}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: '500', fontSize: '0.7rem' }}>Total Study Time</Typography>
                  </Box>
                </Grid>
                <Grid item xs={3} sx={{ minWidth: 0 }}>
                  <Box sx={{ textAlign: 'center', p: 1.5, backgroundColor: 'rgba(214, 247, 173, 0.3)', borderRadius: 2, color: '#333', minHeight: '72px', display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '100%', boxSizing: 'border-box' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5, fontSize: '1rem' }}>{studyData?.overview?.total_study_days || 0}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: '500', fontSize: '0.7rem' }}>Study Days</Typography>
                  </Box>
                </Grid>
                <Grid item xs={3} sx={{ minWidth: 0 }}>
                  <Box sx={{ textAlign: 'center', p: 1.5, backgroundColor: 'rgba(252, 227, 138, 0.3)', borderRadius: 2, color: '#333', minHeight: '72px', display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '100%', boxSizing: 'border-box' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5, fontSize: '1rem' }}>{studyData?.overview?.study_consistency || 0}%</Typography>
                    <Typography variant="body2" sx={{ fontWeight: '500', fontSize: '0.7rem' }}>Consistency</Typography>
                  </Box>
                </Grid>
                <Grid item xs={3} sx={{ minWidth: 0 }}>
                  <Box sx={{ textAlign: 'center', p: 1.5, backgroundColor: 'rgba(243, 129, 129, 0.3)', borderRadius: 2, color: '#333', minHeight: '72px', display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '100%', boxSizing: 'border-box' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5, fontSize: '1rem' }}>{studyData?.overview?.goal_achieved_days || 0}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: '500', fontSize: '0.7rem' }}>Goal Days</Typography>
                  </Box>
                </Grid>
              </Grid>

              {/* Weekly Breakdown Chart */}
              <Box sx={{ mt: 1, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', width: '100%' }}>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: '600', color: '#333', textAlign: 'center', fontSize: '1rem' }}>This Week's Study Progress</Typography>
                <Grid container spacing={1} sx={{ justifyContent: 'center', width: '100%', maxWidth: '100%', flex: 1, minHeight: 0 }}>
                  {(() => {
                    // Get current week's data
                    const today = new Date();
                    const startOfWeek = new Date(today);
                    startOfWeek.setDate(today.getDate() - today.getDay()); // Start from Sunday
                    startOfWeek.setHours(0, 0, 0, 0);
                    
                    const endOfWeek = new Date(startOfWeek);
                    endOfWeek.setDate(startOfWeek.getDate() + 6);
                    endOfWeek.setHours(23, 59, 59, 999);
                    
                    // Calculate daily study hours for this week
                    const weeklyData = [];
                    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    
                    for (let i = 0; i < 7; i++) {
                      const currentDay = new Date(startOfWeek);
                      currentDay.setDate(startOfWeek.getDate() + i);
                      
                      // Find study sessions for this day
                      let dayHours = 0;
                      if (studyData?.recent_sessions) {
                        studyData.recent_sessions.forEach(session => {
                          const sessionDate = new Date(session.date);
                          if (sessionDate >= currentDay && sessionDate < new Date(currentDay.getTime() + 24 * 60 * 60 * 1000)) {
                            dayHours += session.hours_studied || 0;
                          }
                        });
                      }
                      
                      weeklyData.push({
                        day: dayNames[i],
                        date: currentDay,
                        hours: dayHours
                      });
                    }
                    
                    return weeklyData.map((dayData, index) => {
                      const percentage = weeklyGoal > 0 ? (dayData.hours / weeklyGoal) * 100 : 0;
                      
                      return (
                        <Grid item xs key={index} sx={{ minWidth: 0, display: 'flex' }}>
                          <Box sx={{ textAlign: 'center', p: 0.75, width: '100%', minWidth: 0 }}>
                            <Typography variant="caption" sx={{ color: '#666', mb: 0.5, fontWeight: '500', display: 'block' }}>
                              {dayData.day}
                            </Typography>
                            <Box sx={{ height: 80, display: 'flex', alignItems: 'end', justifyContent: 'center', mb: 0.5 }}>
                              <Box
                                sx={{
                                  width: '80%',
                                  height: `${Math.max(percentage, 8)}%`,
                                  backgroundColor: percentage >= 100 ? '#95E1D3' : 
                                          percentage >= 75 ? '#D6F7AD' : 
                                          percentage >= 50 ? '#FCE38A' : '#F38181',
                                  borderRadius: 1,
                                  minHeight: 6,
                                  transition: 'all 0.3s ease',
                                  '&:hover': {
                                    transform: 'scaleY(1.1)',
                                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                                  }
                                }}
                              />
                            </Box>
                            <Typography variant="body2" fontWeight="bold" sx={{ color: '#333' }}>
                              {formatStudyTime(dayData.hours)}
                            </Typography>
                          </Box>
                        </Grid>
                      );
                    });
                  })()}
                </Grid>
              </Box>
            </div>
          </div>

          {/* Recent Study Sessions */}
          <div className="dashboard-card" style={{ flex: '1 1 280px', minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="card-header" style={{ flexShrink: 0 }}>
              <div className="card-icon primary">
                <HistoryIcon />
              </div>
              <div>
                <h3 className="card-title">Recent Study Sessions</h3>
                <p className="card-subtitle">Your latest study activity</p>
              </div>
            </div>
            <div className="card-content" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
              {studyData?.recent_sessions?.length > 0 ? (
                <List sx={{ mt: 1 }}>
                  {studyData.recent_sessions.map((session, index) => (
                    <React.Fragment key={index}>
                      <ListItem sx={{ 
                        backgroundColor: 'rgba(149, 225, 211, 0.1)', 
                        borderRadius: 1, 
                        mb: 1,
                        py: 1.5,
                        px: 2
                      }}>
                        <ListItemIcon>
                          <CheckCircleIcon sx={{ color: '#95E1D3', fontSize: '20px' }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="body1" sx={{ fontWeight: '600', color: '#333' }}>
                              {formatStudyTime(session.hours_studied)} study session
                            </Typography>
                          }
                          secondary={
                            <Typography variant="body2" sx={{ color: '#666', mt: 0.5 }}>
                              Completed on {new Date(session.date).toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })} - {session.tasks_completed}
                            </Typography>
                          }
                        />
                      </ListItem>
                      {index < studyData.recent_sessions.length - 1 && <Divider sx={{ my: 0.5 }} />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" sx={{ color: '#666', mb: 1 }}>
                    No study sessions recorded yet
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#999' }}>
                    Start a timer to begin tracking your study progress!
                  </Typography>
                </Box>
              )}
            </div>
          </div>
          </Box>
        </div>
    </DashboardLayout>
  );
}

export default Study;
