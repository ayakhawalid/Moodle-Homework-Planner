import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../Components/DashboardLayout';
import { 
  Grid, 
  Box, 
  Typography, 
  Button, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Chip, 
  Alert, 
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  LinearProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import {
  Quiz as QuizIcon,
  School as SchoolIcon,
  CalendarToday as CalendarTodayIcon,
  AccessTime as AccessTimeIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  FilterList as FilterListIcon,
  TrendingUp as TrendingUpIcon,
  Assignment as AssignmentIcon,
  Bookmark as BookmarkIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { apiService } from '../../services/api';
import { useUserSyncContext } from '../../contexts/UserSyncContext';
import '../../styles/student/ExamsFinals.css';
import '../../styles/HomeworkCard.css';

function ExamsFinals() {
  const { syncStatus, user } = useUserSyncContext();
  const [examsData, setExamsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [openAddExamDialog, setOpenAddExamDialog] = useState(false);
  const [openEditExamDialog, setOpenEditExamDialog] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [courses, setCourses] = useState([]);
  const [examFormData, setExamFormData] = useState({
    course_id: '',
    title: '',
    exam_date: '',
    exam_time: '',
    duration: '',
    location: '',
    description: '',
    exam_type: 'midterm'
  });

  // Fetch exams data
  const fetchExamsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.studentDashboard.getExams(
        selectedStatus === 'all' ? null : selectedStatus,
        selectedCourse || null
      );
      setExamsData(response.data);
    } catch (err) {
      console.error('Error fetching exams data:', err);
      setError('Failed to load exams data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExamsData();
  }, [selectedStatus, selectedCourse]);

  // Refresh data when window regains focus (e.g., returning from other pages)
  useEffect(() => {
    const handleFocus = () => {
      fetchExamsData();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [selectedStatus, selectedCourse]);

  // Get exam status color
  const getExamStatusColor = (status) => {
    switch (status) {
      case 'upcoming': return 'warning';
      case 'completed': return 'success';
      // Removed overdue case - students can mark exams as completed/graded after due date
      default: return 'default';
    }
  };

  // Get exam status icon
  const getExamStatusIcon = (status) => {
    switch (status) {
      case 'upcoming': return <ScheduleIcon />;
      case 'completed': return <CheckCircleIcon />;
      // Removed overdue case - students can mark exams as completed/graded after due date
      default: return <QuizIcon />;
    }
  };

  // Calculate days until exam
  const getDaysUntilExam = (examDate) => {
    const today = new Date();
    const exam = new Date(examDate);
    const diffTime = exam - today;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Get exam type color
  const getExamTypeColor = (type) => {
    const colors = {
      midterm: { backgroundColor: 'rgba(149, 225, 211, 0.3)', color: '#333', border: '1px solid #95E1D3' },
      final: { backgroundColor: 'rgba(214, 247, 173, 0.3)', color: '#333', border: '1px solid #D6F7AD' },
      quiz: { backgroundColor: 'rgba(214, 247, 173, 0.3)', color: '#333', border: '1px solid #D6F7AD' },
      assignment: { backgroundColor: 'rgba(252, 227, 138, 0.3)', color: '#333', border: '1px solid #FCE38A' }
    };
    return colors[type] || { backgroundColor: 'rgba(149, 225, 211, 0.3)', color: '#333', border: '1px solid #95E1D3' };
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
  const handleExamFormChange = (e) => {
    const { name, value } = e.target;
    setExamFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle add exam submission
  const handleAddExam = async () => {
    try {
      await apiService.studentDashboard.addExam(examFormData);
      setOpenAddExamDialog(false);
      setExamFormData({
        course_id: '',
        title: '',
        exam_date: '',
        exam_time: '',
        duration: '',
        location: '',
        description: '',
        exam_type: 'midterm'
      });
      fetchExamsData(); // Refresh the exams data
    } catch (err) {
      setError('Failed to add exam. Please try again.');
    }
  };

  const handleEditExam = (exam) => {
    setEditingExam(exam);
    setExamFormData({
      course_id: exam.course?._id || exam.course_id || '',
      title: exam.title || exam.exam_title || '',
      exam_date: exam.exam_date || exam.due_date || '',
      exam_time: exam.exam_time || '',
      duration: exam.duration || exam.duration_minutes || '',
      location: exam.location || exam.room || '',
      description: exam.description || '',
      exam_type: exam.exam_type || 'midterm'
    });
    setOpenEditExamDialog(true);
  };

  const handleUpdateExam = async () => {
    try {
      // Check if we have an update API method
      if (apiService.lecturerManagement?.updateExam) {
        await apiService.lecturerManagement.updateExam(editingExam._id, examFormData);
      } else {
        // Fallback to student dashboard add if update not available
        await apiService.studentDashboard.addExam(examFormData);
      }
      setOpenEditExamDialog(false);
      setEditingExam(null);
      setExamFormData({
        course_id: '',
        title: '',
        exam_date: '',
        exam_time: '',
        duration: '',
        location: '',
        description: '',
        exam_type: 'midterm'
      });
      fetchExamsData();
    } catch (err) {
      setError('Failed to update exam. Please try again.');
    }
  };

  const handleDeleteExam = async (exam) => {
    if (!window.confirm(`Are you sure you want to delete "${exam.title || exam.exam_title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      // Use the student exam API endpoint
      await apiService.exams.delete(exam._id);
      fetchExamsData();
    } catch (err) {
      console.error('Delete exam error:', err);
      setError('Failed to delete exam. Please try again.');
    }
  };

  // Fetch courses when component mounts
  useEffect(() => {
    fetchCourses();
  }, []);

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
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="student">
      <div className="white-page-background">
        {/* Add Exam Button */}
      <Box display="flex" justifyContent="flex-start" mb={3}>
        <Button
          variant="contained"
          startIcon={<QuizIcon />}
          onClick={() => setOpenAddExamDialog(true)}
          sx={{
            backgroundColor: '#D6F7AD',
            color: '#333',
            '&:hover': {
              backgroundColor: '#c8f299'
            }
          }}
        >
          Add Exam
        </Button>
      </Box>

          {/* Filters */}
          <div className="dashboard-card" style={{ marginBottom: '24px' }}>
            <div className="card-content">
              <Typography variant="h6" gutterBottom>
                <FilterListIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#95E1D3' }} />
                Filter Exams
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      label="Status"
                    >
                      <MenuItem value="all">All Exams</MenuItem>
                      <MenuItem value="upcoming">Upcoming</MenuItem>
                      <MenuItem value="completed">Completed</MenuItem>
                      {/* Removed overdue option - students can mark exams as completed/graded after due date */}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Course</InputLabel>
                    <Select
                      value={selectedCourse}
                      onChange={(e) => setSelectedCourse(e.target.value)}
                      label="Course"
                    >
                      <MenuItem value="">All Courses</MenuItem>
                      {examsData?.courses?.map((course) => (
                        <MenuItem key={course._id} value={course._id}>
                          {course.code} - {course.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </div>
          </div>

          {/* Exam Statistics */}
          <div className="dashboard-card" style={{ marginBottom: '24px' }}>
            <div className="card-content">
              <Typography variant="h6" gutterBottom>
                <TrendingUpIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#D6F7AD' }} />
                Exam Overview
              </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={3}>
                <Box textAlign="center">
                  <Typography variant="h4" sx={{ color: '#333' }}>
                    {examsData?.summary?.upcoming || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Upcoming
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box textAlign="center">
                  <Typography variant="h4" sx={{ color: '#333' }}>
                    {examsData?.summary?.completed || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Completed
                  </Typography>
                </Box>
              </Grid>
              {/* Removed overdue statistics - students can mark exams as completed/graded after due date */}
              <Grid item xs={12} sm={3}>
                <Box textAlign="center">
                  <Typography variant="h4" sx={{ color: '#333' }}>
                    {examsData?.summary?.total || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Exams
                  </Typography>
                </Box>
              </Grid>
            </Grid>
            </div>
          </div>

          {/* Upcoming Exams */}
          {examsData?.upcoming_exams?.length > 0 && (
            <div className="dashboard-card" style={{ marginBottom: '24px' }}>
              <div className="card-content">
                <Typography variant="h6" gutterBottom>
                  <ScheduleIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#FCE38A' }} />
                  Upcoming Exams
                </Typography>
              <Grid container spacing={2}>
                {examsData.upcoming_exams.map((exam) => (
                  <Grid item xs={12} md={6} key={exam._id}>
                    <div className="dashboard-card" style={{ height: '100%' }}>
                      <div className="card-content">
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                          <Box flex={1}>
                            <Typography variant="h6" gutterBottom>
                              {exam.exam_title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {exam.course?.code} - {exam.course?.name}
                            </Typography>
                          </Box>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Chip 
                              icon={getExamStatusIcon(exam.status)}
                              label={String(exam.exam_type || 'midterm').replace(/\b\w/g, l => l.toUpperCase())}
                              sx={getExamTypeColor(exam.exam_type)}
                              size="small"
                            />
                            {/* Show edit/delete buttons for any student in the course */}
                            {user && (
                              <>
                                <Tooltip title="Edit Exam">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleEditExam(exam)}
                                    sx={{
                                      backgroundColor: 'rgba(149, 225, 211, 0.2)',
                                      '&:hover': { backgroundColor: 'rgba(149, 225, 211, 0.4)' }
                                    }}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete Exam">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDeleteExam(exam)}
                                    sx={{
                                      backgroundColor: 'rgba(243, 129, 129, 0.2)',
                                      '&:hover': { backgroundColor: 'rgba(243, 129, 129, 0.4)' }
                                    }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                          </Box>
                        </Box>
                        
                        <Box display="flex" alignItems="center" mb={1}>
                          <CalendarTodayIcon sx={{ mr: 1, fontSize: 16, color: '#95E1D3' }} />
                          <Typography variant="body2">
                            {new Date(exam.due_date).toLocaleDateString()}
                          </Typography>
                        </Box>
                        
                        <Box display="flex" alignItems="center" mb={2}>
                          <AccessTimeIcon sx={{ mr: 1, fontSize: 16, color: '#D6F7AD' }} />
                          <Typography variant="body2">
                            {new Date(exam.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </Box>

                        {exam.days_until_due !== undefined && (
                          <Box mb={2}>
                            {exam.days_until_due > 0 ? (
                              <Typography variant="body2" sx={{ color: '#666' }} gutterBottom>
                                {exam.days_until_due} days remaining
                              </Typography>
                            ) : (
                              <Chip 
                                label="Today" 
                                size="small" 
                                sx={{ 
                                  mb: 1,
                                  backgroundColor: '#D6F7AD',
                                  color: '#333',
                                  border: '1px solid #D6F7AD'
                                }}
                              />
                            )}
                            <LinearProgress 
                              variant="determinate" 
                              value={Math.max(0, 100 - (exam.days_until_due * 10))} 
                              sx={{ 
                                height: 6, 
                                borderRadius: 3,
                                backgroundColor: 'rgba(149, 225, 211, 0.2)',
                                '& .MuiLinearProgress-bar': {
                                  backgroundColor: exam.days_until_due <= 3 ? '#D6F7AD' : 
                                                 exam.days_until_due <= 7 ? '#FCE38A' : '#95E1D3'
                                }
                              }}
                            />
                          </Box>
                        )}

                        {exam.description && (
                          <Typography variant="body2" color="text.secondary">
                            {exam.description}
                          </Typography>
                        )}
                      </div>
                    </div>
                  </Grid>
                ))}
              </Grid>
              </div>
            </div>
          )}

          {/* All Exams List */}
          <div className="dashboard-card">
            <div className="card-content">
              <Typography variant="h6" gutterBottom>
                <QuizIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#D6F7AD' }} />
                All Exams
              </Typography>
            
            {examsData?.exams?.length === 0 ? (
              <Alert 
                severity="info"
                sx={{
                  backgroundColor: 'rgba(214, 247, 173, 0.2)',
                  border: '1px solid #D6F7AD',
                  color: '#333',
                  '& .MuiAlert-icon': {
                    color: '#333'
                  }
                }}
              >
                No exams found for the selected criteria.
              </Alert>
            ) : (
              <List>
                {examsData?.exams?.map((exam, index) => (
                  <React.Fragment key={exam._id}>
                    <ListItem className="exam-item">
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="h6">
                              {exam.exam_title}
                            </Typography>
                            <Chip 
                              icon={getExamStatusIcon(exam.status)}
                              label={String(exam.status || 'upcoming').replace(/\b\w/g, l => l.toUpperCase())}
                              color={getExamStatusColor(exam.status)}
                              size="small"
                            />
                            <Chip 
                              label={String(exam.exam_type || 'midterm').replace(/\b\w/g, l => l.toUpperCase())}
                              sx={getExamTypeColor(exam.exam_type)}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                        }
                        secondary={
                          <Box component="div">
                            <Typography variant="body2" color="text.secondary" component="div">
                              {exam.course?.code} - {exam.course?.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" component="div">
                              {new Date(exam.due_date).toLocaleDateString()} at {new Date(exam.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                            {exam.days_until_due !== undefined && (
                              <Box component="div" sx={{ mt: 1 }}>
                                {exam.days_until_due > 0 ? (
                                  <Typography variant="body2" sx={{ color: '#666' }} component="div">
                                    {exam.days_until_due} days remaining
                                  </Typography>
                                ) : exam.days_until_due === 0 ? (
                                  <Chip 
                                    label="Today" 
                                    size="small" 
                                    sx={{ 
                                      backgroundColor: '#D6F7AD',
                                      color: '#333',
                                      border: '1px solid #D6F7AD'
                                    }}
                                  />
                                ) : (
                                  <Typography variant="body2" sx={{ color: '#D6F7AD' }} component="div">
                                    {Math.abs(exam.days_until_due)} days past due
                                  </Typography>
                                )}
                              </Box>
                            )}
                          </Box>
                        }
                        secondaryTypographyProps={{ component: 'div' }}
                      />
                      <ListItemSecondaryAction>
                        <Box display="flex" gap={1} alignItems="center">
                          {exam.grade && (
                            <Chip 
                              label={`Grade: ${exam.grade}`}
                              color="success"
                              size="small"
                            />
                          )}
                          {/* Show edit/delete buttons for any student in the course */}
                          {user && (
                            <>
                              <Tooltip title="Edit Exam">
                                <IconButton
                                  size="small"
                                  onClick={() => handleEditExam(exam)}
                                  sx={{
                                    backgroundColor: 'rgba(149, 225, 211, 0.2)',
                                    '&:hover': { backgroundColor: 'rgba(149, 225, 211, 0.4)' }
                                  }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete Exam">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteExam(exam)}
                                  sx={{
                                    backgroundColor: 'rgba(243, 129, 129, 0.2)',
                                    '&:hover': { backgroundColor: 'rgba(243, 129, 129, 0.4)' }
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < examsData.exams.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
            </div>
          </div>

      {/* Add Exam Dialog */}
      <Dialog open={openAddExamDialog} onClose={() => setOpenAddExamDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add New Exam</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Course</InputLabel>
                <Select
                  name="course_id"
                  value={examFormData.course_id}
                  onChange={handleExamFormChange}
                  label="Course"
                >
                  {courses.map((course) => (
                    <MenuItem key={course._id} value={course._id}>
                      {course.code || course.course_code} - {course.name || course.course_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="title"
                label="Exam Title"
                value={examFormData.title}
                onChange={handleExamFormChange}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                name="exam_date"
                label="Exam Date"
                type="date"
                value={examFormData.exam_date}
                onChange={handleExamFormChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                name="exam_time"
                label="Exam Time"
                type="time"
                value={examFormData.exam_time}
                onChange={handleExamFormChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                name="duration"
                label="Duration (minutes)"
                type="number"
                value={examFormData.duration}
                onChange={handleExamFormChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="location"
                label="Location/Room"
                value={examFormData.location}
                onChange={handleExamFormChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Exam Type</InputLabel>
                <Select
                  name="exam_type"
                  value={examFormData.exam_type}
                  onChange={handleExamFormChange}
                  label="Exam Type"
                >
                  <MenuItem value="midterm">Midterm</MenuItem>
                  <MenuItem value="final">Final</MenuItem>
                  <MenuItem value="quiz">Quiz</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="description"
                label="Description"
                multiline
                rows={3}
                value={examFormData.description}
                onChange={handleExamFormChange}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddExamDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddExam} 
            variant="contained"
            sx={{
              backgroundColor: '#F38181',
              color: 'white',
              '&:hover': {
                backgroundColor: '#e85a6b'
              }
            }}
          >
            Add Exam
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Exam Dialog */}
      <Dialog open={openEditExamDialog} onClose={() => {
        setOpenEditExamDialog(false);
        setEditingExam(null);
      }} maxWidth="md" fullWidth>
        <DialogTitle>Edit Exam</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Course</InputLabel>
                <Select
                  name="course_id"
                  value={examFormData.course_id}
                  onChange={handleExamFormChange}
                  label="Course"
                >
                  {courses.map((course) => (
                    <MenuItem key={course._id} value={course._id}>
                      {course.code || course.course_code} - {course.name || course.course_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="title"
                label="Exam Title"
                value={examFormData.title}
                onChange={handleExamFormChange}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                name="exam_date"
                label="Exam Date"
                type="date"
                value={examFormData.exam_date}
                onChange={handleExamFormChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                name="exam_time"
                label="Exam Time"
                type="time"
                value={examFormData.exam_time}
                onChange={handleExamFormChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                name="duration"
                label="Duration (minutes)"
                type="number"
                value={examFormData.duration}
                onChange={handleExamFormChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="location"
                label="Location/Room"
                value={examFormData.location}
                onChange={handleExamFormChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Exam Type</InputLabel>
                <Select
                  name="exam_type"
                  value={examFormData.exam_type}
                  onChange={handleExamFormChange}
                  label="Exam Type"
                >
                  <MenuItem value="midterm">Midterm</MenuItem>
                  <MenuItem value="final">Final</MenuItem>
                  <MenuItem value="quiz">Quiz</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="description"
                label="Description"
                multiline
                rows={3}
                value={examFormData.description}
                onChange={handleExamFormChange}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenEditExamDialog(false);
            setEditingExam(null);
          }}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpdateExam} 
            variant="contained"
            sx={{
              backgroundColor: '#F38181',
              color: 'white',
              '&:hover': {
                backgroundColor: '#e85a6b'
              }
            }}
          >
            Update Exam
          </Button>
        </DialogActions>
      </Dialog>
      </div>
    </DashboardLayout>
  );
}

export default ExamsFinals;
