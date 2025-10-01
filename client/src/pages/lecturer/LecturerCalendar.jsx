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
  Schedule as ScheduleIcon
} from '@mui/icons-material';

const LecturerCalendar = () => {
  const { isAuthenticated } = useAuth0();
  const [homework, setHomework] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchLecturerHomework();
    }
  }, [isAuthenticated]);

  const fetchLecturerHomework = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch homework from both traditional and student homework systems
      const [traditionalResponse, studentResponse] = await Promise.all([
        apiService.homework.getAll(),
        apiService.studentHomework.getLecturerHomework()
      ]);

      console.log('Traditional response:', traditionalResponse);
      console.log('Student response:', studentResponse);

      // Ensure we have arrays to work with
      const traditionalData = Array.isArray(traditionalResponse.data) ? traditionalResponse.data : [];
      const studentData = Array.isArray(studentResponse.data) ? studentResponse.data : [];

      // Combine both types of homework
      const traditionalHomework = traditionalData.map(hw => ({
        _id: hw._id,
        title: hw.title,
        description: hw.description,
        due_date: hw.due_date,
        course: {
          _id: hw.course_id._id,
          name: hw.course_id.course_name,
          code: hw.course_id.course_code
        },
        status: 'traditional',
        completion_status: 'not_started',
        deadline_verification_status: 'verified',
        uploader_role: 'lecturer'
      }));

      const studentHomework = studentData.map(hw => ({
        _id: hw._id,
        title: hw.title,
        description: hw.description,
        due_date: hw.claimed_deadline,
        course: {
          _id: hw.course_id._id,
          name: hw.course_id.course_name,
          code: hw.course_id.course_code
        },
        status: 'student_created',
        completion_status: hw.completion_status,
        deadline_verification_status: hw.deadline_verification_status,
        claimed_grade: hw.claimed_grade,
        uploader_role: hw.uploader_role
      }));

      const allHomework = [...traditionalHomework, ...studentHomework];
      setHomework(allHomework);

      console.log('Lecturer calendar - Total homework:', allHomework.length);
      console.log('Traditional homework:', traditionalHomework.length);
      console.log('Student homework:', studentHomework.length);

    } catch (err) {
      console.error('Error fetching lecturer homework:', err);
      setError(err.response?.data?.error || 'Failed to fetch homework data');
    } finally {
      setLoading(false);
    }
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

  if (error) {
    return (
      <DashboardLayout userRole="lecturer">
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </DashboardLayout>
    );
  }

  // Calculate statistics
  const totalHomework = homework.length;
  const traditionalHomework = homework.filter(hw => hw.status === 'traditional').length;
  const studentHomework = homework.filter(hw => hw.status === 'student_created').length;
  const pendingVerifications = homework.filter(hw => 
    hw.deadline_verification_status === 'pending_review' || 
    hw.deadline_verification_status === 'unverified'
  ).length;

  return (
    <DashboardLayout userRole="lecturer">
      <Box>
        <Typography variant="h4" gutterBottom>
          Lecturer Calendar
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          View all homework assignments and deadlines across your courses
        </Typography>

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <AssignmentIcon color="primary" sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="h4">
                      {totalHomework}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Assignments
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <SchoolIcon color="secondary" sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="h4">
                      {traditionalHomework}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Traditional Homework
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <AssignmentIcon color="info" sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="h4">
                      {studentHomework}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Student Created
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <ScheduleIcon color="warning" sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="h4">
                      {pendingVerifications}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pending Verifications
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Calendar Component */}
        <CalendarComponent events={homework} userRole="lecturer" />
      </Box>
    </DashboardLayout>
  );
};

export default LecturerCalendar;
