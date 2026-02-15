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
  Edit as EditIcon,
  Delete as DeleteIcon,
  Group as GroupIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import {
  Plus as AddIcon,
  ChalkboardTeacher as ChalkboardTeacherIcon,
  CalendarBlank as CalendarBlankIcon,
  Users as UsersIcon,
  TextAlignLeft as TextAlignLeftIcon,
  Notebook as NotebookIcon,
  CheckCircle as CheckCircleIcon,
  XCircle as XCircleIcon
} from 'phosphor-react';
import DashboardLayout from '../../Components/DashboardLayout';
import { useUserSyncContext } from '../../contexts/UserSyncContext';
import { apiService } from '../../services/api';

const CourseManagement = () => {
  const { user } = useUserSyncContext();
  const [courses, setCourses] = useState([]);
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingCourse, setViewingCourse] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const semesters = ['fall', 'spring', 'summer', 'winter'];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear + i - 2);

  const [formData, setFormData] = useState({
    course_name: '',
    course_code: '',
    description: '',
    syllabus: '',
    credits: '',
    semester: '',
    year: ''
  });

  const semesterLabelId = 'course-management-semester-label';
  const semesterSelectId = 'course-management-semester-select';
  const yearLabelId = 'course-management-year-label';
  const yearSelectId = 'course-management-year-select';

  useEffect(() => {
    loadCourses();
    loadPendingVerifications();
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

  const loadPendingVerifications = async () => {
    try {
      const response = await apiService.courses.getPendingVerifications();
      setPendingVerifications(response.data || response);
    } catch (error) {
      console.error('Error loading pending verifications:', error);
    }
  };

  const handleVerifyCourse = async (courseId, status) => {
    try {
      if (status === 'rejected') {
        // Delete the course when rejected
        await apiService.courses.delete(courseId);
        setSuccess('Course rejected and deleted successfully!');
      } else {
        // Verify the course
        await apiService.courses.verify(courseId, status);
        setSuccess('Course verified successfully!');
      }
      loadCourses();
      loadPendingVerifications();
    } catch (error) {
      console.error('Error verifying/rejecting course:', error);
      setError(error?.response?.data?.error || `Failed to ${status === 'rejected' ? 'reject' : 'verify'} course`);
    }
  };

  const handleOpenDialog = (course = null) => {
    setEditingCourse(course);
    if (course) {
      const normalizedSemester = course.semester
        ? course.semester.toString().toLowerCase()
        : semesters[0];
      setFormData({
        course_name: course.course_name || '',
        course_code: course.course_code || '',
        description: course.description || '',
        syllabus: course.syllabus || '',
        credits: course.credits || '',
        semester: semesters.includes(normalizedSemester) ? normalizedSemester : semesters[0],
        year: course.year || currentYear
      });
    } else {
      setFormData({
        course_name: '',
        course_code: '',
        description: '',
        syllabus: '',
        credits: '',
        semester: '',
        year: ''
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

      if (!formData.semester) {
        setError('Please select a semester');
        return;
      }

      if (!formData.year) {
        setError('Please select a year');
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


  const getSemesterChipColor = (semester) => {
    const colors = {
      summer: { backgroundColor: 'rgba(243, 129, 129, 0.3)', color: '#333', border: '1px solid #F38181' },
      fall: { backgroundColor: 'rgba(252, 227, 138, 0.3)', color: '#333', border: '1px solid #FCE38A' },
      spring: { backgroundColor: 'rgba(214, 247, 173, 0.3)', color: '#333', border: '1px solid #D6F7AD' },
      winter: { backgroundColor: 'rgba(149, 225, 211, 0.3)', color: '#333', border: '1px solid #95E1D3' }
    };
    return colors[semester] || { backgroundColor: 'rgba(149, 225, 211, 0.3)', color: '#333', border: '1px solid #95E1D3' };
  };

  if (loading) {
    return (
      <DashboardLayout userRole="lecturer">
        <div className="page-background">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="lecturer">
      <div className="page-background">
      <Box p={3} sx={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        <Box display="flex" justifyContent="flex-start" alignItems="center" mb={3}>
          {/* Add Course Icon Button */}
          <IconButton
            onClick={() => handleOpenDialog()}
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

        {/* Pending Verifications Section */}
        {pendingVerifications.length > 0 && (
          <div className="dashboard-card course-management-container" style={{ marginBottom: '24px', background: 'transparent', boxShadow: 'none', border: 'none' }}>
            <div className="card-content">
              <Typography variant="h6" gutterBottom sx={{ mb: 2, color: '#F38181', fontWeight: 'bold' }}>
                Pending Course Verifications ({pendingVerifications.length})
              </Typography>
              <TableContainer sx={{ background: 'transparent', fontFamily: 'Inter, system-ui, sans-serif' }}>
                <Table sx={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: '#333', fontWeight: 600, fontSize: '1rem', fontFamily: 'Inter, system-ui, sans-serif' }}>Course name</TableCell>
                      <TableCell sx={{ color: '#333', fontWeight: 600, fontSize: '1rem', fontFamily: 'Inter, system-ui, sans-serif' }}>Code</TableCell>
                      <TableCell sx={{ color: '#333', fontWeight: 600, fontSize: '1rem', fontFamily: 'Inter, system-ui, sans-serif' }}>Semester/Year</TableCell>
                      <TableCell sx={{ color: '#333', fontWeight: 600, fontSize: '1rem', fontFamily: 'Inter, system-ui, sans-serif' }}>Credits</TableCell>
                      <TableCell sx={{ color: '#333', fontWeight: 600, fontSize: '1rem', fontFamily: 'Inter, system-ui, sans-serif' }}>Created By</TableCell>
                      <TableCell sx={{ color: '#333', fontWeight: 600, fontSize: '1rem', fontFamily: 'Inter, system-ui, sans-serif' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody sx={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    {pendingVerifications.map((course) => (
                      <TableRow key={course._id} hover>
                        <TableCell>
                          <Typography variant="subtitle1">
                            {course.course_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={String(course.course_code || 'No Code')} 
                            variant="outlined" 
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            {course.semester && (
                              <Chip 
                                label={String(course.semester).charAt(0).toUpperCase() + String(course.semester).slice(1)} 
                                size="small"
                                sx={getSemesterChipColor(course.semester)}
                              />
                            )}
                            {course.year && (
                              <Typography variant="body2" color="text.secondary">{course.year}</Typography>
                            )}
                            {!course.semester && !course.year && (
                              <Typography variant="body2" color="text.secondary">—</Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          {course.credits ? `${course.credits} credits` : 'Not specified'}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {course.created_by_user?.name || course.created_by_user?.email || 'Unknown'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={1}>
                            <IconButton
                              size="small"
                              onClick={() => handleVerifyCourse(course._id, 'verified')}
                              sx={{
                                color: '#2E7D32',
                                '&:hover': {
                                  backgroundColor: 'rgba(46, 125, 50, 0.1)'
                                }
                              }}
                            >
                              <CheckCircleIcon size={20} weight="fill" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleVerifyCourse(course._id, 'rejected')}
                              sx={{
                                color: '#D32F2F',
                                '&:hover': {
                                  backgroundColor: 'rgba(211, 47, 47, 0.1)'
                                }
                              }}
                            >
                              <XCircleIcon size={20} weight="fill" />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </div>
          </div>
        )}

        {courses.length > 0 && (
        <div className="dashboard-card course-management-container" style={{ background: 'transparent', boxShadow: 'none', border: 'none' }}>
          <div className="card-content">
              <TableContainer sx={{ background: 'transparent', fontFamily: 'Inter, system-ui, sans-serif' }}>
                <Table sx={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: '#333', fontWeight: 600, fontSize: '1rem', fontFamily: 'Inter, system-ui, sans-serif' }}>Course name</TableCell>
                      <TableCell sx={{ color: '#333', fontWeight: 600, fontSize: '1rem', fontFamily: 'Inter, system-ui, sans-serif' }}>Code</TableCell>
                      <TableCell sx={{ color: '#333', fontWeight: 600, fontSize: '1rem', fontFamily: 'Inter, system-ui, sans-serif' }}>Semester/Year</TableCell>
                      <TableCell sx={{ color: '#333', fontWeight: 600, fontSize: '1rem', fontFamily: 'Inter, system-ui, sans-serif' }}>Credits</TableCell>
                      <TableCell sx={{ color: '#333', fontWeight: 600, fontSize: '1rem', fontFamily: 'Inter, system-ui, sans-serif' }}>Students</TableCell>
                      <TableCell sx={{ color: '#333', fontWeight: 600, fontSize: '1rem', fontFamily: 'Inter, system-ui, sans-serif' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody sx={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    {courses.map((course) => (
                      <TableRow key={course._id} hover>
                        <TableCell>
                          <Typography variant="subtitle1">
                            {course.course_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={String(course.course_code || 'No Code')} 
                            variant="outlined" 
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            {course.semester && (
                              <Chip 
                                label={String(course.semester).charAt(0).toUpperCase() + String(course.semester).slice(1)} 
                                size="small"
                                sx={getSemesterChipColor(course.semester)}
                              />
                            )}
                            {course.year && (
                              <Typography variant="body2" color="text.secondary">{course.year}</Typography>
                            )}
                            {!course.semester && !course.year && (
                              <Typography variant="body2" color="text.secondary">—</Typography>
                            )}
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
                              onClick={() => handleViewCourse(course)}
                              sx={{ color: '#F38181', '&:hover': { backgroundColor: 'rgba(243, 129, 129, 0.1)' } }}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit Course">
                            <IconButton 
                              size="small" 
                              onClick={() => handleOpenDialog(course)}
                              sx={{ color: '#F38181', '&:hover': { backgroundColor: 'rgba(243, 129, 129, 0.1)' } }}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Course">
                            <IconButton 
                              size="small" 
                              onClick={() => handleDeleteCourse(course._id)}
                              sx={{ color: '#F38181', '&:hover': { backgroundColor: 'rgba(243, 129, 129, 0.1)' } }}
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
          </div>
        </div>
        )}

        {/* Add/Edit Course Dialog */}
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth PaperProps={{ sx: { fontFamily: 'Inter, system-ui, sans-serif' } }}>
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
            </Grid>
            
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={handleCloseDialog}
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
              onClick={handleSubmit} 
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
              {editingCourse ? 'Update Course' : 'Create Course'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* View Course Dialog */}
        <Dialog open={viewDialogOpen} onClose={handleCloseViewDialog} maxWidth="md" fullWidth PaperProps={{ sx: { fontFamily: 'Inter, system-ui, sans-serif' } }}>
          <DialogTitle>
            <Box display="flex" alignItems="center">
              <ChalkboardTeacherIcon size={28} weight="duotone" style={{ marginRight: 8 }} />
              Course Details
            </Box>
          </DialogTitle>
          <DialogContent>
            {viewingCourse && (
              <Box>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Box display="flex" alignItems="center" flexWrap="wrap" gap={1} mb={1}>
                      <Typography variant="h5" component="span">
                        {viewingCourse.course_name}
                      </Typography>
                      <Chip 
                        label={String(viewingCourse.course_code || 'No Code')} 
                        variant="outlined" 
                        size="small"
                      />
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2" color="text.secondary">
                        {viewingCourse.semester ? String(viewingCourse.semester).charAt(0).toUpperCase() + String(viewingCourse.semester).slice(1) : 'No Semester'}
                        {viewingCourse.year ? ` · ${viewingCourse.year}` : ''}
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          <CalendarBlankIcon size={22} weight="duotone" style={{ marginRight: 8, verticalAlign: 'middle' }} />
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
                          <UsersIcon size={22} weight="duotone" style={{ marginRight: 8, verticalAlign: 'middle' }} />
                          Enrollment
                        </Typography>
                        <Box display="flex" alignItems="center" mb={2}>
                          <UsersIcon size={20} weight="duotone" style={{ marginRight: 8, color: 'rgba(0,0,0,0.54)' }} />
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
                            <TextAlignLeftIcon size={22} weight="duotone" style={{ marginRight: 8, verticalAlign: 'middle' }} />
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
                            <NotebookIcon size={22} weight="duotone" style={{ marginRight: 8, verticalAlign: 'middle' }} />
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
            <Button 
              onClick={handleCloseViewDialog}
              sx={{
                color: '#333',
                '&:hover': {
                  backgroundColor: 'rgba(0,0,0,0.04)',
                  color: '#333'
                }
              }}
            >
              Close
            </Button>
            <Button 
              onClick={() => {
                handleCloseViewDialog();
                handleOpenDialog(viewingCourse);
              }} 
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
              Edit Course
            </Button>
          </DialogActions>
        </Dialog>

      </Box>
      </div>
    </DashboardLayout>
  );
};

export default CourseManagement;
