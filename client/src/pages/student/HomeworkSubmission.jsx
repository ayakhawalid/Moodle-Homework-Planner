import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../Components/DashboardLayout';
import { apiService } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Paper,
  Grid
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

function HomeworkSubmission() {
  const navigate = useNavigate();
  const { user, userRole, isLoading: authLoading } = useAuth();
  const [homework, setHomework] = useState([]);
  const [submittedHomework, setSubmittedHomework] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submissionDialog, setSubmissionDialog] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState(null);
  const [submissionData, setSubmissionData] = useState({
    comments: '',
    files: [],
    partner_id: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [updateDialog, setUpdateDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [homeworkToDelete, setHomeworkToDelete] = useState(null);

  useEffect(() => {
    if (authLoading) return;

    if (userRole !== 'student') {
      navigate('/student/dashboard');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch student's courses
        const coursesResponse = await apiService.studentDashboard.getCoursesInfo();
        setCourses(coursesResponse.data);
        
        if (coursesResponse.data.length > 0) {
          setSelectedCourse(coursesResponse.data[0]._id);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load homework data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userRole, authLoading, navigate]);

  useEffect(() => {
    if (selectedCourse) {
      fetchHomeworkForCourse(selectedCourse);
    }
  }, [selectedCourse]);

  const fetchHomeworkForCourse = async (courseId) => {
    try {
      const response = await apiService.homework.getByCourse(courseId);
      
      // Separate pending and submitted homework
      const pending = [];
      const submitted = [];
      
      response.data.forEach(hw => {
        if (hw.submitted) {
          submitted.push(hw);
        } else {
          pending.push(hw);
        }
      });
      
      setHomework(pending);
      setSubmittedHomework(submitted);
    } catch (err) {
      console.error('Error fetching homework:', err);
      setError('Failed to load homework for selected course');
    }
  };

  const handleSubmitHomework = (homeworkItem) => {
    setSelectedHomework(homeworkItem);
    setSubmissionData({
      comments: '',
      files: [],
      partner_id: ''
    });
    setSubmissionDialog(true);
    setSubmissionError(null);
    setSubmissionSuccess(false);
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    setSubmissionData(prev => ({
      ...prev,
      files: [...prev.files, ...files]
    }));
  };

  const removeFile = (index) => {
    setSubmissionData(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    if (!selectedHomework) return;

    setSubmitting(true);
    setSubmissionError(null);

    try {
      const formData = new FormData();
      formData.append('comments', submissionData.comments);
      
      if (submissionData.partner_id) {
        formData.append('partner_id', submissionData.partner_id);
      }

      // Add files
      submissionData.files.forEach(file => {
        formData.append('files', file);
      });

      // Use update API if updating, submit API if new submission
      if (updateDialog) {
        await apiService.studentSubmission.updateSubmission(selectedHomework._id, formData);
      } else {
        await apiService.studentSubmission.submitHomework(selectedHomework._id, formData);
      }
      
      setSubmissionSuccess(true);
      
      // Refresh homework list
      if (selectedCourse) {
        fetchHomeworkForCourse(selectedCourse);
      }
      
      setTimeout(() => {
        setSubmissionDialog(false);
        setUpdateDialog(false);
        setSubmissionSuccess(false);
      }, 2000);
      
    } catch (err) {
      console.error('Error submitting homework:', err);
      setSubmissionError(err.response?.data?.error || 'Failed to submit homework');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateSubmission = (homeworkItem) => {
    setSelectedHomework(homeworkItem);
    setSubmissionData({
      comments: homeworkItem.submission?.comments || '',
      files: [],
      partner_id: homeworkItem.submission?.partner_id || ''
    });
    setUpdateDialog(true);
    setSubmissionError(null);
    setSubmissionSuccess(false);
  };

  const handleDeleteSubmission = (homeworkItem) => {
    setHomeworkToDelete(homeworkItem);
    setDeleteDialog(true);
  };

  const confirmDeleteSubmission = async () => {
    if (!homeworkToDelete) return;

    try {
      // Call API to delete submission
      await apiService.studentSubmission.deleteSubmission(homeworkToDelete._id);
      
      // Refresh homework list
      if (selectedCourse) {
        fetchHomeworkForCourse(selectedCourse);
      }
      
      setDeleteDialog(false);
      setHomeworkToDelete(null);
    } catch (err) {
      console.error('Error deleting submission:', err);
      setError('Failed to delete submission');
    }
  };

  const getStatusColor = (homeworkItem) => {
    const now = new Date();
    const dueDate = new Date(homeworkItem.due_date);
    
    if (homeworkItem.submitted) {
      return 'success';
    } else if (now > dueDate) {
      return 'error';
    } else if (dueDate - now < 24 * 60 * 60 * 1000) { // Less than 24 hours
      return 'warning';
    }
    return 'default';
  };

  const getStatusText = (homeworkItem) => {
    const now = new Date();
    const dueDate = new Date(homeworkItem.due_date);
    
    if (homeworkItem.submitted) {
      return 'Submitted';
    } else if (now > dueDate) {
      return 'Overdue';
    } else if (dueDate - now < 24 * 60 * 60 * 1000) {
      return 'Due Soon';
    }
    return 'Pending';
  };

  const getStatusIcon = (homeworkItem) => {
    const now = new Date();
    const dueDate = new Date(homeworkItem.due_date);
    
    if (homeworkItem.submitted) {
      return <CheckCircleIcon />;
    } else if (now > dueDate) {
      return <WarningIcon />;
    }
    return <ScheduleIcon />;
  };

  if (loading) {
    return (
      <DashboardLayout userRole="student">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="student">
      <Box sx={{ maxWidth: 1200, margin: '0 auto', padding: 2 }}>
        {/* Header */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <AssignmentIcon color="primary" sx={{ fontSize: 40 }} />
              <Typography variant="h5" component="h1" sx={{ fontWeight: 'bold' }}>
                Homework Submission
              </Typography>
            </Box>
            <Typography variant="body2" color="textSecondary">
              View and submit homework assignments for your enrolled courses.
            </Typography>
          </CardContent>
        </Card>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Course Selection */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <FormControl fullWidth>
              <InputLabel id="course-select-label">Select Course</InputLabel>
              <Select
                labelId="course-select-label"
                value={selectedCourse}
                label="Select Course"
                onChange={(e) => setSelectedCourse(e.target.value)}
              >
                {courses.map((course) => (
                  <MenuItem key={course._id} value={course._id}>
                    {course.course_code} - {course.course_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </CardContent>
        </Card>

        {/* Pending Homework List */}
        {selectedCourse && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Pending Homework Assignments
              </Typography>
              
              {homework.length === 0 ? (
                <Paper sx={{ p: 3, textAlign: 'center', backgroundColor: '#f5f5f5' }}>
                  <Typography variant="body1" color="textSecondary">
                    No pending homework assignments for this course.
                  </Typography>
                </Paper>
              ) : (
                <Grid container spacing={2}>
                  {homework.map((homeworkItem) => (
                    <Grid item xs={12} md={6} key={homeworkItem._id}>
                      <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardContent>
                          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                            <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold' }}>
                              {homeworkItem.title}
                            </Typography>
                            <Chip
                              icon={getStatusIcon(homeworkItem)}
                              label={getStatusText(homeworkItem)}
                              color={getStatusColor(homeworkItem)}
                              size="small"
                            />
                          </Box>
                          
                          <Typography variant="body2" color="textSecondary" paragraph>
                            {homeworkItem.description}
                          </Typography>
                          
                          {homeworkItem.instructions && (
                            <Box mb={2}>
                              <Typography variant="subtitle2" gutterBottom>
                                Instructions:
                              </Typography>
                              <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                                {homeworkItem.instructions}
                              </Typography>
                            </Box>
                          )}
                          
                          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="body2" color="textSecondary">
                              <strong>Due:</strong> {new Date(homeworkItem.due_date).toLocaleDateString()} at {new Date(homeworkItem.due_date).toLocaleTimeString()}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              <strong>Points:</strong> {homeworkItem.points_possible}
                            </Typography>
                          </Box>
                          
                          <Typography variant="body2" color="textSecondary" gutterBottom>
                            <strong>Submission Type:</strong> {homeworkItem.submission_type}
                          </Typography>
                          
                          <Divider sx={{ my: 2 }} />
                          
                          <Box display="flex" justifyContent="flex-end">
                            <Button
                              variant="contained"
                              startIcon={<SendIcon />}
                              onClick={() => handleSubmitHomework(homeworkItem)}
                              disabled={new Date() > new Date(homeworkItem.due_date) && !homeworkItem.allow_late_submission}
                            >
                              Submit Assignment
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </Card>
        )}

        {/* Submitted Homework List */}
        {selectedCourse && submittedHomework.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Submitted Homework Assignments
              </Typography>
              
              <Grid container spacing={2}>
                {submittedHomework.map((homeworkItem) => (
                  <Grid item xs={12} md={6} key={homeworkItem._id}>
                    <Card variant="outlined" sx={{ height: '100%', backgroundColor: '#f8f9fa' }}>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                          <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold' }}>
                            {homeworkItem.title}
                          </Typography>
                          <Chip
                            icon={<CheckCircleIcon />}
                            label="Submitted"
                            color="success"
                            size="small"
                          />
                        </Box>
                        
                        <Typography variant="body2" color="textSecondary" paragraph>
                          {homeworkItem.description}
                        </Typography>
                        
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                          <Typography variant="body2" color="textSecondary">
                            <strong>Due:</strong> {new Date(homeworkItem.due_date).toLocaleDateString()} at {new Date(homeworkItem.due_date).toLocaleTimeString()}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            <strong>Points:</strong> {homeworkItem.points_possible}
                          </Typography>
                        </Box>
                        
                        {homeworkItem.submission && (
                          <Box mb={2}>
                            <Typography variant="subtitle2" gutterBottom>
                              Submission Details:
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              <strong>Submitted:</strong> {new Date(homeworkItem.submission.submitted_at).toLocaleString()}
                            </Typography>
                            {homeworkItem.submission.comments && (
                              <Typography variant="body2" color="textSecondary">
                                <strong>Comments:</strong> {homeworkItem.submission.comments}
                              </Typography>
                            )}
                            {homeworkItem.submission.files && homeworkItem.submission.files.length > 0 && (
                              <Typography variant="body2" color="textSecondary">
                                <strong>Files:</strong> {homeworkItem.submission.files.length} file(s)
                              </Typography>
                            )}
                          </Box>
                        )}
                        
                        <Divider sx={{ my: 2 }} />
                        
                        <Box display="flex" justifyContent="flex-end" gap={1}>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<AssignmentIcon />}
                            onClick={() => handleUpdateSubmission(homeworkItem)}
                          >
                            Update
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            startIcon={<DeleteIcon />}
                            onClick={() => handleDeleteSubmission(homeworkItem)}
                          >
                            Remove
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Submission Dialog */}
        <Dialog 
          open={submissionDialog} 
          onClose={() => setSubmissionDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Submit Homework: {selectedHomework?.title}
          </DialogTitle>
          <DialogContent>
            {selectedHomework && (
              <Box>
                <Typography variant="body1" paragraph>
                  <strong>Description:</strong> {selectedHomework.description}
                </Typography>
                
                {selectedHomework.instructions && (
                  <Typography variant="body1" paragraph>
                    <strong>Instructions:</strong> {selectedHomework.instructions}
                  </Typography>
                )}
                
                <Typography variant="body1" paragraph>
                  <strong>Due Date:</strong> {new Date(selectedHomework.due_date).toLocaleString()}
                </Typography>
                
                <Typography variant="body1" paragraph>
                  <strong>Submission Type:</strong> {selectedHomework.submission_type}
                </Typography>
                
                <Divider sx={{ my: 2 }} />
                
                {/* Comments */}
                <TextField
                  label="Comments (Optional)"
                  fullWidth
                  multiline
                  rows={3}
                  value={submissionData.comments}
                  onChange={(e) => setSubmissionData(prev => ({ ...prev, comments: e.target.value }))}
                  margin="normal"
                />
                
                {/* File Upload */}
                {(selectedHomework.submission_type === 'file' || selectedHomework.submission_type === 'both') && (
                  <Box mt={2}>
                    <Typography variant="subtitle1" gutterBottom>
                      Upload Files
                    </Typography>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                      id="file-upload"
                    />
                    <label htmlFor="file-upload">
                      <Button
                        variant="outlined"
                        component="span"
                        startIcon={<UploadIcon />}
                        sx={{ mb: 2 }}
                      >
                        Choose Files
                      </Button>
                    </label>
                    
                    {submissionData.files.length > 0 && (
                      <List>
                        {submissionData.files.map((file, index) => (
                          <ListItem key={index}>
                            <ListItemText primary={file.name} secondary={`${(file.size / 1024).toFixed(1)} KB`} />
                            <ListItemSecondaryAction>
                              <IconButton onClick={() => removeFile(index)}>
                                <DeleteIcon />
                              </IconButton>
                            </ListItemSecondaryAction>
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </Box>
                )}
                
                {submissionError && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {submissionError}
                  </Alert>
                )}
                
                {submissionSuccess && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    Homework submitted successfully!
                  </Alert>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSubmissionDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={submitting || submissionSuccess}
              startIcon={submitting ? <CircularProgress size={20} /> : <SendIcon />}
            >
              {submitting ? 'Submitting...' : 'Submit Homework'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Update Submission Dialog */}
        <Dialog 
          open={updateDialog} 
          onClose={() => setUpdateDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Update Submission: {selectedHomework?.title}
          </DialogTitle>
          <DialogContent>
            {selectedHomework && (
              <Box>
                <Typography variant="body1" paragraph>
                  <strong>Description:</strong> {selectedHomework.description}
                </Typography>
                
                <Typography variant="body1" paragraph>
                  <strong>Due Date:</strong> {new Date(selectedHomework.due_date).toLocaleString()}
                </Typography>
                
                <Divider sx={{ my: 2 }} />
                
                {/* Comments */}
                <TextField
                  label="Comments (Optional)"
                  fullWidth
                  multiline
                  rows={3}
                  value={submissionData.comments}
                  onChange={(e) => setSubmissionData(prev => ({ ...prev, comments: e.target.value }))}
                  margin="normal"
                />
                
                {/* File Upload */}
                {(selectedHomework.submission_type === 'file' || selectedHomework.submission_type === 'both') && (
                  <Box mt={2}>
                    <Typography variant="subtitle1" gutterBottom>
                      Upload New Files (will replace existing files)
                    </Typography>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                      id="update-file-upload"
                    />
                    <label htmlFor="update-file-upload">
                      <Button
                        variant="outlined"
                        component="span"
                        startIcon={<UploadIcon />}
                        sx={{ mb: 2 }}
                      >
                        Choose Files
                      </Button>
                    </label>
                    
                    {submissionData.files.length > 0 && (
                      <List>
                        {submissionData.files.map((file, index) => (
                          <ListItem key={index}>
                            <ListItemText primary={file.name} secondary={`${(file.size / 1024).toFixed(1)} KB`} />
                            <ListItemSecondaryAction>
                              <IconButton onClick={() => removeFile(index)}>
                                <DeleteIcon />
                              </IconButton>
                            </ListItemSecondaryAction>
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </Box>
                )}
                
                {submissionError && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {submissionError}
                  </Alert>
                )}
                
                {submissionSuccess && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    Submission updated successfully!
                  </Alert>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUpdateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={submitting || submissionSuccess}
              startIcon={submitting ? <CircularProgress size={20} /> : <SendIcon />}
            >
              {submitting ? 'Updating...' : 'Update Submission'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog 
          open={deleteDialog} 
          onClose={() => setDeleteDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Remove Submission
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1">
              Are you sure you want to remove your submission for "{homeworkToDelete?.title}"?
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              This action cannot be undone. You will be able to submit again if the due date hasn't passed.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmDeleteSubmission}
              variant="contained"
              color="error"
              startIcon={<DeleteIcon />}
            >
              Remove Submission
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
}

export default HomeworkSubmission;
