import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../Components/DashboardLayout';
import { useAuth0 } from '@auth0/auth0-react';
import { apiService } from '../../services/api';
import { 
  Box, Typography, Card, CardContent, Grid, Button, TextField, 
  CircularProgress, Alert, LinearProgress, Chip, List, ListItem, 
  ListItemText, ListItemIcon, Divider
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Flag as TargetIcon,
  History as HistoryIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import '../../styles/HomeworkCard.css';

const StudyProgress = () => {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();
  const [studyData, setStudyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [weeklyGoal, setWeeklyGoal] = useState(20); // Default 20 hours
  const [editingGoal, setEditingGoal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  // Format study time - show minutes if less than 1 hour, otherwise show hours
  const formatStudyTime = (hours) => {
    if (!hours || hours === 0) return '0 min';
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `${minutes} min`;
    }
    return `${hours.toFixed(1)}h`;
  };

  if (loading) {
    return (
      <DashboardLayout userRole="student">
        <div className="white-page-background">
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
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
      <div className="white-page-background">
        <Box sx={{ p: 3 }}>
          <Grid container spacing={3}>
          {/* Row 1: Weekly Goal Card and Study Statistics */}
          <Grid item xs={12} md={6}>
            <div className="dashboard-card" style={{ height: '100%' }}>
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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => setEditingGoal(true)}
                    disabled={editingGoal}
                    sx={{ 
                      backgroundColor: '#95E1D3', 
                      color: 'white',
                      '&:hover': { backgroundColor: '#7dd3c0' }
                    }}
                  >
                    Edit Goal
                  </Button>
                </Box>

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
                        variant="contained"
                        onClick={handleUpdateWeeklyGoal}
                        disabled={submitting}
                        startIcon={submitting ? <CircularProgress size={16} /> : <CheckCircleIcon />}
                        sx={{ 
                          backgroundColor: '#D6F7AD', 
                          color: '#333',
                          '&:hover': { backgroundColor: '#c8f299' }
                        }}
                      >
                        {submitting ? 'Saving...' : 'Save Goal'}
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => setEditingGoal(false)}
                        disabled={submitting}
                        sx={{ 
                          borderColor: '#F38181', 
                          color: '#F38181',
                          '&:hover': { borderColor: '#e85a6b', backgroundColor: 'rgba(243, 129, 129, 0.1)' }
                        }}
                      >
                        Cancel
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Typography variant="h4" sx={{ color: '#F38181', fontWeight: 'bold', mb: 2 }}>
                    {weeklyGoal} hours/week
                  </Typography>
                )}

                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ color: '#666' }}>
                      This Week: {formatStudyTime(studyData?.overview?.total_hours || 0)}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#666' }}>
                      {getProgressPercentage().toFixed(1)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={getProgressPercentage()}
                    color={getProgressColor()}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label={`${studyData?.overview?.total_study_days || 0} sessions today`}
                    sx={{ 
                      backgroundColor: 'rgba(149, 225, 211, 0.3)', 
                      color: '#333',
                      border: '1px solid #95E1D3'
                    }}
                    variant="outlined"
                    size="small"
                  />
                  <Chip
                    label={`${formatStudyTime(studyData?.overview?.average_hours_per_day || 0)} daily avg`}
                    sx={{ 
                      backgroundColor: 'rgba(214, 247, 173, 0.3)', 
                      color: '#333',
                      border: '1px solid #D6F7AD'
                    }}
                    variant="outlined"
                    size="small"
                  />
                </Box>
              </div>
            </div> 
          </Grid>

          {/* Study Statistics */}
          <Grid item xs={12} md={6}>
            <div className="dashboard-card" style={{ height: '100%' }}>
              <div className="card-header">
                <div className="card-icon secondary">
                  <TrendingUpIcon />
                </div>
                <div>
                  <h3 className="card-title">Study Statistics</h3>
                  <p className="card-subtitle">Your study overview</p>
                </div>
              </div>
              <div className="card-content">
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center', p: 2, backgroundColor: 'rgba(149, 225, 211, 0.3)', borderRadius: 2, color: '#333' }}>
                      <Typography variant="h4">{formatStudyTime(studyData?.overview?.total_hours || 0)}</Typography>
                      <Typography variant="body2">Total Study Time</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center', p: 2, backgroundColor: 'rgba(214, 247, 173, 0.3)', borderRadius: 2, color: '#333' }}>
                      <Typography variant="h4">{studyData?.overview?.total_study_days || 0}</Typography>
                      <Typography variant="body2">Study Days</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center', p: 2, backgroundColor: 'rgba(252, 227, 138, 0.3)', borderRadius: 2, color: '#333' }}>
                      <Typography variant="h4">{studyData?.overview?.study_consistency || 0}</Typography>
                      <Typography variant="body2">Consistency %</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center', p: 2, backgroundColor: 'rgba(243, 129, 129, 0.3)', borderRadius: 2, color: '#333' }}>
                      <Typography variant="h4">{studyData?.overview?.goal_achieved_days || 0}</Typography>
                      <Typography variant="body2">Goal Days</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </div>
            </div>
          </Grid>

          {/* Row 2: Weekly Breakdown */}
          <Grid item xs={12} md={6}>
            <div className="dashboard-card" style={{ height: '100%' }}>
              <div className="card-header">
                <div className="card-icon accent">
                  <HistoryIcon />
                </div>
                <div>
                  <h3 className="card-title">Weekly Breakdown</h3>
                  <p className="card-subtitle">Daily study progress</p>
                </div>
              </div>
              <div className="card-content">
                <Grid container spacing={1}>
                  {studyData?.weekly_breakdown && studyData.weekly_breakdown.length > 0 ? (
                    studyData.weekly_breakdown.map((week, index) => {
                      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                      const hours = week.total_hours || 0;
                      const percentage = weeklyGoal > 0 ? (hours / weeklyGoal) * 100 : 0;
                      
                      return (
                        <Grid item xs key={index}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="caption" sx={{ color: '#666' }}>
                              {dayNames[index] || `Day ${index + 1}`}
                            </Typography>
                            <Box sx={{ height: 100, display: 'flex', alignItems: 'end', justifyContent: 'center', mb: 1 }}>
                              <Box
                                sx={{
                                  width: '100%',
                                  height: `${Math.max(percentage, 5)}%`,
                                  backgroundColor: percentage >= 100 ? '#95E1D3' : 
                                          percentage >= 75 ? '#D6F7AD' : 
                                          percentage >= 50 ? '#FCE38A' : '#F38181',
                                  borderRadius: 1,
                                  minHeight: 4
                                }}
                              />
                            </Box>
                            <Typography variant="body2" fontWeight="bold">
                              {formatStudyTime(hours)}
                            </Typography>
                          </Box>
                        </Grid>
                      );
                    })
                  ) : (
                    // Show 7 empty bars if no data
                    Array.from({ length: 7 }, (_, index) => {
                      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                      return (
                        <Grid item xs key={index}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="caption" sx={{ color: '#666' }}>
                              {dayNames[index]}
                            </Typography>
                            <Box sx={{ height: 100, display: 'flex', alignItems: 'end', justifyContent: 'center', mb: 1 }}>
                              <Box
                                sx={{
                                  width: '100%',
                                  height: '5%',
                                  backgroundColor: '#e0e0e0',
                                  borderRadius: 1,
                                  minHeight: 4
                                }}
                              />
                            </Box>
                            <Typography variant="body2" fontWeight="bold">
                              0h
                            </Typography>
                          </Box>
                        </Grid>
                      );
                    })
                  )}
                </Grid>
              </div>
            </div>
          </Grid>

          {/* Recent Sessions */}
          <Grid item xs={12} md={6}>
            <div className="dashboard-card" style={{ height: '100%' }}>
              <div className="card-header">
                <div className="card-icon primary">
                  <HistoryIcon />
                </div>
                <div>
                  <h3 className="card-title">Recent Study Sessions</h3>
                  <p className="card-subtitle">Your latest study activity</p>
                </div>
              </div>
              <div className="card-content">
                {studyData?.recent_sessions?.length > 0 ? (
                  <List>
                    {studyData.recent_sessions.map((session, index) => (
                      <React.Fragment key={index}>
                        <ListItem sx={{ backgroundColor: 'rgba(149, 225, 211, 0.1)', borderRadius: 1, mb: 1 }}>
                          <ListItemIcon>
                            <CheckCircleIcon sx={{ color: '#95E1D3' }} />
                          </ListItemIcon>
                          <ListItemText
                            primary={`${formatStudyTime(session.hours_studied)} study session`}
                            secondary={`Completed on ${new Date(session.date).toLocaleDateString()} - ${session.tasks_completed}`}
                          />
                        </ListItem>
                        {index < studyData.recent_sessions.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" sx={{ textAlign: 'center', py: 3, color: '#666' }}>
                    No study sessions recorded yet. Start a timer to begin tracking!
                  </Typography>
                )}
              </div>
            </div>
          </Grid>
          </Grid>
        </Box>
      </div>
    </DashboardLayout>
  );
};

export default StudyProgress;
