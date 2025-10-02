import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../Components/DashboardLayout';
import CalendarComponent from '../../Components/Calendar';
import { apiService } from '../../services/api';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  School as SchoolIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';

const StudentCalendar = () => {
  const { isAuthenticated } = useAuth0();
  const [homework, setHomework] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchStudentHomework();
    }
  }, [isAuthenticated]);

  const fetchStudentHomework = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.studentHomework.getHomework();
      const homeworkData = response.data.homework || [];
      
      // Convert to calendar format
      const calendarHomework = homeworkData.map(hw => ({
        _id: hw._id,
        title: hw.title,
        description: hw.description,
        due_date: hw.claimed_deadline,
        course: {
          _id: hw.course._id,
          name: hw.course.name,
          code: hw.course.code
        },
        completion_status: hw.completion_status,
        deadline_verification_status: hw.deadline_verification_status,
        claimed_grade: hw.claimed_grade,
        uploader_role: hw.uploader_role,
        status: hw.completion_status === 'completed' ? 'graded' : 'pending'
      }));

      setHomework(calendarHomework);

      console.log('Student calendar - Total homework:', calendarHomework.length);
      console.log('Completed homework:', calendarHomework.filter(hw => hw.completion_status === 'completed').length);
      console.log('Pending homework:', calendarHomework.filter(hw => hw.completion_status !== 'completed').length);

    } catch (err) {
      console.error('Error fetching student homework:', err);
      setError(err.response?.data?.error || 'Failed to fetch homework data');
    } finally {
      setLoading(false);
    }
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

  if (error) {
    return (
      <DashboardLayout userRole="student">
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </DashboardLayout>
    );
  }

  // Calculate statistics
  const totalHomework = homework.length;
  const completedHomework = homework.filter(hw => hw.completion_status === 'completed').length;
  const pendingHomework = homework.filter(hw => hw.completion_status !== 'completed').length;
  const overdueHomework = homework.filter(hw => {
    const dueDate = new Date(hw.due_date);
    const today = new Date();
    return dueDate < today && hw.completion_status !== 'completed';
  }).length;

  // Get upcoming homework (next 7 days)
  const upcomingHomework = homework.filter(hw => {
    const dueDate = new Date(hw.due_date);
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return dueDate >= today && dueDate <= nextWeek && hw.completion_status !== 'completed';
  }).length;

  return (
    <DashboardLayout userRole="student">
      <Box>
        <Typography variant="h4" gutterBottom>
          Student Calendar
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Track your homework deadlines and assignments in calendar view
        </Typography>

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <div className="dashboard-card">
              <div className="card-header">
                <div className="card-icon primary">
                  <AssignmentIcon />
                </div>
                <div>
                  <h3 className="card-title">{totalHomework}</h3>
                  <p className="card-subtitle">Total Assignments</p>
                </div>
              </div>
            </div>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <div className="dashboard-card">
              <div className="card-header">
                <div className="card-icon secondary">
                  <CheckCircleIcon />
                </div>
                <div>
                  <h3 className="card-title">{completedHomework}</h3>
                  <p className="card-subtitle">Completed</p>
                </div>
              </div>
            </div>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <div className="dashboard-card">
              <div className="card-header">
                <div className="card-icon accent">
                  <ScheduleIcon />
                </div>
                <div>
                  <h3 className="card-title">{upcomingHomework}</h3>
                  <p className="card-subtitle">Due This Week</p>
                </div>
              </div>
            </div>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <div className="dashboard-card">
              <div className="card-header">
                <div className="card-icon study-activity">
                  <AssignmentIcon />
                </div>
                <div>
                  <h3 className="card-title">{overdueHomework}</h3>
                  <p className="card-subtitle">Overdue</p>
                </div>
              </div>
            </div>
          </Grid>
        </Grid>

        {/* Calendar Component */}
        <CalendarComponent events={homework} userRole="student" />
      </Box>
    </DashboardLayout>
  );
};

export default StudentCalendar;
