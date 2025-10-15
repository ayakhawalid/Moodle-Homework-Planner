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
  PlayArrow as PlayArrowIcon
} from '@mui/icons-material';
import { useAuth0 } from '@auth0/auth0-react';
import { apiService } from '../../services/api';

const HomeworkManagement = () => {
  const { isAuthenticated } = useAuth0();
  const [homework, setHomework] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchCourse, setSearchCourse] = useState('');
  
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

  const getCompletionStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'warning';
      case 'not_started': return 'default';
      case 'graded': return 'info';
      default: return 'default';
    }
  };

  // Filter homework by course
  const filteredHomework = searchCourse
    ? homework.filter(hw => (hw.course?._id || hw.course_id) === searchCourse)
    : homework;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <DashboardLayout userRole="student">
      <Box sx={{ p: 3 }}>
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

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {filteredHomework.map((hw) => (
          <Paper 
            key={hw._id}
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 2,
              backgroundColor: 'rgba(255, 255, 255, 0.6)',
              backdropFilter: 'blur(10px)',
              border: '1px solid',
              borderColor: 'rgba(0, 0, 0, 0.12)',
              transition: 'all 0.3s ease',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                transform: 'translateY(-2px)'
              }
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
              {/* Left Section: Title and Course Info */}
              <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 600,
                    color: '#333',
                    mb: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {hw.title}
                </Typography>
                <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                  <Box display="flex" alignItems="center">
                    <SchoolIcon sx={{ fontSize: 18, color: '#666', mr: 0.5 }} />
                    <Typography variant="body2" color="text.secondary">
                      {hw.course.name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">•</Typography>
                  <Box display="flex" alignItems="center">
                    <ScheduleIcon sx={{ fontSize: 18, color: '#666', mr: 0.5 }} />
                    <Typography variant="body2" color="text.secondary">
                      {new Date(hw.claimed_deadline).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Middle Section: Status Badges */}
              <Box display="flex" gap={1} flexWrap="wrap" alignItems="center" sx={{ flex: '0 1 auto' }}>
                <Chip
                  label={hw.completion_status.replace('_', ' ').toUpperCase()}
                  sx={{
                    backgroundColor: hw.completion_status === 'graded' ? '#95E1D3' :
                                    hw.completion_status === 'completed' ? '#95E1D3' : 
                                    hw.completion_status === 'in_progress' ? '#FCE38A' : 
                                    '#F38181',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.75rem'
                  }}
                  size="medium"
                />
                {hw.claimed_grade && (
                  <Chip
                    label={`${hw.claimed_grade}%`}
                    sx={{
                      backgroundColor: '#D6F7AD',
                      color: '#333',
                      fontWeight: 700,
                      fontSize: '0.875rem'
                    }}
                    size="medium"
                  />
                )}
                {hw.is_late && (
                  <Chip
                    label="LATE"
                    sx={{
                      backgroundColor: 'rgba(243, 129, 129, 0.3)',
                      color: '#333',
                      border: '1px solid #F38181',
                      fontWeight: 600
                    }}
                    size="small"
                  />
                )}
                {hw.deadline_verification_status === 'unverified' && (
                  <Chip
                    label="DEADLINE NOT VERIFIED"
                    sx={{
                      backgroundColor: 'rgba(255, 193, 7, 0.3)',
                      color: '#333',
                      border: '1px solid #FFC107',
                      fontWeight: 600,
                      fontSize: '0.75rem'
                    }}
                    size="small"
                  />
                )}
                {hw.partner_info?.has_partner && hw.partner_info?.partnership_status === 'accepted' && (
                  <Chip
                    label={`PARTNER: ${hw.partner_info.partner_name}`}
                    sx={{
                      backgroundColor: 'rgba(149, 225, 211, 0.3)',
                      color: '#333',
                      border: '1px solid #95E1D3',
                      fontWeight: 600,
                      fontSize: '0.75rem'
                    }}
                    size="small"
                  />
                )}
              </Box>

              {/* Right Section: Action Buttons */}
              <Box display="flex" gap={1} flexWrap="wrap" sx={{ flex: '0 1 auto' }}>
                {/* Not Started: Only show Start Working button */}
                {hw.completion_status === 'not_started' && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<PlayArrowIcon />}
                    onClick={() => handleStartWorking(hw)}
                    disabled={submitting}
                    sx={{
                      borderColor: '#FCE38A',
                      color: '#333',
                      '&:hover': { borderColor: '#f5d563', backgroundColor: 'rgba(252, 227, 138, 0.1)' }
                    }}
                  >
                    Start Working
                  </Button>
                )}
                
                {/* In Progress: Show Submit button */}
                {hw.completion_status === 'in_progress' && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<CheckCircleIcon />}
                    onClick={() => {
                      setSelectedHomework(hw);
                      setCompleteDialogOpen(true);
                    }}
                    sx={{
                      borderColor: '#95E1D3',
                      color: '#333',
                      '&:hover': { borderColor: '#7dd3c0', backgroundColor: 'rgba(149, 225, 211, 0.1)' }
                    }}
                  >
                    Mark as Submitted
                  </Button>
                )}
                
                {/* Completed: Show Add Grade button */}
                {hw.completion_status === 'completed' && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<CheckCircleIcon />}
                    onClick={() => {
                      setSelectedHomework(hw);
                      setCompleteDialogOpen(true);
                    }}
                    sx={{
                      borderColor: '#A8E6CF',
                      color: '#333',
                      '&:hover': { borderColor: '#8fd9b6', backgroundColor: 'rgba(168, 230, 207, 0.1)' }
                    }}
                  >
                    Add Grade
                  </Button>
                )}
                
                {/* Graded: Show Edit Grade button */}
                {hw.completion_status === 'graded' && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={() => {
                      setSelectedHomework(hw);
                      setClaimedGrade(hw.claimed_grade || '');
                      setCompleteDialogOpen(true);
                    }}
                    sx={{
                      borderColor: '#95E1D3',
                      color: '#333',
                      '&:hover': { borderColor: '#7dd3c0', backgroundColor: 'rgba(149, 225, 211, 0.1)' }
                    }}
                  >
                    Edit Grade
                  </Button>
                )}
                
                {/* Show edit/delete buttons for student-created homework */}
                {hw.uploader_role === 'student' && (
                  <>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<EditIcon />}
                      onClick={() => handleEditHomework(hw)}
                      disabled={submitting}
                      sx={{
                        borderColor: '#95E1D3',
                        color: '#333',
                        '&:hover': { borderColor: '#7dd3c0', backgroundColor: 'rgba(149, 225, 211, 0.1)' }
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDeleteHomework(hw)}
                      disabled={submitting}
                      sx={{
                        '&:hover': { backgroundColor: 'rgba(243, 129, 129, 0.1)' }
                      }}
                    >
                      Delete
                    </Button>
                  </>
                )}
              </Box>
            </Box>
          </Paper>
        ))}
      </Box>

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
    </DashboardLayout>
  );
};

export default HomeworkManagement;
