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
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Edit as EditIcon,
  Schedule as ScheduleIcon,
  School as SchoolIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayArrowIcon,
  Edit as EditPenIcon
} from '@mui/icons-material';
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
      max_partners: hw.max_partners || 1
    });
    setEditDialogOpen(true);
  };

  const handleUpdateHomework = async () => {
    try {
      setSubmitting(true);
      setError(null);
      
      // Update student homework (need to add API method)
      await apiService.studentHomework.updateHomework(editingHomework._id, newHomework);
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

  const handleDeleteHomework = async (hw) => {
    try {
      setSubmitting(true);
      setError(null);
      
      await apiService.studentHomework.deleteHomework(hw._id);
      setSuccess('Homework and all related partnerships deleted successfully!');
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

  const getStatusAction = (currentStatus) => {
    switch (currentStatus) {
      case 'completed': return 'Add Grade';
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
      <div className="white-page-background">
        <Box sx={{ 
          p: 3,
          minHeight: '100vh'
        }}>
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
          Create, manage, and track your homework assignments
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

      {/* Status Filter Palette */}
      <Box mb={3}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: '500', color: '#2c3e50' }}>
          Filter by Status
        </Typography>
        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
          <Box
            width={36}
            height={36}
            borderRadius="50%"
            backgroundColor={selectedStatus === '' ? '#2d3748' : '#4a5568'}
            border="2px solid #1a202c"
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
            border="2px solid #C53030"
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
            border="2px solid #B7791F"
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
            border="2px solid #2F855A"
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
            border="2px solid #2C7A7B"
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
      </Box>
      
      <Box display="flex" justifyContent="flex-start" alignItems="center" mb={3}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
          sx={{
            backgroundColor: '#95E1D3',
            color: '#333',
            '&:hover': { backgroundColor: '#7dd3c0' }
          }}
        >
          Add Homework
        </Button>
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
                  onClick={() => hw.completion_status === 'not_started' && handleStatusProgression(hw)}
                  title="Not Started"
                />
                <div 
                  className={`status-circle in-progress ${hw.completion_status === 'in_progress' ? 'clickable' : ''}`}
                  onClick={() => hw.completion_status === 'in_progress' && handleStatusProgression(hw)}
                  title="In Progress"
                />
                <div 
                  className={`status-circle completed ${hw.completion_status === 'completed' ? 'clickable' : ''}`}
                  onClick={() => hw.completion_status === 'completed' && handleStatusProgression(hw)}
                  title="Completed"
                />
                <div 
                  className={`status-circle graded ${hw.completion_status === 'graded' ? 'clickable' : ''}`}
                  onClick={() => hw.completion_status === 'graded' && handleStatusProgression(hw)}
                  title="Graded"
                />
              </div>

              {/* Homework Content */}
              <div className="homework-content">
                <div className="homework-title">
                  {hw.title}
                </div>
                <div className="homework-course">{hw.course.name}</div>
                <div className="homework-description">{hw.description || 'No description provided'}</div>
                
                {/* Deadline Box - Only show verification for student-created homework */}
                <div className="deadline-box">
                  <ScheduleIcon sx={{ fontSize: 20, color: '#4a5568' }} />
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

                {/* Grade Section */}
                {(hw.actual_grade || hw.claimed_grade) && (
                  <div className="grade-section">
                    <span className="grade-display">
                      {hw.actual_grade || hw.claimed_grade}%
                    </span>
                    <EditPenIcon 
                      className="grade-edit-icon"
                    onClick={() => {
                      setSelectedHomework(hw);
                      setClaimedGrade(hw.claimed_grade || '');
                      setCompleteDialogOpen(true);
                    }}
                      title="Edit Grade"
                    />
                  </div>
                )}

                {/* Status Action Button */}
                {getStatusAction(hw.completion_status) && (
                  <button 
                    className="status-action-button"
                    onClick={() => handleStatusProgression(hw)}
                    disabled={submitting}
                  >
                    {getStatusAction(hw.completion_status)}
                  </button>
                )}
              </div>
            </div>

            {/* Action Buttons (Below the card like Instagram) */}
            <div className="homework-actions">
              <button 
                className="action-button edit"
                      onClick={() => handleEditHomework(hw)}
                      disabled={submitting}
                    >
                      Edit
              </button>
              <button 
                className="action-button delete"
                      onClick={() => handleDeleteHomework(hw)}
                      disabled={submitting}
                    >
                      Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredHomework.length === 0 && (
        <div className="dashboard-card" style={{ padding: '40px', textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No homework found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Click "Add Homework" to create your first homework entry
          </Typography>
        </div>
      )}

      {/* Create Homework Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add New Homework</DialogTitle>
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
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateHomework}
            variant="contained"
            disabled={submitting || !newHomework.title || !newHomework.course_id || !newHomework.claimed_deadline}
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
        <DialogTitle>Edit Homework</DialogTitle>
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
          <Button onClick={() => {
            setEditDialogOpen(false);
            setEditingHomework(null);
          }}>Cancel</Button>
          <Button
            onClick={handleUpdateHomework}
            variant="contained"
            disabled={submitting || !newHomework.title || !newHomework.course_id || !newHomework.claimed_deadline}
            sx={{
              backgroundColor: '#95E1D3',
              color: '#333',
              '&:hover': { backgroundColor: '#7dd3c0' }
            }}
          >
            {submitting ? <CircularProgress size={24} /> : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Complete/Grade Homework Dialog */}
      <Dialog open={completeDialogOpen} onClose={() => setCompleteDialogOpen(false)}>
        <DialogTitle>
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
          <Button onClick={() => setCompleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCompleteHomework}
            variant="contained"
            disabled={submitting || ((selectedHomework?.completion_status === 'completed' || selectedHomework?.completion_status === 'graded') && !claimedGrade)}
          >
            {submitting ? <CircularProgress size={24} /> : 
              selectedHomework?.completion_status === 'in_progress' ? 'Submit' : 
              selectedHomework?.completion_status === 'graded' ? 'Update Grade' : 'Add Grade'}
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
      </div>
    </DashboardLayout>
  );
};

export default HomeworkManagement;
