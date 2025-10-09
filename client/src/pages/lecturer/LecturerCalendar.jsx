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
  const [classes, setClasses] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllCalendarData();
    }
  }, [isAuthenticated]);

  const fetchAllCalendarData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch homework
      const homeworkResponse = await apiService.studentHomework.getLecturerHomework();
      
      console.log('Lecturer homework response:', homeworkResponse);
      console.log('Response data:', homeworkResponse.data);
      
      // Handle different response structures
      let homeworkData = [];
      if (Array.isArray(homeworkResponse.data)) {
        homeworkData = homeworkResponse.data;
      } else if (homeworkResponse.data && Array.isArray(homeworkResponse.data.homework)) {
        homeworkData = homeworkResponse.data.homework;
      } else if (homeworkResponse.data && Array.isArray(homeworkResponse.data.data)) {
        homeworkData = homeworkResponse.data.data;
      }
      
      console.log('Processed homework data:', homeworkData);
      console.log('Homework data length:', homeworkData.length);
      
      // Convert to calendar format (same as student calendar)
      const calendarHomework = Array.isArray(homeworkData) ? homeworkData.map(hw => ({
        _id: hw._id,
        title: hw.title,
        description: hw.description,
        due_date: hw.claimed_deadline || hw.verified_deadline,
        course: {
          _id: hw.course_id?._id || hw.course?._id,
          name: hw.course_id?.course_name || hw.course?.name,
          code: hw.course_id?.course_code || hw.course?.code
        },
        completion_status: hw.completion_status,
        deadline_verification_status: hw.deadline_verification_status,
        claimed_grade: hw.claimed_grade,
        uploader_role: hw.uploader_role,
        status: hw.completion_status === 'completed' ? 'graded' : 'pending',
        type: 'homework'
      })) : [];

      setHomework(calendarHomework);

      // Fetch classes
      try {
        const classesResponse = await apiService.lecturerDashboard.getClasses();
        const classesData = classesResponse.data || [];
        
        const calendarClasses = classesData.map(cls => ({
          _id: cls._id,
          title: cls.class_title,
          description: cls.description,
          due_date: cls.class_date,
          start_time: cls.start_time,
          end_time: cls.end_time,
          room: cls.room,
          course: {
            _id: cls.course_id?._id,
            name: cls.course_id?.course_name,
            code: cls.course_id?.course_code
          },
          type: 'class'
        }));
        
        setClasses(calendarClasses);
        console.log('Lecturer calendar - Total classes:', calendarClasses.length);
      } catch (err) {
        console.error('Error fetching classes:', err);
      }

      // Fetch exams
      try {
        const examsResponse = await apiService.lecturerDashboard.getExams();
        const examsData = examsResponse.data || [];
        
        const calendarExams = examsData.map(exam => ({
          _id: exam._id,
          title: exam.exam_title,
          description: exam.description,
          due_date: exam.due_date,
          exam_time: exam.start_time,
          duration: exam.duration_minutes,
          room: exam.room,
          course: {
            _id: exam.course_id?._id,
            name: exam.course_id?.course_name,
            code: exam.course_id?.course_code
          },
          exam_type: exam.exam_type,
          type: 'exam'
        }));
        
        setExams(calendarExams);
        console.log('Lecturer calendar - Total exams:', calendarExams.length);
      } catch (err) {
        console.error('Error fetching exams:', err);
      }

      console.log('Lecturer calendar - Total homework:', calendarHomework.length);
      console.log('Lecturer-created homework:', calendarHomework.filter(hw => hw.uploader_role === 'lecturer').length);
      console.log('Student-created homework:', calendarHomework.filter(hw => hw.uploader_role === 'student').length);

    } catch (err) {
      console.error('Error fetching lecturer calendar data:', err);
      console.error('Error details:', err.response?.data);
      console.error('Error status:', err.response?.status);
      setError(err.response?.data?.error || 'Failed to fetch calendar data');
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
  const traditionalHomework = homework.filter(hw => hw.uploader_role === 'lecturer').length;
  const studentHomework = homework.filter(hw => hw.uploader_role === 'student').length;
  const pendingVerifications = homework.filter(hw => 
    hw.deadline_verification_status === 'pending_review' || 
    hw.deadline_verification_status === 'unverified'
  ).length;

  return (
    <DashboardLayout userRole="lecturer">
      <Box>
        <Typography variant="h3" gutterBottom sx={{ 
          fontWeight: '600',
          fontSize: '2.5rem',
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
          letterSpacing: '-0.01em',
          lineHeight: '1.2',
          color: '#2c3e50',
          mb: 1
        }}>
          Lecturer Calendar
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ 
          mb: 4,
          fontWeight: '300',
          fontSize: '1.1rem',
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
          color: '#7f8c8d',
          lineHeight: '1.6',
          letterSpacing: '0.3px'
        }}>
          View all homework assignments and deadlines across your courses
        </Typography>

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <div className="dashboard-card">
              <div className="card-content">
                <Box display="flex" alignItems="center">
                  <AssignmentIcon sx={{ mr: 2, color: '#95E1D3' }} />
                  <Box>
                    <Typography variant="h4">
                      {totalHomework}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Assignments
                    </Typography>
                  </Box>
                </Box>
              </div>
            </div>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <div className="dashboard-card">
              <div className="card-content">
                <Box display="flex" alignItems="center">
                  <SchoolIcon sx={{ mr: 2, color: '#D6F7AD' }} />
                  <Box>
                    <Typography variant="h4">
                      {traditionalHomework}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Traditional Homework
                    </Typography>
                  </Box>
                </Box>
              </div>
            </div>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <div className="dashboard-card">
              <div className="card-content">
                <Box display="flex" alignItems="center">
                  <AssignmentIcon sx={{ mr: 2, color: '#FCE38A' }} />
                  <Box>
                    <Typography variant="h4">
                      {studentHomework}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Student Created
                    </Typography>
                  </Box>
                </Box>
              </div>
            </div>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <div className="dashboard-card">
              <div className="card-content">
                <Box display="flex" alignItems="center">
                  <ScheduleIcon sx={{ mr: 2, color: '#F38181' }} />
                  <Box>
                    <Typography variant="h4">
                      {pendingVerifications}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pending Verifications
                    </Typography>
                  </Box>
                </Box>
              </div>
            </div>
          </Grid>
        </Grid>

        {/* Calendar Component */}
        <CalendarComponent events={[...homework, ...classes, ...exams]} userRole="lecturer" />
      </Box>
    </DashboardLayout>
  );
};

export default LecturerCalendar;
