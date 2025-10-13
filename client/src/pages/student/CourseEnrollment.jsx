import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  School as SchoolIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import DashboardLayout from '../../Components/DashboardLayout';
import { useUserSyncContext } from '../../contexts/UserSyncContext';
import { apiService } from '../../services/api';

const CourseEnrollment = () => {
  const { user } = useUserSyncContext();
  const [availableCourses, setAvailableCourses] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [detailsDialog, setDetailsDialog] = useState({ open: false, course: null });

  const semesters = ['fall', 'spring', 'summer', 'winter'];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear + i - 2);

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    loadCourses();
  }, [selectedSemester, selectedYear]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      
      // Get all available courses
      const params = {};
      if (selectedSemester) params.semester = selectedSemester;
      if (selectedYear) params.year = selectedYear;
      
      const [allCoursesResponse, enrolledResponse] = await Promise.all([
        apiService.courses.getAll(params),
        apiService.courses.getAll({ student_id: user?._id })
      ]);
      
      const allCourses = allCoursesResponse.data || allCoursesResponse;
      const enrolled = enrolledResponse.data || enrolledResponse;
      
      setEnrolledCourses(enrolled);
      
      // Filter out courses the student is already enrolled in
      const enrolledIds = enrolled.map(course => course._id);
      const available = allCourses.filter(course => !enrolledIds.includes(course._id));
      
      setAvailableCourses(available);
    } catch (error) {
      console.error('Error loading courses:', error);
      setError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (courseId) => {
    try {
      setError('');
      await apiService.courses.addStudent(courseId, user?._id);
      setSuccess('Successfully enrolled in course!');
      loadCourses();
    } catch (error) {
      console.error('Error enrolling in course:', error);
      setError(error?.response?.data?.error || 'Failed to enroll in course');
    }
  };

  const handleUnenroll = async (courseId) => {
    if (!window.confirm('Are you sure you want to drop this course? This action cannot be undone.')) {
      return;
    }

    try {
      setError('');
      await apiService.courses.removeStudent(courseId, user?._id);
      setSuccess('Successfully dropped course!');
      loadCourses();
    } catch (error) {
      console.error('Error dropping course:', error);
      setError(error?.response?.data?.error || 'Failed to drop course');
    }
  };

  const getSemesterChipColor = (semester) => {
    const colors = {
      fall: { backgroundColor: 'rgba(252, 227, 138, 0.3)', color: '#333', border: '1px solid #FCE38A' },
      spring: { backgroundColor: 'rgba(149, 225, 211, 0.3)', color: '#333', border: '1px solid #95E1D3' },
      summer: { backgroundColor: 'rgba(214, 247, 173, 0.3)', color: '#333', border: '1px solid #D6F7AD' },
      winter: { backgroundColor: 'rgba(243, 129, 129, 0.3)', color: '#333', border: '1px solid #F38181' }
    };
    return colors[semester] || { backgroundColor: 'rgba(149, 225, 211, 0.2)', color: '#333', border: '1px solid #95E1D3' };
  };

  const openCourseDetails = (course) => {
    setDetailsDialog({ open: true, course });
  };

  const closeCourseDetails = () => {
    setDetailsDialog({ open: false, course: null });
  };

  const filteredAvailableCourses = availableCourses.filter(course =>
    course.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.course_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.lecturer_id?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <DashboardLayout userRole="student">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="student">
      <Box p={3}>
        <Typography variant="h3" component="h1" sx={{ 
          fontWeight: '600',
          fontSize: '2.5rem',
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
          letterSpacing: '-0.01em',
          lineHeight: '1.2',
          color: '#2c3e50',
          mb: 1
        }}>
          Course Enrollment
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
          Manage your course enrollment and discover new courses
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Enrolled Courses */}
          <Grid item xs={12} md={6}>
            <div className="dashboard-card">
              <div className="card-content">
                <Typography variant="h6" gutterBottom display="flex" alignItems="center">
                  <CheckCircleIcon sx={{ mr: 1, color: '#95E1D3' }} />
                  My Enrolled Courses ({enrolledCourses.length})
                </Typography>
                
                {enrolledCourses.length === 0 ? (
                  <Box textAlign="center" py={3}>
                    <SchoolIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      You haven't enrolled in any courses yet
                    </Typography>
                  </Box>
                ) : (
                  <List>
                    {enrolledCourses.map((course) => (
                      <ListItem key={course._id} divider>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="subtitle1" fontWeight="bold">
                                {course.course_name}
                              </Typography>
                              {course.course_code && (
                                <Chip 
                                  label={String(course.course_code)} 
                                  size="small" 
                                  variant="outlined"
                                  sx={{
                                    backgroundColor: 'rgba(149, 225, 211, 0.2)',
                                    color: '#333',
                                    border: '1px solid #95E1D3'
                                  }}
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box component="span" display="block">
                              <Typography variant="body2" color="text.secondary" component="span" display="block">
                                Lecturer: {course.lecturer_id?.name || 'Unknown'}
                              </Typography>
                              <Box component="span" display="flex" alignItems="center" gap={1} mt={0.5}>
                                {course.semester && (
                                  <Chip 
                                    label={String(course.semester).charAt(0).toUpperCase() + String(course.semester).slice(1)} 
                                    sx={getSemesterChipColor(course.semester)}
                                    size="small"
                                  />
                                )}
                                <Typography variant="caption" component="span">{course.year}</Typography>
                                {course.credits && (
                                  <Typography variant="caption" component="span">
                                    • {course.credits} credits
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          }
                          secondaryTypographyProps={{ component: 'div' }}
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            sx={{ 
                              mr: 1,
                              color: '#95E1D3',
                              '&:hover': { backgroundColor: 'rgba(149, 225, 211, 0.1)' }
                            }}
                            onClick={() => openCourseDetails(course)}
                          >
                            <InfoIcon />
                          </IconButton>
                          <IconButton
                            edge="end"
                            sx={{ 
                              color: '#F38181',
                              '&:hover': { backgroundColor: 'rgba(243, 129, 129, 0.1)' }
                            }}
                            onClick={() => handleUnenroll(course._id)}
                          >
                            <RemoveIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                )}
              </div>
            </div>
          </Grid>

          {/* Available Courses */}
          <Grid item xs={12} md={6}>
            <div className="dashboard-card">
              <div className="card-content">
                <Typography variant="h6" gutterBottom display="flex" alignItems="center">
                  <AddIcon sx={{ mr: 1, color: '#2E7D32' }} />
                  Available Courses ({filteredAvailableCourses.length})
                </Typography>

                {/* Filters */}
                <Grid container spacing={2} mb={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Search courses"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      size="small"
                      placeholder="Search by course name, code, or lecturer"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Semester</InputLabel>
                      <Select
                        value={selectedSemester}
                        onChange={(e) => setSelectedSemester(e.target.value)}
                        label="Semester"
                      >
                        <MenuItem value="">All Semesters</MenuItem>
                        {semesters.map((semester) => (
                          <MenuItem key={semester} value={semester}>
                            {semester.charAt(0).toUpperCase() + semester.slice(1)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Year</InputLabel>
                      <Select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        label="Year"
                      >
                        <MenuItem value="">All Years</MenuItem>
                        {years.map((year) => (
                          <MenuItem key={year} value={year}>
                            {year}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                {filteredAvailableCourses.length === 0 ? (
                  <Box textAlign="center" py={3}>
                    <SchoolIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      {availableCourses.length === 0 
                        ? "No courses available for enrollment"
                        : "No courses match your search criteria"
                      }
                    </Typography>
                  </Box>
                ) : (
                  <List>
                    {filteredAvailableCourses.map((course) => (
                      <ListItem key={course._id} divider>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="subtitle1" fontWeight="bold">
                                {course.course_name}
                              </Typography>
                              {course.course_code && (
                                <Chip 
                                  label={String(course.course_code)} 
                                  size="small" 
                                  variant="outlined"
                                  sx={{
                                    backgroundColor: 'rgba(149, 225, 211, 0.2)',
                                    color: '#333',
                                    border: '1px solid #95E1D3'
                                  }}
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box component="span" display="block">
                              <Typography variant="body2" color="text.secondary" component="span" display="block">
                                Lecturer: {course.lecturer_id?.name || 'Unknown'}
                              </Typography>
                              <Box component="span" display="flex" alignItems="center" gap={1} mt={0.5}>
                                {course.semester && (
                                  <Chip 
                                    label={String(course.semester).charAt(0).toUpperCase() + String(course.semester).slice(1)} 
                                    sx={getSemesterChipColor(course.semester)}
                                    size="small"
                                  />
                                )}
                                <Typography variant="caption" component="span">{course.year}</Typography>
                                {course.credits && (
                                  <Typography variant="caption" component="span">
                                    • {course.credits} credits
                                  </Typography>
                                )}
                                <Typography variant="caption">
                                  • {course.students?.length || 0} enrolled
                                </Typography>
                              </Box>
                            </Box>
                          }
                          secondaryTypographyProps={{ component: 'div' }}
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            sx={{ 
                              mr: 1,
                              color: '#95E1D3',
                              '&:hover': { backgroundColor: 'rgba(149, 225, 211, 0.1)' }
                            }}
                            onClick={() => openCourseDetails(course)}
                          >
                            <InfoIcon />
                          </IconButton>
                          <IconButton
                            edge="end"
                            sx={{
                              color: '#2E7D32',
                              '&:hover': { backgroundColor: 'rgba(46, 125, 50, 0.1)' }
                            }}
                            onClick={() => handleEnroll(course._id)}
                          >
                            <AddIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                )}
              </div>
            </div>
          </Grid>
        </Grid>

        {/* Course Details Dialog */}
        <Dialog 
          open={detailsDialog.open} 
          onClose={closeCourseDetails} 
          maxWidth="md" 
          fullWidth
        >
          <DialogTitle>
            Course Details
          </DialogTitle>
          <DialogContent>
            {detailsDialog.course && (
              <Box>
                <Box mb={2}>
                  <Typography variant="h6" gutterBottom>
                    {detailsDialog.course.course_name}
                  </Typography>
                  <Box display="flex" gap={1} mb={2}>
                    {detailsDialog.course.course_code && (
                      <Chip label={String(detailsDialog.course.course_code)} variant="outlined" />
                    )}
                    {detailsDialog.course.semester && (
                      <Chip 
                        label={String(detailsDialog.course.semester).charAt(0).toUpperCase() + String(detailsDialog.course.semester).slice(1)} 
                        sx={getSemesterChipColor(detailsDialog.course.semester)}
                        size="small"
                      />
                    )}
                    <Chip label={String(detailsDialog.course.year || '')} variant="outlined" />
                    {detailsDialog.course.credits && (
                      <Chip label={String(detailsDialog.course.credits) + ' credits'} color="primary" />
                    )}
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom display="flex" alignItems="center">
                      <PersonIcon sx={{ mr: 1 }} />
                      Lecturer
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {detailsDialog.course.lecturer_id?.name || 'Unknown'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom display="flex" alignItems="center">
                      <GroupIcon sx={{ mr: 1 }} />
                      Enrolled Students
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {detailsDialog.course.students?.length || 0} students
                    </Typography>
                  </Grid>
                </Grid>

                {detailsDialog.course.description && (
                  <Box mt={2}>
                    <Typography variant="subtitle2" gutterBottom>
                      Description
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {detailsDialog.course.description}
                    </Typography>
                  </Box>
                )}

                {detailsDialog.course.syllabus && (
                  <Box mt={2}>
                    <Typography variant="subtitle2" gutterBottom>
                      Syllabus
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                      {detailsDialog.course.syllabus}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={closeCourseDetails}>Close</Button>
            {detailsDialog.course && !enrolledCourses.find(c => c._id === detailsDialog.course._id) && (
              <Button 
                variant="contained" 
                onClick={() => {
                  handleEnroll(detailsDialog.course._id);
                  closeCourseDetails();
                }}
              >
                Enroll in Course
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
};

export default CourseEnrollment;
