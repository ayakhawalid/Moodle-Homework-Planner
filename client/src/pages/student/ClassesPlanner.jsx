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
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
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
  Assignment as AssignmentIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { apiService } from '../../services/api';
import { useUserSyncContext } from '../../contexts/UserSyncContext';
import '../../styles/student/ClassesPlanner.css';

function ClassesPlanner() {
  const { syncStatus, user } = useUserSyncContext();
  const [classesData, setClassesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [openAddClassDialog, setOpenAddClassDialog] = useState(false);
  const [openEditClassDialog, setOpenEditClassDialog] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [courses, setCourses] = useState([]);
  const [classFormData, setClassFormData] = useState({
    course_id: '',
    topic: '',
    date: '',
    start_time: '',
    end_time: '',
    location: '',
    description: ''
  });

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

  // Fetch student's courses
  const fetchCourses = async () => {
    try {
      console.log('Fetching student courses...');
      const response = await apiService.studentDashboard.getStudentCourses();
      console.log('Courses response:', response.data);
      setCourses(response.data);
    } catch (err) {
      console.error('Failed to fetch courses:', err);
    }
  };

  // Handle form input changes
  const handleClassFormChange = (e) => {
    const { name, value } = e.target;
    setClassFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle add class submission
  const handleAddClass = async () => {
    try {
      await apiService.studentDashboard.addClass(classFormData);
      setOpenAddClassDialog(false);
      setClassFormData({
        course_id: '',
        topic: '',
        date: '',
        start_time: '',
        end_time: '',
        location: '',
        description: ''
      });
      fetchClassesData(); // Refresh the classes data
    } catch (err) {
      setError('Failed to add class. Please try again.');
    }
  };

  const handleEditClass = (classItem) => {
    setEditingClass(classItem);
    setClassFormData({
      course_id: classItem.course?._id || classItem.course_id || '',
      topic: classItem.topic || '',
      date: classItem.date || classItem.class_date || '',
      start_time: classItem.start_time || '',
      end_time: classItem.end_time || '',
      location: classItem.room || classItem.location || '',
      description: classItem.description || ''
    });
    setOpenEditClassDialog(true);
  };

  const handleUpdateClass = async () => {
    try {
      // Use the student classes API endpoint
      await apiService.classes.update(editingClass._id, classFormData);
      setOpenEditClassDialog(false);
      setEditingClass(null);
      setClassFormData({
        course_id: '',
        topic: '',
        date: '',
        start_time: '',
        end_time: '',
        location: '',
        description: ''
      });
      fetchClassesData();
    } catch (err) {
      console.error('Update class error:', err);
      setError('Failed to update class. Please try again.');
    }
  };

  const handleDeleteClass = async (classItem) => {
    if (!window.confirm(`Are you sure you want to delete "${classItem.topic}"? This action cannot be undone.`)) {
      return;
    }

    try {
      // Use the student classes API endpoint
      await apiService.classes.delete(classItem._id);
      fetchClassesData();
    } catch (err) {
      console.error('Delete class error:', err);
      setError('Failed to delete class. Please try again.');
    }
  };

  // Fetch courses when component mounts
  useEffect(() => {
    fetchCourses();
  }, []);

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
      <Typography variant="h3" component="h1" sx={{ 
        fontWeight: '600',
        fontSize: '2.5rem',
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        letterSpacing: '-0.01em',
        lineHeight: '1.2',
        color: '#2c3e50',
        mb: 1
      }}>
        Classes Planner
      </Typography>
      <Typography variant="h6" color="text.secondary" sx={{ 
        mb: 4,
        fontWeight: '300',
        fontSize: '1.1rem',
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        color: '#7f8c8d',
        lineHeight: '1.6',
        letterSpacing: '0.3px'
      }}>
        Plan and organize your class schedules and academic calendar
      </Typography>

      {/* Add Class Button */}
      <Box display="flex" justifyContent="flex-start" mb={3}>
        <Button
          variant="contained"
          startIcon={<CalendarTodayIcon />}
          onClick={() => setOpenAddClassDialog(true)}
          sx={{
            backgroundColor: '#95E1D3',
            color: '#333',
            '&:hover': {
              backgroundColor: '#7dd3c0'
            }
          }}
        >
          Add Class
        </Button>
      </Box>

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
                            label={String(classItem.class_type || 'lecture').replace(/\b\w/g, l => l.toUpperCase())} 
                            size="small" 
                            sx={{ ...getClassTypeColor(classItem.class_type), alignSelf: 'flex-start', fontSize: '0.7rem' }}
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
                                  label={`${formatTime(classItem.start_time) || 'TBA'} - ${formatTime(classItem.end_time) || 'TBA'}`}
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
                                    label={String(classItem.room || 'TBA')}
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
                                  label={String(classItem.class_type || 'lecture').replace(/\b\w/g, l => l.toUpperCase())}
                                  size="small"
                                  sx={getClassTypeColor(classItem.class_type)}
                                />
                                <Chip 
                                  label={String(classItem.duration_minutes || 90) + ' min'}
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
                            
                            {/* Show edit/delete buttons for any student in the course */}
                            {user && (
                              <Box display="flex" gap={1} ml={2}>
                                <Tooltip title="Edit Class">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleEditClass(classItem)}
                                    sx={{
                                      backgroundColor: 'rgba(149, 225, 211, 0.2)',
                                      '&:hover': { backgroundColor: 'rgba(149, 225, 211, 0.4)' }
                                    }}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete Class">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDeleteClass(classItem)}
                                    sx={{
                                      backgroundColor: 'rgba(243, 129, 129, 0.2)',
                                      '&:hover': { backgroundColor: 'rgba(243, 129, 129, 0.4)' }
                                    }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            )}
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

      {/* Add Class Dialog */}
      <Dialog open={openAddClassDialog} onClose={() => setOpenAddClassDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add New Class</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Course</InputLabel>
                <Select
                  name="course_id"
                  value={classFormData.course_id}
                  onChange={handleClassFormChange}
                  label="Course"
                >
                  {courses.map((course) => (
                    <MenuItem key={course._id} value={course._id}>
                      {course.course_code} - {course.course_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="topic"
                label="Class Topic"
                value={classFormData.topic}
                onChange={handleClassFormChange}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                name="date"
                label="Date"
                type="date"
                value={classFormData.date}
                onChange={handleClassFormChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                name="start_time"
                label="Start Time"
                type="time"
                value={classFormData.start_time}
                onChange={handleClassFormChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                name="end_time"
                label="End Time"
                type="time"
                value={classFormData.end_time}
                onChange={handleClassFormChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="location"
                label="Location/Room"
                value={classFormData.location}
                onChange={handleClassFormChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="description"
                label="Description"
                multiline
                rows={3}
                value={classFormData.description}
                onChange={handleClassFormChange}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddClassDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddClass} 
            variant="contained"
            sx={{
              backgroundColor: '#95E1D3',
              color: '#333',
              '&:hover': {
                backgroundColor: '#7dd3c0'
              }
            }}
          >
            Add Class
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Class Dialog */}
      <Dialog open={openEditClassDialog} onClose={() => {
        setOpenEditClassDialog(false);
        setEditingClass(null);
      }} maxWidth="md" fullWidth>
        <DialogTitle>Edit Class</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Course</InputLabel>
                <Select
                  name="course_id"
                  value={classFormData.course_id}
                  onChange={handleClassFormChange}
                  label="Course"
                >
                  {courses.map((course) => (
                    <MenuItem key={course._id} value={course._id}>
                      {course.course_code} - {course.course_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="topic"
                label="Class Topic"
                value={classFormData.topic}
                onChange={handleClassFormChange}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                name="date"
                label="Date"
                type="date"
                value={classFormData.date}
                onChange={handleClassFormChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                name="start_time"
                label="Start Time"
                type="time"
                value={classFormData.start_time}
                onChange={handleClassFormChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                name="end_time"
                label="End Time"
                type="time"
                value={classFormData.end_time}
                onChange={handleClassFormChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="location"
                label="Location/Room"
                value={classFormData.location}
                onChange={handleClassFormChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="description"
                label="Description"
                multiline
                rows={3}
                value={classFormData.description}
                onChange={handleClassFormChange}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenEditClassDialog(false);
            setEditingClass(null);
          }}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpdateClass} 
            variant="contained"
            sx={{
              backgroundColor: '#95E1D3',
              color: '#333',
              '&:hover': {
                backgroundColor: '#7dd3c0'
              }
            }}
          >
            Update Class
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
}

export default ClassesPlanner;
