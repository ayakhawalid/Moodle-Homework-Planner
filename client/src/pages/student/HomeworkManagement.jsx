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
  Divider
} from '@mui/material';
import DashboardLayout from '../../Components/DashboardLayout';
import {
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Edit as EditIcon,
  Schedule as ScheduleIcon,
  School as SchoolIcon
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
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState(null);
  
  // Form states
  const [newHomework, setNewHomework] = useState({
    title: '',
    description: '',
    course_id: '',
    claimed_deadline: '',
    tags: '',
    moodle_url: ''
  });
  
  const [claimedGrade, setClaimedGrade] = useState('');

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
      
      const homeworkData = {
        ...newHomework,
        tags: newHomework.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      };
      
      await apiService.studentHomework.createHomework(homeworkData);
      setSuccess('Homework created successfully!');
      setCreateDialogOpen(false);
      setNewHomework({
        title: '',
        description: '',
        course_id: '',
        claimed_deadline: '',
        tags: '',
        moodle_url: ''
      });
      fetchHomework();
    } catch (err) {
      console.error('Error creating homework:', err);
      setError(err.response?.data?.error || 'Failed to create homework');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteHomework = async () => {
    try {
      setSubmitting(true);
      setError(null);
      
      await apiService.studentHomework.completeHomework(selectedHomework._id, claimedGrade);
      setSuccess('Homework marked as completed!');
      setCompleteDialogOpen(false);
      setClaimedGrade('');
      setSelectedHomework(null);
      fetchHomework();
    } catch (err) {
      console.error('Error completing homework:', err);
      setError(err.response?.data?.error || 'Failed to complete homework');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'verified': return 'success';
      case 'pending_review': return 'warning';
      case 'rejected': return 'error';
      case 'unverified': return 'default';
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

      <Grid container spacing={4}>
        {homework.map((hw) => (
          <Grid item xs={12} md={6} lg={4} key={hw._id} sx={{ mb: 3 }}>
            <div className="dashboard-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '20px', marginBottom: '16px' }}>
              <div className="card-content" style={{ flexGrow: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Typography variant="h6" component="h2" sx={{ flexGrow: 1 }}>
                    {hw.title}
                  </Typography>
                </Box>

                <Box display="flex" alignItems="center" mb={1}>
                  <SchoolIcon sx={{ mr: 1, fontSize: 16, color: '#95E1D3' }} />
                  <Typography variant="body2" color="text.secondary">
                    {hw.course.name} ({hw.course.code})
                  </Typography>
                </Box>

                <Box display="flex" alignItems="center" mb={2}>
                  <ScheduleIcon sx={{ mr: 1, fontSize: 16, color: '#D6F7AD' }} />
                  <Typography variant="body2" color="text.secondary">
                    Due: {new Date(hw.claimed_deadline).toLocaleDateString()}
                  </Typography>
                </Box>

                {hw.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {hw.description}
                  </Typography>
                )}

                <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                  <Chip
                    label={hw.completion_status.replace('_', ' ')}
                    sx={{
                      backgroundColor: hw.completion_status === 'completed' ? 'rgba(149, 225, 211, 0.3)' : 
                                      hw.completion_status === 'in_progress' ? 'rgba(252, 227, 138, 0.3)' : 
                                      'rgba(243, 129, 129, 0.3)',
                      color: '#333',
                      border: hw.completion_status === 'completed' ? '1px solid #95E1D3' : 
                              hw.completion_status === 'in_progress' ? '1px solid #FCE38A' : 
                              '1px solid #F38181'
                    }}
                    size="small"
                  />
                  {hw.uploader_role === 'lecturer' ? (
                    <Chip
                      label="Lecturer Assigned"
                      sx={{
                        backgroundColor: 'rgba(149, 225, 211, 0.3)',
                        color: '#333',
                        border: '1px solid #95E1D3'
                      }}
                      size="small"
                    />
                  ) : (
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
                  )}
                  {hw.claimed_grade && (
                    <Chip
                      label={`Grade: ${hw.claimed_grade}`}
                      sx={{
                        backgroundColor: 'rgba(214, 247, 173, 0.3)',
                        color: '#333',
                        border: '1px solid #D6F7AD'
                      }}
                      size="small"
                    />
                  )}
                </Box>

                {hw.tags && hw.tags.length > 0 && (
                  <Box display="flex" gap={0.5} mb={2} flexWrap="wrap">
                    {hw.tags.map((tag, index) => (
                      <Chip 
                        key={index} 
                        label={tag} 
                        size="small" 
                        variant="outlined"
                        sx={{
                          backgroundColor: 'rgba(149, 225, 211, 0.2)',
                          color: '#333',
                          border: '1px solid #95E1D3'
                        }}
                      />
                    ))}
                  </Box>
                )}

                <Divider sx={{ my: 2 }} />

                <Box display="flex" gap={1} flexWrap="wrap">
                  {hw.completion_status === 'not_started' && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<EditIcon />}
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
                      Mark Complete
                    </Button>
                  )}
                  
                </Box>
              </div>
            </div>
          </Grid>
        ))}
      </Grid>

      {homework.length === 0 && (
        <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No homework found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Click "Add Homework" to create your first homework entry
          </Typography>
        </Paper>
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
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Tags (comma-separated)"
                value={newHomework.tags}
                onChange={(e) => setNewHomework({ ...newHomework, tags: e.target.value })}
                placeholder="e.g., math, assignment, group"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Moodle URL"
                value={newHomework.moodle_url}
                onChange={(e) => setNewHomework({ ...newHomework, moodle_url: e.target.value })}
                placeholder="https://moodle.example.com/mod/assign/view.php?id=123"
              />
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

      {/* Complete Homework Dialog */}
      <Dialog open={completeDialogOpen} onClose={() => setCompleteDialogOpen(false)}>
        <DialogTitle>Mark Homework as Complete</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Mark "{selectedHomework?.title}" as completed
          </Typography>
          <TextField
            fullWidth
            label="Your Grade"
            type="number"
            value={claimedGrade}
            onChange={(e) => setClaimedGrade(e.target.value)}
            placeholder="Enter your grade (e.g., 85)"
            inputProps={{ min: 0, max: 100 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCompleteHomework}
            variant="contained"
            disabled={submitting || !claimedGrade}
          >
            {submitting ? <CircularProgress size={24} /> : 'Mark Complete'}
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </DashboardLayout>
  );
};

export default HomeworkManagement;
