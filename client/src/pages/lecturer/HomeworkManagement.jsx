import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  IconButton,
  Divider,
  Switch,
  FormControlLabel,
  Paper,
  Tabs,
  Tab
} from '@mui/material';
import DashboardLayout from '../../Components/DashboardLayout';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Schedule as ScheduleIcon,
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  Warning as WarningIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import { useAuth0 } from '@auth0/auth0-react';
import { apiService } from '../../services/api';
import '../../styles/DashboardLayout.css';

const HomeworkManagement = () => {
  const { isAuthenticated } = useAuth0();
  const [homework, setHomework] = useState([]);
  const [studentHomework, setStudentHomework] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [searchCourse, setSearchCourse] = useState('');
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState(null);
  const [editingHomework, setEditingHomework] = useState(null);
  
  // Form states
  const [newHomework, setNewHomework] = useState({
    title: '',
    description: '',
    instructions: '',
    course_id: '',
    due_date: '',
    allow_partners: false,
    max_partners: 1
  });

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, searchCourse]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch courses
      const coursesResponse = await apiService.courses.getAll();
      setCourses(coursesResponse.data);
      
      // Fetch all homework (traditional homework) with course filter
      const homeworkParams = searchCourse ? { course_id: searchCourse } : {};
      const homeworkResponse = await apiService.homework.getAll(homeworkParams);
      const homeworkData = homeworkResponse.data || [];
      console.log('Homework data:', homeworkData.map(hw => ({ id: hw._id, title: hw.title })));
      setHomework(homeworkData);
      
      // Fetch student homework
      try {
        const studentHwResponse = await apiService.studentHomework.getLecturerHomework();
        // The API returns { homework: [...] }, so we need to access the homework property
        const allHomeworkData = studentHwResponse.data?.homework || [];
        
        // Filter to only show student-created homework (exclude lecturer-created homework)
        let studentHwData = allHomeworkData.filter(hw => hw.uploader_role === 'student');
        
        // Apply course filter on frontend for student homework (since API doesn't support course filtering yet)
        if (searchCourse) {
          studentHwData = studentHwData.filter(hw => (hw.course?._id || hw.course_id) === searchCourse);
        }
        
        console.log('Student homework data:', studentHwData.map(hw => ({ id: hw._id, title: hw.title, role: hw.uploader_role })));
        setStudentHomework(studentHwData);
      } catch (err) {
        console.error('Error fetching student homework:', err);
        // Don't fail the whole page if student homework fetch fails
        setStudentHomework([]);
      }
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHomework = async () => {
    try {
      setSubmitting(true);
      setError(null);
      
      // Validate required fields
      if (!newHomework.course_id || !newHomework.title || !newHomework.description || !newHomework.due_date) {
        throw new Error('Please fill in all required fields');
      }

      // Convert due_date to proper format
      const homeworkData = {
        ...newHomework,
        due_date: new Date(newHomework.due_date).toISOString()
      };

      await apiService.homework.create(homeworkData);
      
      setSuccess('Homework created successfully!');
      setCreateDialogOpen(false);
      setNewHomework({
        title: '',
        description: '',
        instructions: '',
        course_id: '',
        due_date: '',
        allow_partners: false,
        max_partners: 1
      });
      fetchData();
    } catch (err) {
      console.error('Error creating homework:', err);
      setError(err.response?.data?.error || err.message || 'Failed to create homework');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditHomework = (hw) => {
    setEditingHomework(hw);
    setNewHomework({
      title: hw.title,
      description: hw.description,
      instructions: hw.instructions || '',
      course_id: hw.course_id?._id || hw.course_id,
      due_date: hw.due_date ? new Date(hw.due_date).toISOString().slice(0, 16) : '',
      allow_partners: hw.allow_partners || false,
      max_partners: hw.max_partners || 1
    });
    setEditDialogOpen(true);
  };

  const handleUpdateHomework = async () => {
    try {
      setSubmitting(true);
      setError(null);
      
      // Validate required fields
      if (!newHomework.course_id || !newHomework.title || !newHomework.description || !newHomework.due_date) {
        throw new Error('Please fill in all required fields');
      }

      // Check if we're editing student homework or regular homework
      const isStudentHomework = editingHomework.uploader_role === 'student';

      if (isStudentHomework) {
        // Update student homework
        const homeworkData = {
          title: newHomework.title,
          description: newHomework.description,
          course_id: newHomework.course_id,
          claimed_deadline: new Date(newHomework.due_date).toISOString(),
          allow_partners: newHomework.allow_partners,
          max_partners: newHomework.max_partners
        };
        await apiService.studentHomework.updateHomework(editingHomework._id, homeworkData);
      } else {
        // Update regular homework
        const homeworkData = {
          ...newHomework,
          due_date: new Date(newHomework.due_date).toISOString()
        };
        await apiService.homework.update(editingHomework._id, homeworkData);
      }
      
      setSuccess('Homework updated successfully!');
      setEditDialogOpen(false);
      setEditingHomework(null);
      setNewHomework({
        title: '',
        description: '',
        instructions: '',
        course_id: '',
        due_date: '',
        allow_partners: false,
        max_partners: 1
      });
      fetchData();
    } catch (err) {
      console.error('Error updating homework:', err);
      setError(err.response?.data?.error || err.message || 'Failed to update homework');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteHomework = async () => {
    try {
      setSubmitting(true);
      setError(null);
      
      await apiService.homework.delete(selectedHomework._id);
      
      setSuccess('Homework and all related partnerships deleted successfully!');
      setDeleteDialogOpen(false);
      setSelectedHomework(null);
      fetchData();
    } catch (err) {
      console.error('Error deleting homework:', err);
      setError(err.response?.data?.error || 'Failed to delete homework');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditStudentHomework = (hw) => {
    setEditingHomework(hw);
    // For student homework, we need different fields
    setNewHomework({
      title: hw.title,
      description: hw.description || '',
      instructions: '',
      course_id: hw.course?._id || hw.course_id,
      due_date: hw.claimed_deadline ? new Date(hw.claimed_deadline).toISOString().slice(0, 16) : '',
      allow_partners: hw.allow_partners || false,
      max_partners: hw.max_partners || 1
    });
    setEditDialogOpen(true);
  };

  const handleDeleteStudentHomework = async (hw) => {
    if (!window.confirm(`Are you sure you want to delete "${hw.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      await apiService.studentHomework.deleteHomework(hw._id);
      
      setSuccess('Student homework deleted successfully!');
      fetchData();
    } catch (err) {
      console.error('Error deleting student homework:', err);
      setError(err.response?.data?.error || 'Failed to delete student homework');
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteDialog = (hw) => {
    setSelectedHomework(hw);
    setDeleteDialogOpen(true);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatStatus = (status) => {
    if (!status) return 'Unknown';
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Traditional homework is now filtered on the server side
  const filteredHomework = homework;

  // Student homework is filtered on the frontend (since API doesn't support course filtering yet)
  const filteredStudentHomework = studentHomework;

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
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box mb={4}>
          <Typography variant="h3" component="h1" sx={{ 
            fontWeight: '600',
            fontSize: '2.5rem',
            fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
            letterSpacing: '-0.01em',
            lineHeight: '1.2',
            color: '#2c3e50',
            mb: 1
          }}>
            Homework Management
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ 
            mb: 3,
            fontWeight: '300',
            fontSize: '1.1rem',
            fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
            color: '#7f8c8d',
            lineHeight: '1.6',
            letterSpacing: '0.3px'
          }}>
            Manage homework assignments and review student submissions
          </Typography>
        </Box>
        
        {/* Course Filter */}
        <Box mb={3}>
          <FormControl fullWidth sx={{ maxWidth: 400 }}>
            <InputLabel>Filter by Course</InputLabel>
            <Select
              value={searchCourse}
              onChange={(e) => setSearchCourse(e.target.value)}
              label="Filter by Course"
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.6)',
                borderRadius: '8px'
              }}
            >
              <MenuItem value="">All Courses</MenuItem>
              {courses.map((course) => (
                <MenuItem key={course._id} value={course._id}>
                  {course.course_code} - {course.course_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Tabs */}
        <Paper 
          elevation={0} 
          sx={{ 
            mb: 3, 
            background: 'rgba(255, 255, 255, 0.6)',
            borderRadius: '16px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            border: 'none'
          }}
        >
          <Tabs 
            value={tabValue} 
            onChange={(e, newValue) => setTabValue(newValue)}
            TabIndicatorProps={{
              sx: {
                backgroundColor: '#95E1D3',
                height: 3
              }
            }}
            sx={{
              '& .MuiTab-root': {
                color: '#666',
                fontWeight: 500,
                textTransform: 'none',
                fontSize: '1rem',
                '&.Mui-selected': {
                  color: '#333',
                  fontWeight: 600
                }
              }
            }}
          >
            <Tab 
              icon={<AssignmentIcon />} 
              iconPosition="start" 
              label="My Homework Assignments" 
            />
            <Tab 
              icon={<PeopleIcon />} 
              iconPosition="start" 
              label={`Student Homework (${studentHomework.length})`} 
            />
          </Tabs>
        </Paper>

        {/* Add Homework Button */}
        {tabValue === 0 && (
          <Box display="flex" justifyContent="flex-start" alignItems="center" mb={3}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
              sx={{
                backgroundColor: '#95E1D3',
                color: '#333',
                '&:hover': {
                  backgroundColor: '#7fd1c1'
                }
              }}
            >
              Add Homework
            </Button>
          </Box>
        )}

        {/* Success/Error Messages */}
        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Tab Content */}
        {tabValue === 0 && (
          <Grid container spacing={4} rowSpacing={6}>
            {filteredHomework.length === 0 ? (
              <Grid item xs={12}>
                <div className="dashboard-card" style={{ 
                  padding: '40px', 
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <AssignmentIcon sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
                  <Typography variant="h6" color="textSecondary">
                    No homework assignments yet
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Create your first homework assignment to get started
                  </Typography>
                </div>
              </Grid>
            ) : (
              filteredHomework.map((hw) => {
                const isOverdue = new Date(hw.due_date) < new Date();
                
                return (
                  <Grid item xs={12} md={6} lg={4} key={hw._id || `hw-${Math.random()}`}>
                    <div className="dashboard-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '20px', marginBottom: '16px' }}>
                      <div className="card-content" style={{ flexGrow: 1 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                          <Typography variant="h6" component="h2" sx={{ flexGrow: 1, fontWeight: 600 }}>
                            {hw.title}
                          </Typography>
                        </Box>

                        {/* Course Info */}
                        <Box display="flex" alignItems="center" mb={1}>
                          <SchoolIcon sx={{ mr: 1, fontSize: 16, color: '#95E1D3' }} />
                          <Typography variant="body2" color="text.secondary">
                            {hw.course_id?.course_name || 'Unknown Course'} ({hw.course_id?.course_code || 'N/A'})
                          </Typography>
                        </Box>

                        {/* Due Date */}
                        <Box display="flex" alignItems="center" mb={2}>
                          <ScheduleIcon sx={{ mr: 1, fontSize: 16, color: isOverdue ? '#F38181' : '#D6F7AD' }} />
                          <Typography variant="body2" color={isOverdue ? 'error' : 'text.secondary'}>
                            Due: {formatDate(hw.due_date)}
                            {isOverdue && ' (Overdue)'}
                          </Typography>
                        </Box>

                        {/* Description */}
                        {hw.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {hw.description}
                          </Typography>
                        )}

                        {/* Partner Settings */}
                        {hw.allow_partners && (
                          <Chip
                            label="Allows Partners"
                            sx={{
                              backgroundColor: 'rgba(149, 225, 211, 0.3)',
                              color: '#333',
                              border: '1px solid #95E1D3',
                              mb: 2
                            }}
                            size="small"
                          />
                        )}

                        <Divider sx={{ my: 2 }} />

                        {/* Action Buttons */}
                        <Box display="flex" gap={1}>
                          <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<EditIcon />}
                            onClick={() => handleEditHomework(hw)}
                            size="small"
                            sx={{
                              borderColor: '#95E1D3',
                              color: '#333',
                              '&:hover': { 
                                borderColor: '#7dd3c0', 
                                backgroundColor: 'rgba(149, 225, 211, 0.1)' 
                              }
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            fullWidth
                            variant="outlined"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => openDeleteDialog(hw)}
                            size="small"
                            sx={{
                              '&:hover': { backgroundColor: 'rgba(243, 129, 129, 0.1)' }
                            }}
                          >
                            Delete
                          </Button>
                        </Box>
                      </div>
                    </div>
                  </Grid>
                );
              })
            )}
          </Grid>
        )}

        {/* Student Homework Tab */}
        {tabValue === 1 && (
          <Grid container spacing={4} rowSpacing={6}>
            {filteredStudentHomework.length === 0 ? (
              <Grid item xs={12}>
                <div className="dashboard-card" style={{ padding: '40px', textAlign: 'center' }}>
                  <PeopleIcon sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
                  <Typography variant="h6" color="textSecondary">
                    No student homework yet
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Student homework will appear here when students create homework entries
                  </Typography>
                </div>
              </Grid>
            ) : (
              filteredStudentHomework.map((hw) => (
                <Grid item xs={12} md={6} lg={4} key={hw._id || `student-hw-${Math.random()}`}>
                  <div className="dashboard-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '20px', marginBottom: '16px' }}>
                    <div className="card-content" style={{ flexGrow: 1 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                        <Typography variant="h6" component="h2" sx={{ flexGrow: 1 }}>
                          {hw.title}
                        </Typography>
                      </Box>

                      {/* Student Info */}
                      <Box display="flex" alignItems="center" mb={1}>
                        <PeopleIcon sx={{ mr: 1, fontSize: 16, color: '#95E1D3' }} />
                        <Typography variant="body2" color="text.secondary">
                          {hw.uploaded_by?.full_name || hw.uploaded_by?.name || 'Unknown Student'}
                        </Typography>
                      </Box>

                      {/* Course Info */}
                      <Box display="flex" alignItems="center" mb={1}>
                        <SchoolIcon sx={{ mr: 1, fontSize: 16, color: '#95E1D3' }} />
                        <Typography variant="body2" color="text.secondary">
                          {hw.course?.name || 'Unknown Course'} ({hw.course?.code || 'N/A'})
                        </Typography>
                      </Box>

                      {/* Deadline */}
                      <Box display="flex" alignItems="center" mb={2}>
                        <ScheduleIcon sx={{ mr: 1, fontSize: 16, color: '#D6F7AD' }} />
                        <Typography variant="body2" color="text.secondary">
                          Deadline: {new Date(hw.claimed_deadline).toLocaleDateString()}
                        </Typography>
                      </Box>

                      {/* Description */}
                      {hw.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {hw.description}
                        </Typography>
                      )}

                      {/* Deadline Verification Status Only */}
                      <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                        <Chip
                          label={`Deadline: ${formatStatus(hw.deadline_verification_status)}`}
                          sx={{
                            backgroundColor: hw.deadline_verification_status === 'verified' ? 'rgba(149, 225, 211, 0.3)' : 
                                            'rgba(252, 227, 138, 0.3)',
                            color: '#333',
                            border: hw.deadline_verification_status === 'verified' ? '1px solid #95E1D3' : 
                                    '1px solid #FCE38A'
                          }}
                          size="small"
                        />
                      </Box>

                      <Divider sx={{ my: 2 }} />

                      {/* Action Buttons - Lecturer can edit student homework */}
                      <Box display="flex" gap={1}>
                        <Button
                          fullWidth
                          variant="outlined"
                          startIcon={<EditIcon />}
                          onClick={() => handleEditStudentHomework(hw)}
                          disabled={submitting}
                          size="small"
                          sx={{
                            borderColor: '#95E1D3',
                            color: '#333',
                            '&:hover': { 
                              borderColor: '#7dd3c0', 
                              backgroundColor: 'rgba(149, 225, 211, 0.1)' 
                            }
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          fullWidth
                          variant="outlined"
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={() => handleDeleteStudentHomework(hw)}
                          disabled={submitting}
                          size="small"
                          sx={{
                            '&:hover': { backgroundColor: 'rgba(243, 129, 129, 0.1)' }
                          }}
                        >
                          Delete
                        </Button>
                      </Box>
                    </div>
                  </div>
                </Grid>
              ))
            )}
          </Grid>
        )}

        {/* Create Homework Dialog */}
        <Dialog 
          open={createDialogOpen} 
          onClose={() => setCreateDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={1}>
              <AddIcon />
              Add New Homework
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                {/* Course Selection */}
                <Grid item xs={12}>
                  <FormControl fullWidth required>
                    <InputLabel>Course</InputLabel>
                    <Select
                      value={newHomework.course_id}
                      onChange={(e) => setNewHomework({ ...newHomework, course_id: e.target.value })}
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

                {/* Title */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    required
                    label="Homework Title"
                    value={newHomework.title}
                    onChange={(e) => setNewHomework({ ...newHomework, title: e.target.value })}
                    placeholder="Enter homework title"
                  />
                </Grid>

                {/* Description */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    required
                    label="Description"
                    value={newHomework.description}
                    onChange={(e) => setNewHomework({ ...newHomework, description: e.target.value })}
                    placeholder="Brief description"
                    multiline
                    rows={3}
                  />
                </Grid>

                {/* Instructions */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Detailed Instructions"
                    value={newHomework.instructions}
                    onChange={(e) => setNewHomework({ ...newHomework, instructions: e.target.value })}
                    placeholder="Optional: Detailed instructions"
                    multiline
                    rows={4}
                  />
                </Grid>

                {/* Due Date */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    required
                    label="Due Date"
                    type="datetime-local"
                    value={newHomework.due_date}
                    onChange={(e) => setNewHomework({ ...newHomework, due_date: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                {/* Allow Partners */}
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={newHomework.allow_partners}
                        onChange={(e) => setNewHomework({ ...newHomework, allow_partners: e.target.checked })}
                      />
                    }
                    label="Allow Study Partners"
                  />
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleCreateHomework}
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={20} /> : <AddIcon />}
            >
              {submitting ? 'Creating...' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Homework Dialog */}
        <Dialog 
          open={editDialogOpen} 
          onClose={() => {
            setEditDialogOpen(false);
            setEditingHomework(null);
          }}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={1}>
              <EditIcon />
              Edit Homework
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                {/* Course Selection */}
                <Grid item xs={12}>
                  <FormControl fullWidth required>
                    <InputLabel>Course</InputLabel>
                    <Select
                      value={newHomework.course_id}
                      onChange={(e) => setNewHomework({ ...newHomework, course_id: e.target.value })}
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

                {/* Title */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    required
                    label="Homework Title"
                    value={newHomework.title}
                    onChange={(e) => setNewHomework({ ...newHomework, title: e.target.value })}
                    placeholder="Enter homework title"
                  />
                </Grid>

                {/* Description */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    required
                    label="Description"
                    value={newHomework.description}
                    onChange={(e) => setNewHomework({ ...newHomework, description: e.target.value })}
                    placeholder="Brief description"
                    multiline
                    rows={3}
                  />
                </Grid>

                {/* Instructions */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Detailed Instructions"
                    value={newHomework.instructions}
                    onChange={(e) => setNewHomework({ ...newHomework, instructions: e.target.value })}
                    placeholder="Optional: Detailed instructions"
                    multiline
                    rows={4}
                  />
                </Grid>

                {/* Due Date */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    required
                    label="Due Date"
                    type="datetime-local"
                    value={newHomework.due_date}
                    onChange={(e) => setNewHomework({ ...newHomework, due_date: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                {/* Allow Partners */}
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={newHomework.allow_partners}
                        onChange={(e) => setNewHomework({ ...newHomework, allow_partners: e.target.checked })}
                      />
                    }
                    label="Allow Study Partners"
                  />
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setEditDialogOpen(false);
              setEditingHomework(null);
            }}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleUpdateHomework}
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={20} /> : <EditIcon />}
              sx={{
                backgroundColor: '#95E1D3',
                color: '#333',
                '&:hover': { backgroundColor: '#7dd3c0' }
              }}
            >
              {submitting ? 'Updating...' : 'Update'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog 
          open={deleteDialogOpen} 
          onClose={() => setDeleteDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={1} color="error.main">
              <WarningIcon />
              Delete Homework?
            </Box>
          </DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              This action cannot be undone. All related partnerships and grades will also be deleted.
            </Alert>
            <Typography>
              Are you sure you want to delete "<strong>{selectedHomework?.title}</strong>"?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleDeleteHomework}
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={20} /> : <DeleteIcon />}
            >
              {submitting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
};

export default HomeworkManagement;

