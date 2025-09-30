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

  if (loading) {
    return (
      <DashboardLayout userRole="student">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
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
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Study Progress 📊
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Track your study habits and set goals to improve your academic performance
        </Typography>

        <Grid container spacing={3}>
          {/* Weekly Goal Card */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TargetIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Weekly Goal</Typography>
                  </Box>
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => setEditingGoal(true)}
                    disabled={editingGoal}
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
                      >
                        {submitting ? 'Saving...' : 'Save Goal'}
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => setEditingGoal(false)}
                        disabled={submitting}
                      >
                        Cancel
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Typography variant="h4" color="primary" sx={{ mb: 2 }}>
                    {weeklyGoal} hours/week
                  </Typography>
                )}

                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      This Week: {studyData?.overview?.total_hours || 0} hours
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
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
                    color="primary"
                    variant="outlined"
                    size="small"
                  />
                  <Chip
                    label={`${studyData?.overview?.average_hours_per_day?.toFixed(1) || 0}h daily avg`}
                    color="secondary"
                    variant="outlined"
                    size="small"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Study Statistics */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <TrendingUpIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Study Statistics</Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', borderRadius: 2, color: 'white' }}>
                      <Typography variant="h4">{studyData?.overview?.total_hours || 0}</Typography>
                      <Typography variant="body2">Total Hours</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'secondary.light', borderRadius: 2, color: 'white' }}>
                      <Typography variant="h4">{studyData?.overview?.total_study_days || 0}</Typography>
                      <Typography variant="body2">Study Days</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 2, color: 'white' }}>
                      <Typography variant="h4">{studyData?.overview?.study_consistency || 0}</Typography>
                      <Typography variant="body2">Consistency %</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.light', borderRadius: 2, color: 'white' }}>
                      <Typography variant="h4">{studyData?.overview?.goal_achieved_days || 0}</Typography>
                      <Typography variant="body2">Goal Days</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Weekly Breakdown */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <HistoryIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Weekly Breakdown</Typography>
                </Box>

                <Grid container spacing={1}>
                  {studyData?.weekly_breakdown?.map((week, index) => {
                    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                    const hours = week.total_hours || 0;
                    const percentage = weeklyGoal > 0 ? (hours / weeklyGoal) * 100 : 0;
                    
                    return (
                      <Grid item xs key={index}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="caption" color="text.secondary">
                            {dayNames[index]}
                          </Typography>
                          <Box sx={{ height: 100, display: 'flex', alignItems: 'end', justifyContent: 'center', mb: 1 }}>
                            <Box
                              sx={{
                                width: '100%',
                                height: `${Math.max(percentage, 5)}%`,
                                bgcolor: percentage >= 100 ? 'success.main' : 
                                        percentage >= 75 ? 'primary.main' : 
                                        percentage >= 50 ? 'warning.main' : 'error.main',
                                borderRadius: 1,
                                minHeight: 4
                              }}
                            />
                          </Box>
                          <Typography variant="body2" fontWeight="bold">
                            {hours.toFixed(1)}h
                          </Typography>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Sessions */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <HistoryIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Recent Study Sessions</Typography>
                </Box>

                {studyData?.recent_sessions?.length > 0 ? (
                  <List>
                    {studyData.recent_sessions.map((session, index) => (
                      <React.Fragment key={index}>
                        <ListItem>
                          <ListItemIcon>
                            <CheckCircleIcon color="success" />
                          </ListItemIcon>
                          <ListItemText
                            primary={`${(session.hours_studied * 60).toFixed(0)} minute session`}
                            secondary={`Completed on ${new Date(session.date).toLocaleDateString()} - ${session.tasks_completed}`}
                          />
                        </ListItem>
                        {index < studyData.recent_sessions.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                    No study sessions recorded yet. Start a timer to begin tracking!
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </DashboardLayout>
  );
};

export default StudyProgress;
