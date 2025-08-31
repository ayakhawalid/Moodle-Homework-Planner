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
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Group as GroupIcon,
  Assignment as AssignmentIcon,
  School as SchoolIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import DashboardLayout from '../../Components/DashboardLayout';
import { useUserSyncContext } from '../../contexts/UserSyncContext';
import { apiService } from '../../services/api';

const CourseManagement = () => {
  const { user } = useUserSyncContext();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
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
                            <IconButton size="small" color="primary">
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
                            <IconButton size="small" color="secondary">
                              <AssignmentIcon />
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
      </Box>
    </DashboardLayout>
  );
};

export default CourseManagement;
