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
  Paper,
  Divider,
  Switch,
  FormControlLabel
} from '@mui/material';
import DashboardLayout from '../../Components/DashboardLayout';
import {
  Plus as AddIcon,
  CheckCircle as CheckCircleIcon,
  PencilSimple as EditIcon,
  Clock as ScheduleIcon,
  GraduationCap as SchoolIcon,
  Trash as DeleteIcon,
  Play as PlayArrowIcon,
  PencilSimple as EditPenIcon
} from 'phosphor-react';
import { useAuth0 } from '@auth0/auth0-react';
import { apiService } from '../../services/api';
import '../../styles/HomeworkCard.css';

const HomeworkManagement = () => {
  const { isAuthenticated } = useAuth0();
  const [homework, setHomework] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchCourse, setSearchCourse] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState(null);
  const [editingHomework, setEditingHomework] = useState(null);
  
  // Form states
  const [newHomework, setNewHomework] = useState({
    title: '',
    description: '',
    course_id: '',
    claimed_deadline: '',
    allow_partners: false,
    max_partners: 1
  });
  
  const [claimedGrade, setClaimedGrade] = useState('');
  const [isLate, setIsLate] = useState(false);
  
  // Status edit dialog for traditional homework
  const [statusEditDialogOpen, setStatusEditDialogOpen] = useState(false);
  const [statusEditingHomework, setStatusEditingHomework] = useState(null);
  const [newStatus, setNewStatus] = useState('not_started');

  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [homeworkToDelete, setHomeworkToDelete] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchHomework();
    }
  }, [isAuthenticated]);

  const fetchHomework = async () => {
    try {
      setLoading(true);
      const response = await apiService.studentHomework.getHomework();
      console.log('Student homework response:', response);
      console.log('Homework data:', response.data.homework);
      console.log('Homework count:', response.data.homework.length);
      
      // Debug: Check homework by uploader
      const ownHomework = response.data.homework.filter(hw => hw.uploaded_by._id === response.data.user?._id);
      const lecturerHomework = response.data.homework.filter(hw => hw.uploader_role === 'lecturer');
      const otherStudentHomework = response.data.homework.filter(hw => 
        hw.uploader_role === 'student' && hw.uploaded_by._id !== response.data.user?._id
      );
      
      console.log('Homework breakdown:', {
        own_homework: ownHomework.length,
        lecturer_homework: lecturerHomework.length,
        other_student_homework: otherStudentHomework.length
      });
      
      // Debug: Check course data for each homework item
      console.log('Frontend homework course data:', response.data.homework.map(hw => ({
        id: hw._id,
        title: hw.title,
        uploader_role: hw.uploader_role,
        course: hw.course,
        course_name: hw.course?.name,
        course_code: hw.course?.code
      })));
      
      setHomework(response.data.homework);
      setCourses(response.data.courses);
    } catch (err) {
      console.error('Error fetching homework:', err);
      setError('Failed to fetch homework');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHomework = async () => {
    try {
      setSubmitting(true);
      setError(null);
      
      await apiService.studentHomework.createHomework(newHomework);
      setSuccess('Homework created successfully!');
      setCreateDialogOpen(false);
      setNewHomework({
        title: '',
        description: '',
        course_id: '',
        claimed_deadline: '',
        moodle_url: '',
        allow_partners: false,
        max_partners: 1
      });
      fetchHomework();
    } catch (err) {
      console.error('Error creating homework:', err);
      setError(err.response?.data?.error || 'Failed to create homework');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditHomework = (hw) => {
    setEditingHomework(hw);
    setNewHomework({
      title: hw.title,
      description: hw.description || '',
      course_id: hw.course?._id || hw.course_id,
      claimed_deadline: hw.claimed_deadline ? new Date(hw.claimed_deadline).toISOString().slice(0, 16) : '',
      allow_partners: hw.allow_partners || false,
      max_partners: hw.max_partners || 1,
      completion_status: hw.completion_status || 'not_started'
    });
    setEditDialogOpen(true);
  };

  // Handle status edit for traditional homework
  const handleEditStatus = (hw) => {
    setStatusEditingHomework(hw);
    setNewStatus(hw.completion_status || 'not_started');
    setStatusEditDialogOpen(true);
  };

  const handleUpdateStatus = async () => {
    try {
      setSubmitting(true);
      setError(null);
      
      await apiService.studentHomework.updateHomework(statusEditingHomework._id, {
        completion_status: newStatus
      });
      
      setSuccess('Status updated successfully!');
      setStatusEditDialogOpen(false);
      setStatusEditingHomework(null);
      fetchHomework();
    } catch (err) {
      console.error('Error updating status:', err);
      setError(err.response?.data?.error || 'Failed to update status');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateHomework = async () => {
    try {
      setSubmitting(true);
      setError(null);
      
      // Debug logging
      console.log('=== HOMEWORK UPDATE DEBUG ===');
      console.log('Editing homework:', editingHomework);
      console.log('Homework uploader role:', editingHomework.uploader_role);
      console.log('New homework data:', newHomework);
      console.log('=== END HOMEWORK UPDATE DEBUG ===');
      
      // Only allow editing of student-created homework
      if (editingHomework.uploader_role === 'student') {
        console.log('Using studentHomework.updateHomework endpoint');
        await apiService.studentHomework.updateHomework(editingHomework._id, newHomework);
      } else {
        throw new Error('Cannot edit lecturer-created homework');
      }
      
      setSuccess('Homework updated successfully!');
      setEditDialogOpen(false);
      setEditingHomework(null);
      setNewHomework({
        title: '',
        description: '',
        course_id: '',
        claimed_deadline: '',
        moodle_url: '',
        allow_partners: false,
        max_partners: 1
      });
      fetchHomework();
    } catch (err) {
      console.error('Error updating homework:', err);
      setError(err.response?.data?.error || 'Failed to update homework');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartWorking = async (hw) => {
    try {
      setSubmitting(true);
      setError(null);
      
      await apiService.studentHomework.startHomework(hw._id);
      setSuccess('Homework marked as in progress!');
      fetchHomework();
    } catch (err) {
      console.error('Error starting homework:', err);
      setError(err.response?.data?.error || 'Failed to start homework');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteHomework = async () => {
    try {
      setSubmitting(true);
      setError(null);
      
      // If homework is in_progress, mark as completed without grade
      // If homework is completed or graded, add/update grade and mark as graded
      const gradeToSend = selectedHomework.completion_status === 'in_progress' ? null : claimedGrade;
      const successMessage = selectedHomework.completion_status === 'in_progress' 
        ? 'Homework marked as submitted!' 
        : selectedHomework.completion_status === 'graded'
        ? 'Grade updated successfully!'
        : 'Grade added successfully!';
      
      await apiService.studentHomework.completeHomework(selectedHomework._id, gradeToSend, isLate);
      setSuccess(successMessage);
      setCompleteDialogOpen(false);
      setClaimedGrade('');
      setIsLate(false);
      setSelectedHomework(null);
      fetchHomework();
    } catch (err) {
      console.error('Error completing homework:', err);
      setError(err.response?.data?.error || 'Failed to complete homework');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteHomework = async () => {
    if (!homeworkToDelete) return;
    
    try {
      setSubmitting(true);
      setError(null);
      
      await apiService.studentHomework.deleteHomework(homeworkToDelete._id);
      setSuccess('Homework and all related partnerships deleted successfully!');
      setDeleteDialogOpen(false);
      setHomeworkToDelete(null);
      fetchHomework();
    } catch (err) {
      console.error('Error deleting homework:', err);
      setError(err.response?.data?.error || 'Failed to delete homework');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'verified': return 'success';
      case 'rejected': return 'error';
      case 'unverified': return 'warning';
      default: return 'default';
    }
  };

  const formatStatus = (status) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getNextStatus = (currentStatus) => {
    switch (currentStatus) {
      case 'not_started': return 'in_progress';
      case 'in_progress': return 'completed';
      case 'completed': return 'graded';
      default: return null;
    }
  };


  const handleStatusProgression = async (hw) => {
    if (hw.completion_status !== 'completed') return;

    try {
      setSubmitting(true);
      setError(null);
      
      setSelectedHomework(hw);
      setClaimedGrade(hw.claimed_grade || '');
      setCompleteDialogOpen(true);
    } catch (err) {
      console.error('Error opening grade dialog:', err);
      setError(err.response?.data?.error || 'Failed to open grade dialog');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteHomeworkFromCircle = async (hw) => {
    try {
      setSubmitting(true);
      setError(null);
      
      // Mark as completed without grade first
      await apiService.studentHomework.completeHomework(hw._id, null, false);
      setSuccess('Homework marked as submitted!');
      fetchHomework();
    } catch (err) {
      console.error('Error completing homework:', err);
      setError(err.response?.data?.error || 'Failed to complete homework');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter homework by course and status
  const filteredHomework = homework.filter(hw => {
    const courseMatch = !searchCourse || (hw.course?._id || hw.course_id) === searchCourse;
    
    // Handle status filtering based on grade table logic
    let statusMatch = true;
    if (selectedStatus === 'not_started') {
      // Not started homework doesn't appear in grade table
      statusMatch = hw.completion_status === 'not_started';
    } else if (selectedStatus) {
      // For other statuses, check if they exist in the grade table
      statusMatch = hw.completion_status === selectedStatus;
    }
    
    return courseMatch && statusMatch;
  });

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <DashboardLayout userRole="student">
      <div className="page-background">
        <Box sx={{ 
          p: 3,
          minHeight: '100vh'
        }}>
      {/* Course Filter, Status Filter, and Add Button */}
      <Box mb={3} display="flex" alignItems="center" gap={3} flexWrap="wrap">
        <FormControl sx={{ maxWidth: 400, minWidth: 200 }}>
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

        {/* Status Filter Circles */}
        <Box display="flex" gap={2} alignItems="center">
          <Box
            width={36}
            height={36}
            borderRadius="50%"
            backgroundColor={selectedStatus === '' ? '#2d3748' : '#4a5568'}
            sx={{ 
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: selectedStatus === '' ? '0 0 0 4px rgba(45, 55, 72, 0.4)' : 'none',
              '&:hover': {
                transform: 'scale(1.1)',
                boxShadow: '0 0 0 3px rgba(74, 85, 104, 0.3)'
              }
            }}
            onClick={() => setSelectedStatus('')}
          />
          
          <Box
            width={36}
            height={36}
            borderRadius="50%"
            backgroundColor={selectedStatus === 'not_started' ? '#E53E3E' : '#F38181'}
            sx={{ 
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: selectedStatus === 'not_started' ? '0 0 0 4px rgba(229, 62, 62, 0.4)' : 'none',
              '&:hover': {
                transform: 'scale(1.1)',
                boxShadow: '0 0 0 3px rgba(243, 129, 129, 0.3)'
              }
            }}
            onClick={() => setSelectedStatus('not_started')}
          />
          
          <Box
            width={36}
            height={36}
            borderRadius="50%"
            backgroundColor={selectedStatus === 'in_progress' ? '#D69E2E' : '#FCE38A'}
            sx={{ 
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: selectedStatus === 'in_progress' ? '0 0 0 4px rgba(214, 158, 46, 0.4)' : 'none',
              '&:hover': {
                transform: 'scale(1.1)',
                boxShadow: '0 0 0 3px rgba(252, 227, 138, 0.3)'
              }
            }}
            onClick={() => setSelectedStatus('in_progress')}
          />
          
          <Box
            width={36}
            height={36}
            borderRadius="50%"
            backgroundColor={selectedStatus === 'completed' ? '#38A169' : '#D6F7AD'}
            sx={{ 
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: selectedStatus === 'completed' ? '0 0 0 4px rgba(56, 161, 105, 0.4)' : 'none',
              '&:hover': {
                transform: 'scale(1.1)',
                boxShadow: '0 0 0 3px rgba(214, 247, 173, 0.3)'
              }
            }}
            onClick={() => setSelectedStatus('completed')}
          />
          
          <Box
            width={36}
            height={36}
            borderRadius="50%"
            backgroundColor={selectedStatus === 'graded' ? '#319795' : '#95E1D3'}
            sx={{ 
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: selectedStatus === 'graded' ? '0 0 0 4px rgba(49, 151, 149, 0.4)' : 'none',
              '&:hover': {
                transform: 'scale(1.1)',
                boxShadow: '0 0 0 3px rgba(149, 225, 211, 0.3)'
              }
            }}
            onClick={() => setSelectedStatus('graded')}
          />
        </Box>

        {/* Add Homework Icon Button */}
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
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <div className="homework-grid">
        {filteredHomework.map((hw) => (
          <div key={hw._id} className="homework-item">
            <div className={`homework-card ${hw.completion_status.replace('_', '-')}`}>
              {/* Notebook Edge with Status Circles */}
              <div className="notebook-edge">
                <div 
                  className={`status-circle not-started ${hw.completion_status === 'not_started' ? 'clickable' : ''}`}
                  onClick={() => hw.completion_status === 'not_started' && handleStartWorking(hw)}
                  title="Not Started - Click to start"
                />
                <div 
                  className={`status-circle in-progress ${hw.completion_status === 'in_progress' ? 'clickable' : ''}`}
                  onClick={() => hw.completion_status === 'in_progress' && handleCompleteHomeworkFromCircle(hw)}
                  title="In Progress - Click to complete"
                />
                <div 
                  className={`status-circle completed ${hw.completion_status === 'completed' ? 'clickable' : ''}`}
                  onClick={() => hw.completion_status === 'completed' && handleStatusProgression(hw)}
                  title="Completed - Click to add grade"
                />
                <div 
                  className={`status-circle graded ${hw.completion_status === 'graded' ? 'clickable' : ''}`}
                  onClick={() => hw.completion_status === 'graded' && handleStatusProgression(hw)}
                  title="Graded - Click to edit grade"
                />
              </div>

              {/* Homework Content */}
              <div className="homework-content">
                {/* Action Buttons - Top Right Corner */}
                <div className="homework-actions-top">
                  {/* Show edit/delete buttons for student-created homework */}
                  {hw.uploader_role === 'student' && (
                    <>
                      <IconButton 
                        className="action-button edit"
                        onClick={() => handleEditHomework(hw)}
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
                        onClick={() => {
                          setHomeworkToDelete(hw);
                          setDeleteDialogOpen(true);
                        }}
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
                    </>
                  )}
                  
                  {/* Show status edit button for traditional homework */}
                  {hw.uploader_role !== 'student' && (
                    <IconButton 
                      className="action-button edit"
                      onClick={() => handleEditStatus(hw)}
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
                  )}
                </div>

                <div className="homework-title">
                  {hw.title}
                </div>
                <div className="homework-course">{hw.course.name}</div>
                <div className="homework-description">{hw.description || 'No description provided'}</div>
                
                {/* Grade and Deadline - Left aligned */}
                <div className="homework-meta">
                  {/* Grade Section */}
                  {(hw.actual_grade || hw.claimed_grade) && (
                    <div className="grade-section">
                      <span className="grade-display">
                        {hw.actual_grade || hw.claimed_grade}/100
                      </span>
                      <EditPenIcon 
                        className="grade-edit-icon"
                        size={16}
                        weight="thin"
                        onClick={() => {
                          setSelectedHomework(hw);
                          setClaimedGrade(hw.claimed_grade || '');
                          setCompleteDialogOpen(true);
                        }}
                        title="Edit Grade"
                      />
                    </div>
                  )}

                  {/* Deadline Box - Always show */}
                  <div className="deadline-box">
                    <span className="deadline-text">
                      {new Date(hw.claimed_deadline).toLocaleDateString()}
                    </span>
                    {/* Only show verification indicator for student-created homework */}
                    {hw.uploader_role === 'student' && (
                      <div 
                        className={`verification-indicator ${hw.deadline_verification_status === 'verified' ? 'verified' : 'unverified'}`}
                        title={hw.deadline_verification_status === 'verified' ? 'Verified Deadline' : 'Unverified Deadline - Needs Verification'}
                      >
                        {hw.deadline_verification_status === 'verified' ? 'Verified' : 'Not Verified'}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

          </div>
        ))}
      </div>


      {/* Create Homework Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ color: '#2d3748' }}>Add New Homework</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title"
                value={newHomework.title}
                onChange={(e) => setNewHomework({ ...newHomework, title: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={newHomework.description}
                onChange={(e) => setNewHomework({ ...newHomework, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Course</InputLabel>
                <Select
                  value={newHomework.course_id}
                  onChange={(e) => setNewHomework({ ...newHomework, course_id: e.target.value })}
                  sx={{ minWidth: '300px' }}
                >
                  {courses.map((course) => (
                    <MenuItem key={course._id} value={course._id}>
                      {course.course_name} ({course.course_code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Deadline"
                type="datetime-local"
                value={newHomework.claimed_deadline}
                onChange={(e) => setNewHomework({ ...newHomework, claimed_deadline: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            
            
            
            <Grid item xs={12}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Allow Study Partners
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Enable students to form partnerships for this homework
                  </Typography>
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={newHomework.allow_partners}
                      onChange={(e) => setNewHomework({ ...newHomework, allow_partners: e.target.checked })}
                      color="primary"
                    />
                  }
                  label=""
                />
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)} sx={{ color: '#4a5568' }}>Cancel</Button>
          <Button
            onClick={handleCreateHomework}
            variant="contained"
            disabled={submitting || !newHomework.title || !newHomework.course_id || !newHomework.claimed_deadline}
            sx={{
              backgroundColor: '#D6F7AD',
              color: '#2d3748',
              '&:hover': { backgroundColor: '#c8f299' }
            }}
          >
            {submitting ? <CircularProgress size={24} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Homework Dialog */}
      <Dialog open={editDialogOpen} onClose={() => {
        setEditDialogOpen(false);
        setEditingHomework(null);
      }} maxWidth="md" fullWidth>
        <DialogTitle sx={{ color: '#2d3748' }}>Edit Homework</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title"
                value={newHomework.title}
                onChange={(e) => setNewHomework({ ...newHomework, title: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={newHomework.description}
                onChange={(e) => setNewHomework({ ...newHomework, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Course</InputLabel>
                <Select
                  value={newHomework.course_id}
                  onChange={(e) => setNewHomework({ ...newHomework, course_id: e.target.value })}
                  sx={{ minWidth: '300px' }}
                >
                  {courses.map((course) => (
                    <MenuItem key={course._id} value={course._id}>
                      {course.course_name} ({course.course_code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Deadline"
                type="datetime-local"
                value={newHomework.claimed_deadline}
                onChange={(e) => setNewHomework({ ...newHomework, claimed_deadline: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={newHomework.completion_status || 'not_started'}
                  onChange={(e) => setNewHomework({ ...newHomework, completion_status: e.target.value })}
                  label="Status"
                >
                  <MenuItem value="not_started">Not Started</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="graded">Graded</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Allow Study Partners
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Enable students to form partnerships for this homework
                  </Typography>
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={newHomework.allow_partners}
                      onChange={(e) => setNewHomework({ ...newHomework, allow_partners: e.target.checked })}
                      color="primary"
                    />
                  }
                  label=""
                />
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setEditDialogOpen(false);
              setEditingHomework(null);
            }}
            sx={{ color: '#4a5568' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdateHomework}
            variant="contained"
            disabled={submitting || !newHomework.title || !newHomework.course_id || !newHomework.claimed_deadline}
            sx={{
              backgroundColor: '#D6F7AD',
              color: '#333',
              '&:hover': { backgroundColor: '#c8f299' }
            }}
          >
            {submitting ? <CircularProgress size={24} /> : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Complete/Grade Homework Dialog */}
      <Dialog open={completeDialogOpen} onClose={() => setCompleteDialogOpen(false)}>
        <DialogTitle sx={{ color: '#2d3748' }}>
          {selectedHomework?.completion_status === 'in_progress' 
            ? 'Mark Homework as Submitted' 
            : selectedHomework?.completion_status === 'graded'
            ? 'Edit Grade'
            : 'Add Grade'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {selectedHomework?.completion_status === 'in_progress'
              ? `Mark "${selectedHomework?.title}" as submitted (you can add the grade later when you receive it)`
              : selectedHomework?.completion_status === 'graded'
              ? `Update the grade for "${selectedHomework?.title}"`
              : `Add the grade you received for "${selectedHomework?.title}"`}
          </Typography>
          
          {/* Show late submission checkbox when marking as submitted */}
          {selectedHomework?.completion_status === 'in_progress' && (
            <FormControlLabel
              control={
                <Switch
                  checked={isLate}
                  onChange={(e) => setIsLate(e.target.checked)}
                  color="warning"
                />
              }
              label="This submission is late"
              sx={{ mb: 2 }}
            />
          )}
          
          {/* Show grade field if adding or editing grade */}
          {(selectedHomework?.completion_status === 'completed' || selectedHomework?.completion_status === 'graded') && (
            <TextField
              fullWidth
              label="Your Grade"
              type="number"
              value={claimedGrade}
              onChange={(e) => setClaimedGrade(e.target.value)}
              placeholder="Enter your grade (e.g., 85)"
              inputProps={{ min: 0, max: 100 }}
              sx={{ mt: 2 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompleteDialogOpen(false)} sx={{ color: '#4a5568' }}>Cancel</Button>
          <Button
            onClick={handleCompleteHomework}
            variant="contained"
            disabled={submitting || ((selectedHomework?.completion_status === 'completed' || selectedHomework?.completion_status === 'graded') && !claimedGrade)}
            sx={{
              backgroundColor: '#D6F7AD',
              color: '#2d3748',
              '&:hover': { backgroundColor: '#c8f299' }
            }}
          >
            {submitting ? <CircularProgress size={24} /> : 
              selectedHomework?.completion_status === 'in_progress' ? 'Submit' : 
              selectedHomework?.completion_status === 'graded' ? 'Update Grade' : 'Add Grade'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Status Edit Dialog for Traditional Homework */}
      <Dialog open={statusEditDialogOpen} onClose={() => {
        setStatusEditDialogOpen(false);
        setStatusEditingHomework(null);
      }}>
        <DialogTitle sx={{ color: '#2d3748' }}>Edit Status</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Update the status for "{statusEditingHomework?.title}"
          </Typography>
          
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              label="Status"
            >
              <MenuItem value="not_started">Not Started</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="graded">Graded</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setStatusEditDialogOpen(false);
            setStatusEditingHomework(null);
          }} sx={{ color: '#4a5568' }}>
            Cancel
          </Button>
          <Button
            onClick={handleUpdateStatus}
            variant="contained"
            disabled={submitting}
            sx={{
              backgroundColor: '#D6F7AD',
              color: '#333',
              '&:hover': { backgroundColor: '#c8f299' }
            }}
          >
            {submitting ? <CircularProgress size={24} /> : 'Update Status'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => {
        setDeleteDialogOpen(false);
        setHomeworkToDelete(null);
      }}>
        <DialogTitle sx={{ color: '#2d3748' }}>Delete Homework</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to delete "{homeworkToDelete?.title}"? This action cannot be undone and will also delete all related partnerships.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDeleteDialogOpen(false);
            setHomeworkToDelete(null);
          }} sx={{ color: '#4a5568' }}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteHomework}
            variant="contained"
            disabled={submitting}
            sx={{
              backgroundColor: '#e53e3e',
              color: 'white',
              '&:hover': { backgroundColor: '#c53030' }
            }}
          >
            {submitting ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
      </div>
    </DashboardLayout>
  );
};

export default HomeworkManagement;
