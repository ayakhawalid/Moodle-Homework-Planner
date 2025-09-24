import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Group as GroupIcon,
  Assignment as AssignmentIcon,
  School as SchoolIcon,
  Visibility as ViewIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  Description as DescriptionIcon,
  Settings as SettingsIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon
} from '@mui/icons-material';
import DashboardLayout from '../../Components/DashboardLayout';
import { useUserSyncContext } from '../../contexts/UserSyncContext';
import { apiService } from '../../services/api';
import { useNavigate } from 'react-router-dom';

const CourseManagement = () => {
  const { user } = useUserSyncContext();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingCourse, setViewingCourse] = useState(null);
  const [partnerSettingsDialogOpen, setPartnerSettingsDialogOpen] = useState(false);
  const [editingPartnerSettings, setEditingPartnerSettings] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    course_name: '',
    course_code: '',
    description: '',
    syllabus: '',
    credits: '',
    semester: '',
    year: new Date().getFullYear()
  });

  const [partnerSettingsData, setPartnerSettingsData] = useState({
    enabled: true,
    max_partners_per_student: 1
  });

  const semesters = ['fall', 'spring', 'summer', 'winter'];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear + i - 2);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const response = await apiService.courses.getAll();
      setCourses(response.data || response);
    } catch (error) {
      console.error('Error loading courses:', error);
      setError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (course = null) => {
    setEditingCourse(course);
    if (course) {
      setFormData({
        course_name: course.course_name || '',
        course_code: course.course_code || '',
        description: course.description || '',
        syllabus: course.syllabus || '',
        credits: course.credits || '',
        semester: course.semester || '',
        year: course.year || new Date().getFullYear()
      });
    } else {
      setFormData({
        course_name: '',
        course_code: '',
        description: '',
        syllabus: '',
        credits: '',
        semester: '',
        year: new Date().getFullYear()
      });
    }
    setDialogOpen(true);
    setError('');
    setSuccess('');
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCourse(null);
    setError('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      setError('');
      
      // Validation
      if (!formData.course_name.trim()) {
        setError('Course name is required');
        return;
      }
      
      if (!formData.course_code.trim()) {
        setError('Course code is required');
        return;
      }

      const courseData = {
        ...formData,
        credits: formData.credits ? parseInt(formData.credits) : null
      };

      if (editingCourse) {
        await apiService.courses.update(editingCourse._id, courseData);
        setSuccess('Course updated successfully');
      } else {
        await apiService.courses.create(courseData);
        setSuccess('Course created successfully');
      }
      
      handleCloseDialog();
      loadCourses();
    } catch (error) {
      console.error('Error saving course:', error);
      setError(error?.response?.data?.error || 'Failed to save course');
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return;
    }

    try {
      await apiService.courses.delete(courseId);
      setSuccess('Course deleted successfully');
      loadCourses();
    } catch (error) {
      console.error('Error deleting course:', error);
      setError(error?.response?.data?.error || 'Failed to delete course');
    }
  };

  const handleViewCourse = (course) => {
    setViewingCourse(course);
    setViewDialogOpen(true);
  };

  const handleCloseViewDialog = () => {
    setViewDialogOpen(false);
    setViewingCourse(null);
  };

  const handleManageAssignments = (course) => {
    // Navigate to homework checker with course pre-selected
    navigate('/lecturer/homework-checker', { 
      state: { 
        selectedCourseId: course._id, 
        courseName: course.course_name 
      } 
    });
  };

  const handleOpenPartnerSettings = (course) => {
    setEditingPartnerSettings(course);
    setPartnerSettingsData({
      enabled: course.partner_settings?.enabled !== false,
      max_partners_per_student: course.partner_settings?.max_partners_per_student || 1
    });
    setPartnerSettingsDialogOpen(true);
    setError('');
    setSuccess('');
  };

  const handleClosePartnerSettings = () => {
    setPartnerSettingsDialogOpen(false);
    setEditingPartnerSettings(null);
    setError('');
  };

  const handlePartnerSettingsChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPartnerSettingsData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSavePartnerSettings = async () => {
    try {
      setError('');
      
      await apiService.courses.updatePartnerSettings(editingPartnerSettings._id, partnerSettingsData);
      setSuccess('Partner settings updated successfully');
      handleClosePartnerSettings();
      loadCourses();
    } catch (error) {
      console.error('Error updating partner settings:', error);
      setError(error?.response?.data?.error || 'Failed to update partner settings');
    }
  };

  const getSemesterChipColor = (semester) => {
    const colors = {
      fall: 'warning',
      spring: 'success',
      summer: 'info',
      winter: 'primary'
    };
    return colors[semester] || 'default';
  };

  if (loading) {
    return (
      <DashboardLayout userRole="lecturer">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="lecturer">
      <Box p={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" gutterBottom>
            Course Management
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            size="large"
          >
            Add New Course
          </Button>
        </Box>

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

        <Card>
          <CardContent>
            {courses.length === 0 ? (
              <Box textAlign="center" py={4}>
                <SchoolIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No courses found
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  Start by creating your first course to manage your classes and assignments.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenDialog()}
                >
                  Create Your First Course
                </Button>
              </Box>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Course Details</TableCell>
                      <TableCell>Code</TableCell>
                      <TableCell>Semester/Year</TableCell>
                      <TableCell>Credits</TableCell>
                      <TableCell>Students</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {courses.map((course) => (
                      <TableRow key={course._id} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="subtitle1" fontWeight="bold">
                              {course.course_name}
                            </Typography>
                            {course.description && (
                              <Typography variant="body2" color="text.secondary">
                                {course.description.substring(0, 100)}
                                {course.description.length > 100 ? '...' : ''}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={course.course_code || 'No Code'} 
                            variant="outlined" 
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box>
                            {course.semester && (
                              <Chip 
                                label={course.semester.charAt(0).toUpperCase() + course.semester.slice(1)} 
                                color={getSemesterChipColor(course.semester)}
                                size="small"
                                sx={{ mr: 1 }}
                              />
                            )}
                            <Typography variant="body2" color="text.secondary">
                              {course.year}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {course.credits ? `${course.credits} credits` : 'Not specified'}
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <GroupIcon sx={{ mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2">
                              {course.students?.length || 0} enrolled
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="View Course">
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => handleViewCourse(course)}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit Course">
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => handleOpenDialog(course)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Manage Assignments">
                            <IconButton 
                              size="small" 
                              color="secondary"
                              onClick={() => handleManageAssignments(course)}
                            >
                              <AssignmentIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Partner Settings">
                            <IconButton 
                              size="small" 
                              color={course.partner_settings?.enabled !== false ? "success" : "warning"}
                              onClick={() => handleOpenPartnerSettings(course)}
                            >
                              {course.partner_settings?.enabled !== false ? <ToggleOnIcon /> : <ToggleOffIcon />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Course">
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleDeleteCourse(course._id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Course Dialog */}
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingCourse ? 'Edit Course' : 'Add New Course'}
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
                <FormControl fullWidth>
                  <InputLabel>Semester</InputLabel>
                  <Select
                    name="semester"
                    value={formData.semester}
                    onChange={handleInputChange}
                    label="Semester"
                  >
                    {semesters.map((semester) => (
                      <MenuItem key={semester} value={semester}>
                        {semester.charAt(0).toUpperCase() + semester.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Year</InputLabel>
                  <Select
                    name="year"
                    value={formData.year}
                    onChange={handleInputChange}
                    label="Year"
                  >
                    {years.map((year) => (
                      <MenuItem key={year} value={year}>
                        {year}
                      </MenuItem>
                    ))}
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
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained">
              {editingCourse ? 'Update Course' : 'Create Course'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* View Course Dialog */}
        <Dialog open={viewDialogOpen} onClose={handleCloseViewDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            <Box display="flex" alignItems="center">
              <SchoolIcon sx={{ mr: 1 }} />
              Course Details
            </Box>
          </DialogTitle>
          <DialogContent>
            {viewingCourse && (
              <Box>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Typography variant="h5" gutterBottom>
                      {viewingCourse.course_name}
                    </Typography>
                    <Box display="flex" alignItems="center" mb={2}>
                      <Chip 
                        label={viewingCourse.course_code || 'No Code'} 
                        variant="outlined" 
                        sx={{ mr: 2 }}
                      />
                      <Chip 
                        label={viewingCourse.semester ? viewingCourse.semester.charAt(0).toUpperCase() + viewingCourse.semester.slice(1) : 'No Semester'} 
                        color={getSemesterChipColor(viewingCourse.semester)}
                        sx={{ mr: 2 }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {viewingCourse.year}
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          <CalendarIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                          Course Information
                        </Typography>
                        <List dense>
                          <ListItem>
                            <ListItemText 
                              primary="Credits" 
                              secondary={viewingCourse.credits ? `${viewingCourse.credits} credits` : 'Not specified'} 
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText 
                              primary="Semester" 
                              secondary={viewingCourse.semester ? viewingCourse.semester.charAt(0).toUpperCase() + viewingCourse.semester.slice(1) : 'Not specified'} 
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText 
                              primary="Year" 
                              secondary={viewingCourse.year || 'Not specified'} 
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText 
                              primary="Students Enrolled" 
                              secondary={viewingCourse.students?.length || 0} 
                            />
                          </ListItem>
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          <GroupIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                          Enrollment
                        </Typography>
                        <Box display="flex" alignItems="center" mb={2}>
                          <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                          <Typography variant="body1">
                            {viewingCourse.students?.length || 0} students enrolled
                          </Typography>
                        </Box>
                        {viewingCourse.students && viewingCourse.students.length > 0 && (
                          <Box>
                            <Typography variant="subtitle2" gutterBottom>
                              Enrolled Students:
                            </Typography>
                            <List dense>
                              {viewingCourse.students.slice(0, 5).map((student, index) => (
                                <ListItem key={index}>
                                  <ListItemText 
                                    primary={student.name || student.full_name || student.email}
                                    secondary={student.email}
                                  />
                                </ListItem>
                              ))}
                              {viewingCourse.students.length > 5 && (
                                <ListItem>
                                  <ListItemText 
                                    primary={`... and ${viewingCourse.students.length - 5} more students`}
                                    sx={{ fontStyle: 'italic' }}
                                  />
                                </ListItem>
                              )}
                            </List>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>

                  {viewingCourse.description && (
                    <Grid item xs={12}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            <DescriptionIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                            Description
                          </Typography>
                          <Typography variant="body1">
                            {viewingCourse.description}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}

                  {viewingCourse.syllabus && (
                    <Grid item xs={12}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            <DescriptionIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                            Syllabus
                          </Typography>
                          <Typography variant="body1">
                            {viewingCourse.syllabus}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseViewDialog}>Close</Button>
            <Button 
              onClick={() => {
                handleCloseViewDialog();
                handleOpenDialog(viewingCourse);
              }} 
              variant="contained"
            >
              Edit Course
            </Button>
          </DialogActions>
        </Dialog>

        {/* Partner Settings Dialog */}
        <Dialog 
          open={partnerSettingsDialogOpen} 
          onClose={handleClosePartnerSettings}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" alignItems="center">
              <SettingsIcon sx={{ mr: 1 }} />
              Partner Settings - {editingPartnerSettings?.course_name}
            </Box>
          </DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {success}
              </Alert>
            )}
            
            <Box sx={{ mt: 2 }}>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Enable Partner Functionality
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Allow students to form study partnerships for this course
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center">
                    <input
                      type="checkbox"
                      name="enabled"
                      checked={partnerSettingsData.enabled}
                      onChange={handlePartnerSettingsChange}
                      style={{ transform: 'scale(1.5)' }}
                    />
                  </Box>
                </Box>
              </FormControl>

              {partnerSettingsData.enabled && (
                <FormControl fullWidth>
                  <InputLabel>Maximum Partners per Student</InputLabel>
                  <Select
                    name="max_partners_per_student"
                    value={partnerSettingsData.max_partners_per_student}
                    onChange={handlePartnerSettingsChange}
                    label="Maximum Partners per Student"
                  >
                    <MenuItem value={1}>1 Partner</MenuItem>
                    <MenuItem value={2}>2 Partners</MenuItem>
                    <MenuItem value={3}>3 Partners</MenuItem>
                    <MenuItem value={4}>4 Partners</MenuItem>
                    <MenuItem value={5}>5 Partners</MenuItem>
                  </Select>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Students can have up to this many partners for this course
                  </Typography>
                </FormControl>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClosePartnerSettings}>
              Cancel
            </Button>
            <Button 
              onClick={handleSavePartnerSettings}
              variant="contained"
              startIcon={<SettingsIcon />}
            >
              Save Settings
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
};

export default CourseManagement;
