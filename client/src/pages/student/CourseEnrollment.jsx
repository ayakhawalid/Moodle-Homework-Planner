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
import {
  Plus as AddIconPhosphor
} from 'phosphor-react';
import DashboardLayout from '../../Components/DashboardLayout';
import { useUserSyncContext } from '../../contexts/UserSyncContext';
import { useAuth0 } from '@auth0/auth0-react';
import { apiService } from '../../services/api';
import '../../styles/HomeworkCard.css';

const CourseEnrollment = () => {
  const { user } = useUserSyncContext();
  const { getAccessTokenSilently } = useAuth0();
  const [availableCourses, setAvailableCourses] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [detailsDialog, setDetailsDialog] = useState({ open: false, course: null });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [lecturers, setLecturers] = useState([]);
  const [lecturerSelectFocused, setLecturerSelectFocused] = useState(false);
  const [formData, setFormData] = useState({
    course_name: '',
    course_code: '',
    description: '',
    syllabus: '',
    credits: '',
    semester: '',
    year: '',
    lecturer_id: ''
  });

  const semesters = ['fall', 'spring', 'summer', 'winter'];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear + i - 2);
  const semesterLabelId = 'course-enrollment-semester-label';
  const semesterSelectId = 'course-enrollment-semester-select';
  const yearLabelId = 'course-enrollment-year-label';
  const yearSelectId = 'course-enrollment-year-select';
  const lecturerLabelId = 'course-enrollment-lecturer-label';
  const lecturerSelectId = 'course-enrollment-lecturer-select';
  const filterSemesterLabelId = 'course-enrollment-filter-semester-label';
  const filterSemesterSelectId = 'course-enrollment-filter-semester-select';
  const filterYearLabelId = 'course-enrollment-filter-year-label';
  const filterYearSelectId = 'course-enrollment-filter-year-select';

  useEffect(() => {
    loadCourses();
    loadLecturers();
  }, []);

  const loadLecturers = async () => {
    try {
      console.log('Loading lecturers...');
      const response = await apiService.courses.getLecturers();
      console.log('Lecturers API full response:', response);
      
      // Axios returns { data: [...], status: 200, ... }
      // The actual array is in response.data
      let lecturersArray = [];
      
      if (response && response.data) {
        // Standard axios response structure
        lecturersArray = Array.isArray(response.data) ? response.data : [];
      } else if (Array.isArray(response)) {
        // Direct array response (shouldn't happen with axios, but handle it)
        lecturersArray = response;
      } else {
        // Fallback: try to extract from response object
        lecturersArray = [];
        console.warn('Unexpected response structure:', response);
      }
      
      console.log('Final lecturers array:', lecturersArray);
      console.log('Number of lecturers:', lecturersArray.length);
      if (lecturersArray.length > 0) {
        console.log('First lecturer:', lecturersArray[0]);
      } else {
        console.warn('No lecturers found in response');
      }
      
      setLecturers(lecturersArray);
    } catch (error) {
      console.error('Error loading lecturers:', error);
      console.error('Error response:', error.response);
      console.error('Error status:', error.response?.status);
      console.error('Error details:', error.response?.data || error.message);
      setError('Failed to load lecturers. Please refresh the page.');
      setLecturers([]);
    }
  };

  const loadCourses = async () => {
    try {
      setLoading(true);

      // Fetch all courses (no semester/year filter – filtering is done on the client)
      const [allCoursesResponse, enrolledResponse] = await Promise.all([
        apiService.courses.getAll({}),
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
      summer: { backgroundColor: 'rgba(243, 129, 129, 0.3)', color: '#333', border: '1px solid #F38181' },
      fall: { backgroundColor: 'rgba(252, 227, 138, 0.3)', color: '#333', border: '1px solid #FCE38A' },
      spring: { backgroundColor: 'rgba(214, 247, 173, 0.3)', color: '#333', border: '1px solid #D6F7AD' },
      winter: { backgroundColor: 'rgba(149, 225, 211, 0.3)', color: '#333', border: '1px solid #95E1D3' }
    };
    return colors[semester] || { backgroundColor: 'rgba(149, 225, 211, 0.3)', color: '#333', border: '1px solid #95E1D3' };
  };

  const openCourseDetails = (course) => {
    setDetailsDialog({ open: true, course });
  };

  const closeCourseDetails = () => {
    setDetailsDialog({ open: false, course: null });
  };

  // Helper to always get a fresh token and call the API
  const fetchWithToken = async (url, options = {}) => {
    let token;
    try {
      // Auth0 identifier does NOT include /api
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const baseUrlWithoutApi = apiBaseUrl.replace(/\/api$/, '');
      const audience = import.meta.env.VITE_AUTH0_AUDIENCE || baseUrlWithoutApi;
      
      token = await getAccessTokenSilently({
        authorizationParams: {
          audience: audience,
          scope: 'openid profile email offline_access'
        },
        ignoreCache: true
      });
    } catch (err) {
      // If user hasn't consented to these scopes yet, show error instead of redirecting
      const needsConsent = err?.error === 'consent_required' || (err?.message && err.message.includes('consent'));
      const missingRefresh = err?.message && err.message.includes('Missing Refresh Token');
      if (needsConsent || missingRefresh) {
        console.log('Consent issue detected');
        setError('Additional permissions required. Please refresh the page to grant permissions.');
        return null;
      }
      throw err;
    }

    const headers = {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`
    };

    return fetch(url, { ...options, headers });
  };

  // Refresh all user roles from Auth0
  const refreshRolesFromAuth0 = async () => {
    try {
      console.log('Refreshing all user roles from Auth0 when opening create course dialog...');
      
      const base = import.meta.env.VITE_API_BASE_URL || 'https://moodle-homework-planner.onrender.com';
      const url = `${base.replace(/\/$/, '')}/api/users/refresh-roles`;

      const resp = await fetchWithToken(url, { method: 'POST' });
      if (!resp) {
        // fetchWithToken returned null due to consent issues
        return;
      }
      if (!resp.ok) {
        const text = await resp.text();
        console.error(`Failed to refresh roles: ${resp.status} ${text}`);
        return;
      }

      const data = await resp.json();
      console.log('All roles refreshed from Auth0:', data);
    } catch (err) {
      console.error('Failed to refresh roles:', err);
      // Don't set error state for background refresh
    }
  };

  const handleOpenCreateDialog = async () => {
    setFormData({
      course_name: '',
      course_code: '',
      description: '',
      syllabus: '',
      credits: '',
      semester: '',
      year: '',
      lecturer_id: ''
    });
    setCreateDialogOpen(true);
    setError('');
    setSuccess('');
    
    // Refresh roles from Auth0 first, then reload lecturers
    await refreshRolesFromAuth0();
    // Reload lecturers when opening the dialog to ensure we have the latest list
    loadLecturers();
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
    setError('');
    setLecturerSelectFocused(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateCourse = async () => {
    try {
      setError('');
      
      if (!formData.course_name.trim()) {
        setError('Course name is required');
        return;
      }
      
      if (!formData.course_code.trim()) {
        setError('Course code is required');
        return;
      }

      if (!formData.semester) {
        setError('Please select a semester');
        return;
      }

      if (!formData.year) {
        setError('Please select a year');
        return;
      }

      if (!formData.lecturer_id) {
        setError('Please select a lecturer');
        return;
      }

      const courseData = {
        ...formData,
        credits: formData.credits ? parseInt(formData.credits) : null
      };

      await apiService.courses.create(courseData);
      setSuccess('Course created successfully! It will be verified by the lecturer.');
      handleCloseCreateDialog();
      loadCourses();
    } catch (error) {
      console.error('Error creating course:', error);
      setError(error?.response?.data?.error || 'Failed to create course');
    }
  };

  // Filter by semester/year (dropdowns) and search term – no refetch when filters change
  const filteredAvailableCourses = availableCourses.filter(course => {
    const matchesSearch =
      course.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.course_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.lecturer_id?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSemester = !selectedSemester || course.semester === selectedSemester;
    const matchesYear = !selectedYear || String(course.year) === String(selectedYear);
    return matchesSearch && matchesSemester && matchesYear;
  });

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

  return (
    <DashboardLayout userRole="student">
      <div className="white-page-background">
        <Box>
          <Box display="flex" justifyContent="flex-start" alignItems="center" sx={{ px: 3, pt: 3, mb: 2 }}>
            <IconButton
              onClick={handleOpenCreateDialog}
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
              <AddIconPhosphor size={48} weight="thin" />
            </IconButton>
          </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2, mx: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2, mx: 3 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <Grid container spacing={0} sx={{ width: '100%', margin: 0 }}>
          {/* Enrolled Courses */}
          <Grid item xs={12} xl={6} sx={{ padding: '8px', minWidth: '50%', flex: '1 1 50%' }}>
            <div className="dashboard-card" style={{ height: '100%', minHeight: '600px' }}>
              <div className="card-content">
                <Typography variant="h6" gutterBottom display="flex" alignItems="center">
                  <CheckCircleIcon sx={{ mr: 1, color: '#4CAF50' }} />
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
                                    backgroundColor: 'rgba(214, 247, 173, 0.2)',
                                    color: '#333',
                                    border: '1px solid #D6F7AD'
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
          <Grid item xs={12} xl={6} sx={{ padding: '8px', minWidth: '50%', flex: '1 1 50%' }}>
            <div className="dashboard-card" style={{ height: '100%', minHeight: '600px' }}>
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
                    <FormControl fullWidth size="small" variant="outlined">
                      <InputLabel id={filterSemesterLabelId} shrink>Semester</InputLabel>
                      <Select
                        labelId={filterSemesterLabelId}
                        id={filterSemesterSelectId}
                        value={selectedSemester}
                        onChange={(e) => setSelectedSemester(e.target.value)}
                        label="Semester"
                        notched
                        displayEmpty
                        renderValue={(value) =>
                          value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Select a semester'
                        }
                      >
                        <MenuItem value="">
                          <em>Select a semester</em>
                        </MenuItem>
                        {semesters.map((semester) => (
                          <MenuItem key={semester} value={semester}>
                            {semester.charAt(0).toUpperCase() + semester.slice(1)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth size="small" variant="outlined">
                      <InputLabel id={filterYearLabelId} shrink>Year</InputLabel>
                      <Select
                        labelId={filterYearLabelId}
                        id={filterYearSelectId}
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        label="Year"
                        notched
                        displayEmpty
                        renderValue={(value) =>
                          value ? String(value) : 'Select a year'
                        }
                      >
                        <MenuItem value="">
                          <em>Select a year</em>
                        </MenuItem>
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
                                    backgroundColor: 'rgba(214, 247, 173, 0.2)',
                                    color: '#333',
                                    border: '1px solid #D6F7AD'
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
                  <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" mb={1}>
                    <Typography variant="h6" component="span">
                      {detailsDialog.course.course_name}
                    </Typography>
                    {detailsDialog.course.course_code && (
                      <Chip label={String(detailsDialog.course.course_code)} variant="outlined" size="small" />
                    )}
                  </Box>
                  <Box display="flex" gap={1} mb={1}>
                    {detailsDialog.course.semester && (
                      <Chip 
                        label={String(detailsDialog.course.semester).charAt(0).toUpperCase() + String(detailsDialog.course.semester).slice(1)} 
                        sx={getSemesterChipColor(detailsDialog.course.semester)}
                        size="small"
                      />
                    )}
                    <Chip label={String(detailsDialog.course.year || '')} variant="outlined" size="small" />
                  </Box>
                  {detailsDialog.course.credits && (
                    <Chip label={String(detailsDialog.course.credits) + ' credits'} variant="outlined" size="small" sx={{ borderColor: '#999', color: '#555' }} />
                  )}
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
            <Button 
              onClick={closeCourseDetails}
              variant="outlined"
              sx={{
                backgroundColor: '#fff',
                color: '#555',
                border: '1px solid rgba(0, 0, 0, 0.12)',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  border: '1px solid rgba(0, 0, 0, 0.2)'
                }
              }}
            >
              Close
            </Button>
            {detailsDialog.course && !enrolledCourses.find(c => c._id === detailsDialog.course._id) && (
              <Button 
                variant="contained" 
                sx={{ backgroundColor: '#2e7d32', color: '#fff', '&:hover': { backgroundColor: '#1b5e20' } }}
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

        {/* Create Course Dialog */}
        <Dialog open={createDialogOpen} onClose={handleCloseCreateDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            Create New Course
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="Course Name"
                  name="course_name"
                  value={formData.course_name}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Course Code"
                  name="course_code"
                  value={formData.course_code}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., CS101"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  multiline
                  rows={3}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Syllabus"
                  name="syllabus"
                  value={formData.syllabus}
                  onChange={handleInputChange}
                  multiline
                  rows={4}
                  placeholder="Detailed course syllabus and objectives"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Credits"
                  name="credits"
                  type="number"
                  value={formData.credits}
                  onChange={handleInputChange}
                  inputProps={{ min: 1, max: 10 }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel id={semesterLabelId} shrink>Semester</InputLabel>
                  <Select
                    labelId={semesterLabelId}
                    id={semesterSelectId}
                    name="semester"
                    value={formData.semester}
                    onChange={handleInputChange}
                    label="Semester"
                    notched
                    displayEmpty
                    renderValue={(value) =>
                      value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Select a semester'
                    }
                  >
                    <MenuItem value="">
                      <em>Select a semester</em>
                    </MenuItem>
                    {semesters.map((semester) => (
                      <MenuItem key={semester} value={semester}>
                        {semester.charAt(0).toUpperCase() + semester.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel id={yearLabelId} shrink>Year</InputLabel>
                  <Select
                    labelId={yearLabelId}
                    id={yearSelectId}
                    name="year"
                    value={formData.year}
                    onChange={handleInputChange}
                    label="Year"
                    notched
                    displayEmpty
                    renderValue={(value) =>
                      value ? String(value) : 'Select a year'
                    }
                  >
                    <MenuItem value="">
                      <em>Select a year</em>
                    </MenuItem>
                    {years.map((year) => (
                      <MenuItem key={year} value={year}>
                        {year}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel id={lecturerLabelId} shrink>Lecturer</InputLabel>
                  <Select
                    labelId={lecturerLabelId}
                    id={lecturerSelectId}
                    name="lecturer_id"
                    value={formData.lecturer_id || ''}
                    onChange={handleInputChange}
                    label="Lecturer"
                    notched
                    displayEmpty
                    renderValue={(value) => {
                      if (!value) {
                        return 'Select a lecturer';
                      }
                      const selectedLecturer = lecturers.find(l => l._id === value || l._id?.toString() === value);
                      if (selectedLecturer) {
                        return selectedLecturer.name || selectedLecturer.full_name || selectedLecturer.email;
                      }
                      return '';
                    }}
                  >
                    {lecturers.length === 0 ? (
                      <MenuItem disabled value="">
                        <em>No lecturers available</em>
                      </MenuItem>
                    ) : (
                      lecturers.map((lecturer) => (
                        <MenuItem key={lecturer._id} value={lecturer._id}>
                          {lecturer.name || lecturer.full_name || lecturer.email}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={handleCloseCreateDialog}
              sx={{
                color: '#333',
                '&:hover': {
                  backgroundColor: 'rgba(0,0,0,0.04)',
                  color: '#333'
                }
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateCourse} 
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
              Create Course
            </Button>
          </DialogActions>
        </Dialog>
        </Box>
      </div>
    </DashboardLayout>
  );
};

export default CourseEnrollment;
