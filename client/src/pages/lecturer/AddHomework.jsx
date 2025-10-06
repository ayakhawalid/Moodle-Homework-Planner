import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../Components/DashboardLayout';
import { apiService } from '../../services/api';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  Grid,
  Divider
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  CalendarToday as CalendarIcon,
  Description as DescriptionIcon,
  School as SchoolIcon
} from '@mui/icons-material';
import '../../styles/DashboardLayout.css';

function AddHomework() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    course_id: '',
    title: '',
    description: '',
    instructions: '',
    due_date: '',
    points_possible: 100,
    allow_late_submission: false
  });

  // Fetch lecturer's courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await apiService.courses.getAll();
        setCourses(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching courses:', error);
        setError('Failed to load courses');
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.course_id || !formData.title || !formData.description || !formData.due_date) {
        throw new Error('Please fill in all required fields');
      }

      // Convert due_date to proper format
      const homeworkData = {
        ...formData,
        due_date: new Date(formData.due_date).toISOString(),
        points_possible: parseInt(formData.points_possible)
      };

      await apiService.homework.create(homeworkData);
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/lecturer/courses');
      }, 2000);
    } catch (error) {
      console.error('Error creating homework:', error);
      setError(error.response?.data?.error || error.message || 'Failed to create homework');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    navigate('/lecturer/courses');
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
      <Box sx={{ maxWidth: 800, margin: '0 auto', padding: 2 }}>
        {/* Header */}
        <div className="dashboard-card" style={{ marginBottom: '24px' }}>
          <div className="card-content">
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <AssignmentIcon sx={{ fontSize: 32, color: '#95E1D3' }} />
              <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: '#333' }}>
                Add New Homework
              </Typography>
            </Box>
            <Typography variant="body1" color="textSecondary">
              Create a new homework assignment for your students
            </Typography>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Homework created successfully! Redirecting to course management...
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Form */}
        <div className="dashboard-card">
          <div className="card-content">
            <form onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                {/* Course Selection */}
                <Grid item xs={12}>
                  <FormControl fullWidth required>
                    <InputLabel>Course</InputLabel>
                    <Select
                      name="course_id"
                      value={formData.course_id}
                      onChange={handleInputChange}
                      label="Course"
                      startAdornment={<SchoolIcon sx={{ mr: 1, color: '#95E1D3' }} />}
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
                    name="title"
                    label="Homework Title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Enter homework title"
                    variant="outlined"
                  />
                </Grid>

                {/* Description */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    required
                    name="description"
                    label="Description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Brief description of the homework"
                    variant="outlined"
                    multiline
                    rows={3}
                  />
                </Grid>

                {/* Instructions */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    name="instructions"
                    label="Detailed Instructions"
                    value={formData.instructions}
                    onChange={handleInputChange}
                    placeholder="Detailed instructions for students"
                    variant="outlined"
                    multiline
                    rows={4}
                    helperText="Optional: Provide detailed instructions for completing the homework"
                  />
                </Grid>

                {/* Due Date and Points */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    name="due_date"
                    label="Due Date"
                    type="datetime-local"
                    value={formData.due_date}
                    onChange={handleInputChange}
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      startAdornment: <CalendarIcon sx={{ mr: 1, color: '#95E1D3' }} />
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    name="points_possible"
                    label="Points Possible"
                    type="number"
                    value={formData.points_possible}
                    onChange={handleInputChange}
                    inputProps={{ min: 0, max: 1000 }}
                    helperText="Maximum points for this homework"
                  />
                </Grid>

                {/* Allow Late Submission */}
                <Grid item xs={12} md={6}>
                  <Box display="flex" alignItems="center" height="100%">
                    <FormControlLabel
                      control={
                        <Switch
                          name="allow_late_submission"
                          checked={formData.allow_late_submission}
                          onChange={handleInputChange}
                          color="primary"
                        />
                      }
                      label="Allow Late Submissions"
                    />
                  </Box>
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              {/* Action Buttons */}
              <Box display="flex" gap={2} justifyContent="flex-end">
                <Button
                  variant="contained"
                  onClick={handleCancel}
                  startIcon={<CancelIcon />}
                  disabled={submitting}
                  sx={{
                    backgroundColor: '#F38181',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: '#e85a6b'
                    }
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={submitting}
                  startIcon={submitting ? <CircularProgress size={20} /> : <SaveIcon />}
                  sx={{
                    backgroundColor: '#FCE38A',
                    color: '#333',
                    '&:hover': {
                      backgroundColor: '#fbd65e'
                    }
                  }}
                >
                  {submitting ? 'Creating...' : 'Create Homework'}
                </Button>
              </Box>
            </form>
          </div>
        </div>
      </Box>
    </DashboardLayout>
  );
}

export default AddHomework;
