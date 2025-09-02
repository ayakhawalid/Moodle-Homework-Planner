import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../Components/DashboardLayout';
import { 
  Grid, 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  CardActions, 
  Button, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Chip, 
  Alert, 
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  LinearProgress,
  IconButton,
  Tooltip
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
  Bookmark as BookmarkIcon
} from '@mui/icons-material';
import { apiService } from '../../services/api';
import { useUserSyncContext } from '../../contexts/UserSyncContext';
import '../../styles/student/ExamsFinals.css';

function ExamsFinals() {
  const { syncStatus } = useUserSyncContext();
  const [examsData, setExamsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState('');

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

  // Get exam status color
  const getExamStatusColor = (status) => {
    switch (status) {
      case 'upcoming': return 'warning';
      case 'completed': return 'success';
      case 'overdue': return 'error';
      default: return 'default';
    }
  };

  // Get exam status icon
  const getExamStatusIcon = (status) => {
    switch (status) {
      case 'upcoming': return <ScheduleIcon />;
      case 'completed': return <CheckCircleIcon />;
      case 'overdue': return <WarningIcon />;
      default: return <QuizIcon />;
    }
  };

  // Calculate days until exam
  const getDaysUntilExam = (examDate) => {
    const today = new Date();
    const exam = new Date(examDate);
    const diffTime = exam - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Get exam type color
  const getExamTypeColor = (type) => {
    switch (type) {
      case 'midterm': return 'primary';
      case 'final': return 'error';
      case 'quiz': return 'secondary';
      case 'assignment': return 'success';
      default: return 'default';
    }
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
      <div className="exams-finals">
        <Typography variant="h4" className="exams-title" gutterBottom>
          <QuizIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Exams & Finals
        </Typography>

        <div className="exams-content">
          <Typography variant="body1" color="text.secondary" paragraph>
            Prepare for your exams and final assessments with organized study plans and schedules.
          </Typography>

          {/* Filters */}
          <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              <FilterListIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
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
                    <MenuItem value="overdue">Overdue</MenuItem>
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
                        {course.course_code} - {course.course_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>

          {/* Exam Statistics */}
          <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Exam Overview
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="warning.main">
                    {examsData?.summary?.upcoming || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Upcoming
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="success.main">
                    {examsData?.summary?.completed || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Completed
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="error.main">
                    {examsData?.summary?.overdue || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Overdue
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary.main">
                    {examsData?.summary?.total || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Exams
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Upcoming Exams */}
          {examsData?.upcoming_exams?.length > 0 && (
            <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                <ScheduleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Upcoming Exams
              </Typography>
              <Grid container spacing={2}>
                {examsData.upcoming_exams.map((exam) => (
                  <Grid item xs={12} md={6} key={exam._id}>
                    <Card className="exam-card" elevation={2}>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                          <Box>
                            <Typography variant="h6" gutterBottom>
                              {exam.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {exam.course?.course_code} - {exam.course?.course_name}
                            </Typography>
                          </Box>
                          <Chip 
                            icon={getExamStatusIcon(exam.status)}
                            label={exam.exam_type}
                            color={getExamTypeColor(exam.exam_type)}
                            size="small"
                          />
                        </Box>
                        
                        <Box display="flex" alignItems="center" mb={1}>
                          <CalendarTodayIcon sx={{ mr: 1, fontSize: 16 }} />
                          <Typography variant="body2">
                            {new Date(exam.due_date).toLocaleDateString()}
                          </Typography>
                        </Box>
                        
                        <Box display="flex" alignItems="center" mb={2}>
                          <AccessTimeIcon sx={{ mr: 1, fontSize: 16 }} />
                          <Typography variant="body2">
                            {new Date(exam.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </Box>

                        {exam.days_until_due !== undefined && (
                          <Box mb={2}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              {exam.days_until_due > 0 ? `${exam.days_until_due} days remaining` : 'Today'}
                            </Typography>
                            <LinearProgress 
                              variant="determinate" 
                              value={Math.max(0, 100 - (exam.days_until_due * 10))} 
                              color={exam.days_until_due <= 3 ? 'error' : exam.days_until_due <= 7 ? 'warning' : 'primary'}
                            />
                          </Box>
                        )}

                        {exam.description && (
                          <Typography variant="body2" color="text.secondary">
                            {exam.description}
                          </Typography>
                        )}
                      </CardContent>
                      <CardActions>
                        <Button size="small" startIcon={<BookmarkIcon />}>
                          Study Plan
                        </Button>
                        <Button size="small" startIcon={<AssignmentIcon />}>
                          Resources
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          )}

          {/* All Exams List */}
          <Paper elevation={1} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              <QuizIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              All Exams
            </Typography>
            
            {examsData?.exams?.length === 0 ? (
              <Alert severity="info">
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
                              {exam.title}
                            </Typography>
                            <Chip 
                              icon={getExamStatusIcon(exam.status)}
                              label={exam.status}
                              color={getExamStatusColor(exam.status)}
                              size="small"
                            />
                            <Chip 
                              label={exam.exam_type}
                              color={getExamTypeColor(exam.exam_type)}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {exam.course?.course_code} - {exam.course?.course_name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {new Date(exam.due_date).toLocaleDateString()} at {new Date(exam.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                            {exam.days_until_due !== undefined && (
                              <Typography variant="body2" color={exam.days_until_due <= 3 ? 'error.main' : exam.days_until_due <= 7 ? 'warning.main' : 'text.secondary'}>
                                {exam.days_until_due > 0 ? `${exam.days_until_due} days remaining` : 
                                 exam.days_until_due === 0 ? 'Today' : 
                                 `${Math.abs(exam.days_until_due)} days overdue`}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Box display="flex" gap={1}>
                          <Tooltip title="Study Plan">
                            <IconButton size="small">
                              <BookmarkIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Resources">
                            <IconButton size="small">
                              <AssignmentIcon />
                            </IconButton>
                          </Tooltip>
                          {exam.grade && (
                            <Chip 
                              label={`Grade: ${exam.grade}`}
                              color="success"
                              size="small"
                            />
                          )}
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < examsData.exams.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default ExamsFinals;
