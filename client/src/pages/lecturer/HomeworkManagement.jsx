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
  Plus as AddIcon,
  Trash as DeleteIcon,
  PencilSimple as EditIcon,
  Clock as ScheduleIcon,
  GraduationCap as SchoolIcon,
  BookOpen as AssignmentIcon,
  Warning as WarningIcon,
  Users as PeopleIcon
} from 'phosphor-react';
import { useAuth0 } from '@auth0/auth0-react';
import { apiService } from '../../services/api';
import '../../styles/DashboardLayout.css';
import '../../styles/HomeworkCard.css';

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
        
        console.log('All student homework before filtering:', studentHwData.map(hw => ({ 
          id: hw._id, 
          title: hw.title, 
          course: hw.course,
          courseId: hw.course?._id
        })));
        
        // Apply course filter on frontend for student homework (since API doesn't support course filtering yet)
        if (searchCourse) {
          console.log('Filtering by course:', searchCourse, 'Type:', typeof searchCourse);
          studentHwData = studentHwData.filter(hw => {
            const courseId = hw.course?._id;
            const matches = courseId === searchCourse;
            console.log(`Homework "${hw.title}" course._id: ${courseId} (${typeof courseId}), searchCourse: ${searchCourse} (${typeof searchCourse}), matches: ${matches}`);
            return matches;
          });
        }
        
        console.log('Student homework data:', studentHwData.map(hw => ({ 
          id: hw._id, 
          title: hw.title, 
          role: hw.uploader_role,
          course: hw.course,
          courseId: hw.course?._id
        })));
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

  // Traditional homework is filtered on the server side, but add frontend filtering as backup
  const filteredHomework = searchCourse 
    ? homework.filter(hw => (hw.course_id?._id || hw.course_id) === searchCourse)
    : homework;

  // Student homework is filtered on the frontend (since API doesn't support course filtering yet)
  const filteredStudentHomework = studentHomework;

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
        <Box sx={{ p: 3 }}>
        
        {/* Add Button and Course Filter */}
        <Box mb={3} display="flex" alignItems="center" gap={2}>
          {/* Add Homework Icon Button - Moved to Left */}
          {tabValue === 0 && (
            <IconButton
              onClick={() => setCreateDialogOpen(true)}
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.6)',
              color: '#555',
              borderRadius: '8px',
              padding: '20px',
              minWidth: '64px',
              width: '64px',
              height: '64px',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                color: '#333'
              }
            }}
            >
              <AddIcon size={48} weight="thin" />
            </IconButton>
          )}
          
          <FormControl sx={{ maxWidth: 400, flex: 1 }}>
            <InputLabel>Filter by Course</InputLabel>
            <Select
              value={searchCourse}
              onChange={(e) => setSearchCourse(e.target.value)}
              label="Filter by Course"
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.6)',
                borderRadius: '8px',
                minWidth: '300px'
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
        <Box 
          sx={{ 
            mb: 3, 
            borderBottom: '1px solid #e0e0e0',
            backgroundColor: 'transparent'
          }}
        >
          <Tabs 
            value={tabValue} 
            onChange={(e, newValue) => setTabValue(newValue)}
            TabIndicatorProps={{
              sx: {
                backgroundColor: '#D6F7AD',
                height: 2
              }
            }}
            sx={{
              minHeight: 'auto',
              '& .MuiTab-root': {
                color: '#2d3748',
                fontWeight: 500,
                textTransform: 'none',
                fontSize: '1rem',
                minHeight: '48px',
                padding: '12px 16px',
                '&.Mui-selected': {
                  color: '#1a202c',
                  fontWeight: 600
                }
              }
            }}
          >
            <Tab 
              icon={<AssignmentIcon size={20} weight="thin" />} 
              iconPosition="start" 
              label="My Homework" 
            />
            <Tab 
              icon={<PeopleIcon size={20} weight="thin" />} 
              iconPosition="start" 
              label={`Student Homework (${studentHomework.length})`} 
            />
          </Tabs>
        </Box>

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
          <div className="homework-grid">
            {filteredHomework.map((hw) => {
                const isOverdue = new Date(hw.due_date) < new Date();
                
                return (
                  <div className="homework-item" key={hw._id || `hw-${Math.random()}`}>
                    <div className="homework-card lecturer-homework">
                      {/* Notebook Edge - Simple line for lecturer */}
                      <div className="notebook-edge lecturer-edge">
                        <div className="lecturer-indicator"></div>
                      </div>

                      {/* Homework Content */}
                      <div className="homework-content">
                        {/* Action Buttons - Top Right Corner */}
                        <div className="homework-actions-top">
                          <IconButton 
                            className="action-button edit"
                            onClick={() => handleEditHomework(hw)}
                            sx={{
                              backgroundColor: 'transparent !important',
                              color: '#555',
                              border: 'none !important',
                              padding: '6px',
                              margin: '0 2px',
                              minWidth: '32px',
                              width: '32px',
                              height: '32px',
                              '&:hover': {
                                backgroundColor: 'rgba(0, 0, 0, 0.1) !important',
                                transform: 'scale(1.05)'
                              }
                            }}
                          >
                            <EditIcon size={16} weight="thin" />
                          </IconButton>
                          <IconButton 
                            className="action-button delete"
                            onClick={() => openDeleteDialog(hw)}
                            sx={{
                              backgroundColor: 'transparent !important',
                              color: '#e53e3e',
                              border: 'none !important',
                              padding: '6px',
                              margin: '0 2px',
                              minWidth: '32px',
                              width: '32px',
                              height: '32px',
                              '&:hover': {
                                backgroundColor: 'rgba(229, 62, 62, 0.1) !important',
                                transform: 'scale(1.05)'
                              }
                            }}
                          >
                            <DeleteIcon size={16} weight="thin" />
                          </IconButton>
                        </div>

                        <div className="homework-title">{hw.title}</div>
                        <div className="homework-course">
                          <SchoolIcon size={16} weight="thin" style={{ marginRight: '8px', color: '#D6F7AD' }} />
                          {hw.course_id?.course_name || 'Unknown Course'} ({hw.course_id?.course_code || 'N/A'})
                        </div>
                        <div className="homework-description">{hw.description || 'No description provided'}</div>
                        
                        {/* Partner Settings */}
                        {hw.allow_partners && (
                          <div className="partner-indicator">
                            <Chip
                              label="Allows Partners"
                              sx={{
                                backgroundColor: 'rgba(214, 247, 173, 0.3)',
                                color: '#333',
                                border: '1px solid #D6F7AD',
                                fontSize: '0.75rem'
                              }}
                              size="small"
                            />
                          </div>
                        )}

                        {/* Grade and Deadline - Left aligned */}
                        <div className="homework-meta">
                          {/* Grade Section */}
                          {hw.grade && (
                            <div className="grade-section">
                              <span className="grade-display">
                                {hw.grade}/100
                              </span>
                            </div>
                          )}

                          {/* Deadline Box - Always show */}
                          <div className="deadline-box">
                            <span className="deadline-text">
                              {new Date(hw.due_date).toLocaleDateString()}
                              {isOverdue && ' (Overdue)'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })
            }
          </div>
        )}

        {/* Student Homework Tab */}
        {tabValue === 1 && (
          <div className="homework-grid">
            {filteredStudentHomework.map((hw) => (
                <div className="homework-item" key={hw._id || `student-hw-${Math.random()}`}>
                  <div className="homework-card student-homework">
                    {/* Notebook Edge - Simple line for student homework */}
                    <div className="notebook-edge student-edge">
                      <div className="student-indicator"></div>
                    </div>

                    {/* Homework Content */}
                    <div className="homework-content">
                      {/* Action Buttons - Top Right Corner */}
                      <div className="homework-actions-top">
                        <IconButton 
                          className="action-button edit"
                          onClick={() => handleEditStudentHomework(hw)}
                          disabled={submitting}
                          sx={{
                            backgroundColor: 'transparent !important',
                            color: '#555',
                            border: 'none !important',
                            padding: '6px',
                            margin: '0 2px',
                            minWidth: '32px',
                            width: '32px',
                            height: '32px',
                            '&:hover': {
                              backgroundColor: 'rgba(0, 0, 0, 0.1) !important',
                              transform: 'scale(1.05)'
                            }
                          }}
                        >
                          <EditIcon size={16} weight="thin" />
                        </IconButton>
                        <IconButton 
                          className="action-button delete"
                          onClick={() => handleDeleteStudentHomework(hw)}
                          disabled={submitting}
                          sx={{
                            backgroundColor: 'transparent !important',
                            color: '#e53e3e',
                            border: 'none !important',
                            padding: '6px',
                            margin: '0 2px',
                            minWidth: '32px',
                            width: '32px',
                            height: '32px',
                            '&:hover': {
                              backgroundColor: 'rgba(229, 62, 62, 0.1) !important',
                              transform: 'scale(1.05)'
                            }
                          }}
                        >
                          <DeleteIcon size={16} weight="thin" />
                        </IconButton>
                      </div>

                      <div className="homework-title">{hw.title}</div>
                      
                      {/* Student Info */}
                      <div className="homework-course">
                        <PeopleIcon size={16} weight="thin" style={{ marginRight: '8px', color: '#FCE38A' }} />
                        {hw.uploaded_by?.full_name || hw.uploaded_by?.name || 'Unknown Student'}
                      </div>

                      {/* Course Info */}
                      <div className="homework-course">
                        <SchoolIcon size={16} weight="thin" style={{ marginRight: '8px', color: '#D6F7AD' }} />
                        {hw.course?.name || 'Unknown Course'} ({hw.course?.code || 'N/A'})
                      </div>

                      <div className="homework-description">{hw.description || 'No description provided'}</div>
                      
                      {/* Partner Settings */}
                      <div className="partner-indicator">
                        <Chip
                          label={hw.allow_partners ? "Allows Partners" : "No Partners"}
                          sx={{
                            backgroundColor: hw.allow_partners ? 'rgba(214, 247, 173, 0.3)' : 'rgba(255, 182, 193, 0.3)',
                            color: '#333',
                            border: hw.allow_partners ? '1px solid #D6F7AD' : '1px solid #FFB6C1',
                            fontSize: '0.75rem'
                          }}
                          size="small"
                        />
                      </div>

                      {/* Grade and Deadline - Left aligned */}
                      <div className="homework-meta">
                        {/* Grade Section */}
                        {(hw.actual_grade || hw.claimed_grade) && (
                          <div className="grade-section">
                            <span className="grade-display">
                              {hw.actual_grade || hw.claimed_grade}/100
                            </span>
                          </div>
                        )}

                        {/* Deadline Box - Always show */}
                        <div className="deadline-box">
                          <span className="deadline-text">
                            {new Date(hw.claimed_deadline).toLocaleDateString()}
                          </span>
                          {/* Only show verification indicator for student-created homework */}
                          <div 
                            className={`verification-indicator ${hw.deadline_verification_status === 'verified' ? 'verified' : 'unverified'}`}
                            title={hw.deadline_verification_status === 'verified' ? 'Verified Deadline' : 'Unverified Deadline - Needs Verification'}
                          >
                            {hw.deadline_verification_status === 'verified' ? 'Verified' : 'Not Verified'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              ))
            }
          </div>
        )}

        {/* Create Homework Dialog */}
        <Dialog 
          open={createDialogOpen} 
          onClose={() => setCreateDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ color: '#2d3748' }}>
            <Box display="flex" alignItems="center" gap={1}>
              <AddIcon size={20} weight="thin" />
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
                      sx={{ minWidth: '300px' }}
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
            <Button onClick={() => setCreateDialogOpen(false)} sx={{ color: '#4a5568' }}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleCreateHomework}
              disabled={submitting}
              sx={{
                backgroundColor: '#D6F7AD',
                color: '#2d3748',
                '&:hover': { backgroundColor: '#c8f299' }
              }}
              startIcon={submitting ? <CircularProgress size={20} /> : <AddIcon size={20} weight="thin" />}
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
          <DialogTitle sx={{ color: '#2d3748' }}>
            <Box display="flex" alignItems="center" gap={1}>
              <EditIcon size={20} weight="thin" />
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
                      sx={{ minWidth: '300px' }}
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
            }} sx={{ color: '#4a5568' }}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleUpdateHomework}
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={20} /> : <EditIcon size={20} weight="thin" />}
              sx={{
                backgroundColor: '#D6F7AD',
                color: '#333',
                '&:hover': { backgroundColor: '#c8f299' }
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
          <DialogTitle sx={{ color: '#2d3748' }}>
            <Box display="flex" alignItems="center" gap={1} color="error.main">
              <WarningIcon size={20} weight="thin" />
              Delete Homework?
            </Box>
          </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to delete "{selectedHomework?.title}"? This action cannot be undone and will also delete all related partnerships.
          </Typography>
        </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)} sx={{ color: '#4a5568' }}>Cancel</Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleDeleteHomework}
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={20} /> : <DeleteIcon size={20} weight="thin" />}
            >
              {submitting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
      </div>
    </DashboardLayout>
  );
};

export default HomeworkManagement;

