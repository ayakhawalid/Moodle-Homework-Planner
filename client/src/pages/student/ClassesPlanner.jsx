import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../Components/DashboardLayout';
import { 
  Grid, 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  Alert, 
  CircularProgress,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Divider
} from '@mui/material';
import {
  CalendarToday as CalendarTodayIcon,
  School as SchoolIcon,
  AccessTime as AccessTimeIcon,
  LocationOn as LocationOnIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Today as TodayIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { apiService } from '../../services/api';
import { useUserSyncContext } from '../../contexts/UserSyncContext';
import '../../styles/student/ClassesPlanner.css';

function ClassesPlanner() {
  const { syncStatus } = useUserSyncContext();
  const [classesData, setClassesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(new Date());

  // Fetch classes data
  const fetchClassesData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Calculate week start (Sunday)
      const weekStart = new Date(currentWeek);
      const dayOfWeek = weekStart.getDay();
      weekStart.setDate(weekStart.getDate() - dayOfWeek);
      weekStart.setHours(0, 0, 0, 0);
      
      const response = await apiService.studentDashboard.getClassesPlanner(weekStart.toISOString());
      setClassesData(response.data);
    } catch (err) {
      console.error('Error fetching classes data:', err);
      setError('Failed to load classes data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassesData();
  }, [currentWeek]);

  // Navigate to previous week
  const goToPreviousWeek = () => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(newWeek.getDate() - 7);
    setCurrentWeek(newWeek);
  };

  // Navigate to next week
  const goToNextWeek = () => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(newWeek.getDate() + 7);
    setCurrentWeek(newWeek);
  };

  // Go to current week
  const goToCurrentWeek = () => {
    setCurrentWeek(new Date());
  };

  // Format time
  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get class type color
  const getClassTypeColor = (type) => {
    const colors = {
      lecture: { backgroundColor: 'rgba(149, 225, 211, 0.3)', color: '#333', border: '1px solid #95E1D3' },
      tutorial: { backgroundColor: 'rgba(214, 247, 173, 0.3)', color: '#333', border: '1px solid #D6F7AD' },
      lab: { backgroundColor: 'rgba(252, 227, 138, 0.3)', color: '#333', border: '1px solid #FCE38A' },
      seminar: { backgroundColor: 'rgba(243, 129, 129, 0.3)', color: '#333', border: '1px solid #F38181' }
    };
    return colors[type] || { backgroundColor: 'rgba(149, 225, 211, 0.3)', color: '#333', border: '1px solid #95E1D3' };
  };

  // Check if date is today
  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
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
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="student">
      <Typography variant="h4" className="classes-title" gutterBottom>
        <CalendarTodayIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Classes Planner
      </Typography>

      <Typography variant="body1" color="text.secondary" paragraph>
        Plan and organize your class schedules and academic calendar.
      </Typography>

          {/* Week Navigation */}
          <div className="dashboard-card" style={{ marginBottom: '24px' }}>
            <div className="card-content">
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box display="flex" alignItems="center" gap={2}>
                  <IconButton 
                    onClick={goToPreviousWeek} 
                    size="small"
                    sx={{ 
                      backgroundColor: '#95E1D3', 
                      color: 'white',
                      '&:hover': { backgroundColor: '#7dd3c0' }
                    }}
                  >
                    <ChevronLeftIcon />
                  </IconButton>
                  <Typography variant="h6">
                    {classesData?.week_start && new Date(classesData.week_start).toLocaleDateString()} - 
                    {classesData?.week_end && new Date(classesData.week_end).toLocaleDateString()}
                  </Typography>
                  <IconButton 
                    onClick={goToNextWeek} 
                    size="small"
                    sx={{ 
                      backgroundColor: '#95E1D3', 
                      color: 'white',
                      '&:hover': { backgroundColor: '#7dd3c0' }
                    }}
                  >
                    <ChevronRightIcon />
                  </IconButton>
                </Box>
                <Button 
                  variant="outlined" 
                  startIcon={<TodayIcon />}
                  onClick={goToCurrentWeek}
                  size="small"
                  sx={{ 
                    borderColor: '#D6F7AD', 
                    color: '#333',
                    '&:hover': { borderColor: '#c8f299', backgroundColor: 'rgba(214, 247, 173, 0.1)' }
                  }}
                >
                  Today
                </Button>
              </Box>
            </div>
          </div>

          {/* Class Statistics */}
          <div className="dashboard-card" style={{ marginBottom: '24px' }}>
            <div className="card-content">
              <Typography variant="h6" gutterBottom>
                <TrendingUpIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#95E1D3' }} />
                Weekly Overview
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Box textAlign="center">
                    <Typography variant="h4" sx={{ color: '#95E1D3' }}>
                      {classesData?.statistics?.total_classes || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Classes
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box textAlign="center">
                    <Typography variant="h4" sx={{ color: '#D6F7AD' }}>
                      {classesData?.statistics?.total_hours || 0}h
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Hours
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box textAlign="center">
                    <Typography variant="h4" sx={{ color: '#FCE38A' }}>
                      {classesData?.statistics?.average_classes_per_day || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Avg/Day
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </div>
          </div>

          {/* Weekly Schedule Grid */}
          <div className="dashboard-card">
            <div className="card-content">
              <Typography variant="h6" gutterBottom>
                <ScheduleIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#F38181' }} />
                Weekly Schedule
              </Typography>
            
            <div className="schedule-grid" style={{ background: 'transparent' }}>
              {classesData?.schedule?.map((day, index) => (
                <div key={index} className="schedule-day" style={{ background: 'rgba(255, 255, 255, 0.3)', backdropFilter: 'blur(10px)', borderRadius: '8px', border: '1px solid rgba(149, 225, 211, 0.3)' }}>
                  <div className="day-header" style={{ background: 'rgba(149, 225, 211, 0.2)', padding: '8px', borderRadius: '8px 8px 0 0' }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {day.day}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(day.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </Typography>
                    {isToday(new Date(day.date)) && (
                      <Chip 
                        label="Today" 
                        size="small" 
                        color="primary" 
                        sx={{ mt: 0.5 }}
                      />
                    )}
                  </div>
                  
                  {day.classes?.length > 0 ? (
                    day.classes.map((classItem) => (
                      <div key={classItem._id} className="class-slot" style={{ background: 'rgba(214, 247, 173, 0.2)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(214, 247, 173, 0.4)' }}>
                        <Box display="flex" flexDirection="column" gap={0.5}>
                          <Typography variant="body2" fontWeight="bold">
                            {classItem.topic}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {classItem.course?.code}
                          </Typography>
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <AccessTimeIcon sx={{ fontSize: 12 }} />
                            <Typography variant="caption">
                              {formatTime(classItem.start_time)} - {formatTime(classItem.end_time)}
                            </Typography>
                          </Box>
                          {classItem.room && (
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <LocationOnIcon sx={{ fontSize: 12 }} />
                              <Typography variant="caption">
                                {classItem.room}
                              </Typography>
                            </Box>
                          )}
                          <Chip 
                            label={classItem.class_type || 'lecture'} 
                            size="small" 
                            color={getClassTypeColor(classItem.class_type)}
                            sx={{ alignSelf: 'flex-start', fontSize: '0.7rem' }}
                          />
                        </Box>
                      </div>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      No classes
                    </Typography>
                  )}
                </div>
              ))}
            </div>
            </div>
          </div>

          {/* Class Details List */}
          {classesData?.schedule?.some(day => day.classes?.length > 0) && (
            <div className="dashboard-card" style={{ marginTop: '24px' }}>
              <div className="card-content">
                <Typography variant="h6" gutterBottom>
                  <AssignmentIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#F38181' }} />
                  Class Details
                </Typography>
              
              {classesData.schedule.map((day, dayIndex) => (
                day.classes?.length > 0 && (
                  <Box key={dayIndex} mb={2}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      {day.day} - {new Date(day.date).toLocaleDateString()}
                    </Typography>
                    <Divider sx={{ mb: 1 }} />
                    
                    {day.classes.map((classItem, classIndex) => (
                      <div key={classItem._id} className="dashboard-card" style={{ marginBottom: '8px' }}>
                        <div className="card-content" style={{ padding: '12px' }}>
                          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                            <Box flex={1}>
                              <Typography variant="h6" gutterBottom>
                                {classItem.topic}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                {classItem.course?.code} - {classItem.course?.name}
                              </Typography>
                              
                              <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
                                <Chip 
                                  icon={<AccessTimeIcon sx={{ color: '#D6F7AD' }} />}
                                  label={`${formatTime(classItem.start_time)} - ${formatTime(classItem.end_time)}`}
                                  size="small"
                                  variant="outlined"
                                  sx={{
                                    backgroundColor: 'rgba(214, 247, 173, 0.2)',
                                    color: '#333',
                                    border: '1px solid #D6F7AD'
                                  }}
                                />
                                {classItem.room && (
                                  <Chip 
                                    icon={<LocationOnIcon sx={{ color: '#95E1D3' }} />}
                                    label={classItem.room}
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                      backgroundColor: 'rgba(149, 225, 211, 0.2)',
                                      color: '#333',
                                      border: '1px solid #95E1D3'
                                    }}
                                  />
                                )}
                                <Chip 
                                  label={classItem.class_type || 'lecture'}
                                  size="small"
                                  sx={getClassTypeColor(classItem.class_type)}
                                />
                                <Chip 
                                  label={`${classItem.duration_minutes} min`}
                                  size="small"
                                  variant="outlined"
                                  sx={{
                                    backgroundColor: 'rgba(149, 225, 211, 0.2)',
                                    color: '#333',
                                    border: '1px solid #95E1D3'
                                  }}
                                />
                              </Box>
                              
                              {classItem.description && (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                  {classItem.description}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </div>
                      </div>
                    ))}
                  </Box>
                )
              ))}
              </div>
            </div>
          )}
    </DashboardLayout>
  );
}

export default ClassesPlanner;
