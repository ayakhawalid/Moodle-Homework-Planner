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
  Delete as DeleteIcon
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
    moodle_url: '',
    allow_partners: false,
    max_partners: 1
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
      moodle_url: hw.moodle_url || '',
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

      <Grid container spacing={4}>
        {filteredHomework.map((hw) => (
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
                      Mark Complete
                    </Button>
                  )}
                  
                  {/* Show edit/delete buttons for all student-created homework (not lecturer-created) */}
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
              </div>
            </div>
          </Grid>
        ))}
      </Grid>

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
              <TextField
                fullWidth
                label="Moodle URL"
                value={newHomework.moodle_url}
                onChange={(e) => setNewHomework({ ...newHomework, moodle_url: e.target.value })}
                placeholder="https://moodle.example.com/mod/assign/view.php?id=123"
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
            
            {newHomework.allow_partners && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Maximum Partners</InputLabel>
                  <Select
                    value={newHomework.max_partners}
                    onChange={(e) => setNewHomework({ ...newHomework, max_partners: e.target.value })}
                    label="Maximum Partners"
                  >
                    <MenuItem value={1}>1 Partner</MenuItem>
                    <MenuItem value={2}>2 Partners</MenuItem>
                    <MenuItem value={3}>3 Partners</MenuItem>
                    <MenuItem value={4}>4 Partners</MenuItem>
                    <MenuItem value={5}>5 Partners</MenuItem>
                  </Select>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                    Maximum number of partners allowed for this homework
                  </Typography>
                </FormControl>
              </Grid>
            )}
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
              <TextField
                fullWidth
                label="Moodle URL"
                value={newHomework.moodle_url}
                onChange={(e) => setNewHomework({ ...newHomework, moodle_url: e.target.value })}
                placeholder="https://moodle.example.com/mod/assign/view.php?id=123"
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
            
            {newHomework.allow_partners && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Maximum Partners</InputLabel>
                  <Select
                    value={newHomework.max_partners}
                    onChange={(e) => setNewHomework({ ...newHomework, max_partners: e.target.value })}
                    label="Maximum Partners"
                  >
                    <MenuItem value={1}>1 Partner</MenuItem>
                    <MenuItem value={2}>2 Partners</MenuItem>
                    <MenuItem value={3}>3 Partners</MenuItem>
                    <MenuItem value={4}>4 Partners</MenuItem>
                    <MenuItem value={5}>5 Partners</MenuItem>
                  </Select>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                    Maximum number of partners allowed for this homework
                  </Typography>
                </FormControl>
              </Grid>
            )}
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
