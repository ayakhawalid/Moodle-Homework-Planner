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
  TrendingUp as TrendingUpIcon,
  Assignment as AssignmentIcon,
  Bookmark as BookmarkIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import {
  Plus as AddIcon,
  CalendarBlank as PhosphorCalendarTodayIcon,
  Clock as PhosphorAccessTimeIcon,
  CheckCircle as PhosphorCheckCircleIcon,
  Warning as PhosphorWarningIcon,
  CalendarBlank as PhosphorScheduleIcon,
  ChartLineUp as PhosphorTrendingUpIcon,
  ClipboardText as PhosphorAssignmentIcon,
  BookmarkSimple as PhosphorBookmarkIcon,
  PencilSimple as PhosphorEditIcon,
  Trash as PhosphorDeleteIcon
} from 'phosphor-react';
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
        null, // No status filtering
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
  }, [selectedCourse]);

  // Refresh data when window regains focus (e.g., returning from other pages)
  useEffect(() => {
    const handleFocus = () => {
      fetchExamsData();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [selectedCourse]);

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

  // Format start_time "HH:MM" for display (e.g. "14:00" -> "2:00 PM")
  const formatExamTime = (startTime) => {
    if (!startTime || typeof startTime !== 'string') return '';
    const [h, m] = startTime.trim().split(':').map(Number);
    if (Number.isNaN(h)) return '';
    const hour = h % 12 || 12;
    const min = Number.isNaN(m) ? 0 : m;
    const ampm = h < 12 ? 'AM' : 'PM';
    return `${hour}:${String(min).padStart(2, '0')} ${ampm}`;
  };

  // Compute end time from start_time "HH:MM" + duration_minutes; return formatted "start - end" or just start
  const formatExamTimeRange = (startTime, durationMinutes) => {
    const startFormatted = formatExamTime(startTime);
    if (!startFormatted) return startFormatted;
    const dur = durationMinutes != null ? parseInt(durationMinutes, 10) : NaN;
    if (Number.isNaN(dur) || dur < 1) return startFormatted;
    if (!startTime || typeof startTime !== 'string') return startFormatted;
    const [h, m] = startTime.trim().split(':').map(Number);
    if (Number.isNaN(h)) return startFormatted;
    const totalStartMins = (Number.isNaN(m) ? 0 : m) + h * 60;
    const totalEndMins = totalStartMins + dur;
    const endH = Math.floor(totalEndMins / 60) % 24;
    const endM = totalEndMins % 60;
    const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    const endFormatted = formatExamTime(endTimeStr);
    return `${startFormatted} – ${endFormatted}`;
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
    if (!examFormData.exam_date || !examFormData.exam_date.trim()) {
      setError('Please enter an exam date.');
      return;
    }
    try {
      const payload = {
        ...examFormData,
        duration: examFormData.duration === '' ? 60 : Number(examFormData.duration) || 60
      };
      await apiService.studentDashboard.addExam(payload);
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
    // Format due_date for date input (YYYY-MM-DD)
    const dueDate = exam.due_date ? new Date(exam.due_date) : null;
    const examDateStr = dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate.toISOString().slice(0, 10) : '';
    // Ensure time is HH:MM for time input (pad if needed, e.g. "9:0" -> "09:00")
    const startTime = exam.start_time || exam.exam_time || '';
    let examTimeStr = '';
    if (typeof startTime === 'string' && startTime.trim()) {
      const parts = startTime.trim().split(':');
      const h = parseInt(parts[0], 10);
      const m = parts[1] != null ? parseInt(parts[1], 10) : 0;
      if (!Number.isNaN(h)) {
        examTimeStr = `${String(h).padStart(2, '0')}:${String(Number.isNaN(m) ? 0 : m).padStart(2, '0')}`;
      } else {
        examTimeStr = startTime;
      }
    }
    setExamFormData({
      course_id: exam.course?._id || (exam.course_id && (typeof exam.course_id === 'object' ? exam.course_id._id : exam.course_id)) || '',
      title: exam.title || exam.exam_title || '',
      exam_date: exam.exam_date || examDateStr,
      exam_time: examTimeStr,
      duration: exam.duration != null ? String(exam.duration) : (exam.duration_minutes != null ? String(exam.duration_minutes) : ''),
      location: exam.location || exam.room || '',
      description: exam.description ?? '',
      exam_type: exam.exam_type || 'midterm'
    });
    setOpenEditExamDialog(true);
  };

  const handleUpdateExam = async () => {
    if (!editingExam?._id) return;
    if (!examFormData.exam_date || !examFormData.exam_date.trim()) {
      setError('Please enter an exam date.');
      return;
    }
    try {
      const payload = {
        exam_title: examFormData.title,
        due_date: examFormData.exam_date,
        start_time: (examFormData.exam_time && examFormData.exam_time.trim()) ? examFormData.exam_time.trim() : '00:00',
        duration_minutes: Math.max(1, parseInt(examFormData.duration, 10) || 60),
        room: examFormData.location || undefined,
        description: examFormData.description || undefined,
        exam_type: examFormData.exam_type || 'midterm'
      };
      await apiService.exams.update(editingExam._id, payload);
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
        <div className="page-background">
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
      <div className="page-background">
        {/* Add Exam Button + Course filter */}
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap" mb={3}>
          <IconButton
            onClick={() => setOpenAddExamDialog(true)}
            sx={{
              backgroundColor: 'transparent',
              color: '#555',
              borderRadius: '8px',
              padding: '20px',
              minWidth: '64px',
              width: '64px',
              height: '64px',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.06)',
                color: '#333'
              }
            }}
          >
            <AddIcon size={48} weight="thin" />
          </IconButton>
          <FormControl sx={{ minWidth: '300px' }}>
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
        </Box>


          {/* Upcoming Exams */}
          {examsData?.upcoming_exams?.length > 0 && (
            <div className="dashboard-card" style={{ marginBottom: '24px' }}>
              <div className="card-content">
                <Typography variant="h6" gutterBottom>
                  <PhosphorScheduleIcon size={20} style={{ marginRight: '8px', verticalAlign: 'middle', color: '#FCE38A' }} />
                  Upcoming Exams
                </Typography>
              <Grid container spacing={2}>
                {examsData.upcoming_exams.map((exam) => (
                  <Grid item xs={12} md={6} key={exam._id}>
                    <div className="dashboard-card" style={{ height: '100%' }}>
                      <div className="card-content">
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                          <Box flex={1}>
                            <Typography variant="h6" gutterBottom sx={{ color: '#333' }}>
                              {exam.exam_title}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#666' }}>
                              {exam.course?.code} - {exam.course?.name}
                            </Typography>
                          </Box>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Chip 
                              icon={exam.days_until_due !== undefined && exam.days_until_due < 0 ? undefined : getExamStatusIcon(exam.status)}
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
                                    <PhosphorEditIcon size={16} />
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
                                    <PhosphorDeleteIcon size={16} />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                          </Box>
                        </Box>
                        
                        <Box display="flex" alignItems="center" mb={1}>
                          <PhosphorCalendarTodayIcon size={16} style={{ marginRight: '8px', color: '#757575' }} />
                          <Typography variant="body2" sx={{ color: '#333' }}>
                            {new Date(exam.due_date).toLocaleDateString()}
                          </Typography>
                        </Box>
                        
                        <Box display="flex" alignItems="center" mb={2}>
                          <PhosphorAccessTimeIcon size={16} style={{ marginRight: '8px', color: '#757575' }} />
                          <Typography variant="body2" sx={{ color: '#333' }}>
                            {exam.start_time ? formatExamTimeRange(exam.start_time, exam.duration_minutes) : new Date(exam.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                                  backgroundColor: 'rgba(0,0,0,0.08)',
                                  color: '#333',
                                  border: '1px solid rgba(0,0,0,0.12)'
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
                          <Typography variant="body2" sx={{ color: '#666' }}>
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

          {/* All Exams List - only show when there are exams */}
          {examsData?.exams?.length > 0 && (
          <div className="dashboard-card">
            <div className="card-content">
              <Typography variant="h6" gutterBottom sx={{ color: '#555', fontWeight: 700 }}>
                All Exams
              </Typography>
            
              <List>
                {examsData?.exams?.map((exam, index) => (
                  <React.Fragment key={exam._id}>
                    <ListItem className="exam-item">
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="h6" sx={{ color: '#333' }}>
                              {exam.exam_title}
                            </Typography>
                            <Chip 
                              icon={exam.days_until_due !== undefined && exam.days_until_due < 0 ? undefined : getExamStatusIcon(exam.status)}
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
                            <Typography variant="body2" sx={{ color: '#666' }} component="div">
                              {exam.course?.code} - {exam.course?.name}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#666' }} component="div">
                              {new Date(exam.due_date).toLocaleDateString()}{exam.start_time ? ` at ${formatExamTimeRange(exam.start_time, exam.duration_minutes)}` : ` at ${new Date(exam.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
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
                                      backgroundColor: 'rgba(0,0,0,0.08)',
                                      color: '#333',
                                      border: '1px solid rgba(0,0,0,0.12)'
                                    }}
                                  />
                                ) : (
                                  <Typography variant="body2" sx={{ color: '#666' }} component="div">
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
                                  <PhosphorEditIcon size={16} />
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
                                  <PhosphorDeleteIcon size={16} />
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
            </div>
          </div>
          )}

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
                  sx={{ minWidth: '300px' }}
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
          <Button onClick={() => setOpenAddExamDialog(false)} sx={{ color: '#666' }}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddExam} 
            variant="outlined"
            sx={{
              backgroundColor: '#fff',
              color: '#333',
              border: '1px solid rgba(0, 0, 0, 0.12)',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                border: '1px solid rgba(0, 0, 0, 0.2)'
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
                  sx={{ minWidth: '300px' }}
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
          }} sx={{ color: '#666' }}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpdateExam} 
            variant="outlined"
            sx={{
              backgroundColor: '#fff',
              color: '#333',
              border: '1px solid rgba(0, 0, 0, 0.12)',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                border: '1px solid rgba(0, 0, 0, 0.2)'
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
