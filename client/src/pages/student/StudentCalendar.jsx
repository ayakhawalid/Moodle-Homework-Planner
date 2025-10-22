import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../Components/DashboardLayout';
import CalendarComponent from '../../Components/Calendar';
import FallingLeaves from '../../components/FallingLeaves';
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
  const [classes, setClasses] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllCalendarData();
    }
  }, [isAuthenticated]);

  // Refresh data when window regains focus (e.g., returning from homework management)
  useEffect(() => {
    const handleFocus = () => {
      if (isAuthenticated) {
        fetchAllCalendarData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAuthenticated]);

  const fetchAllCalendarData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch homework
      const homeworkResponse = await apiService.studentHomework.getHomework();
      const homeworkData = homeworkResponse.data.homework || [];
      
      // Convert homework to calendar format
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
        status: hw.completion_status === 'completed' ? 'graded' : 'pending',
        type: 'homework'
      }));

      setHomework(calendarHomework);

      // Fetch classes - get multiple weeks to cover the entire calendar view
      try {
        // Fetch classes for current month and next month
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);
        
        // Calculate how many weeks we need to fetch
        const weeks = Math.ceil((endOfNextMonth - startOfMonth) / (7 * 24 * 60 * 60 * 1000));
        
        const allClassesPromises = [];
        for (let i = 0; i < weeks; i++) {
          const weekStart = new Date(startOfMonth);
          weekStart.setDate(startOfMonth.getDate() + (i * 7));
          allClassesPromises.push(
            apiService.studentDashboard.getClassesPlanner(weekStart.toISOString())
          );
        }
        
        const classesResponses = await Promise.allSettled(allClassesPromises);
        const allClassesData = classesResponses
          .filter(result => result.status === 'fulfilled')
          .flatMap(result => result.value.data.schedule || [])
          .flatMap(day => 
            (day.classes || []).map(cls => ({
              _id: cls._id,
              title: cls.topic,
              description: cls.description,
              due_date: cls.class_date,
              start_time: cls.start_time,
              end_time: cls.end_time,
              room: cls.room,
              course: cls.course,
              type: 'class'
            }))
          );
        
        setClasses(allClassesData);
        console.log('Classes fetched:', allClassesData.length);
      } catch (err) {
        console.error('Error fetching classes:', err);
      }

      // Fetch exams
      try {
        const examsResponse = await apiService.studentDashboard.getExams();
        const examsData = examsResponse.data.exams || [];
        
        const calendarExams = examsData.map(exam => ({
          _id: exam._id,
          title: exam.title || exam.exam_title,
          description: exam.description,
          due_date: exam.due_date,
          exam_time: exam.start_time,
          duration: exam.duration_minutes,
          room: exam.room,
          course: exam.course,
          exam_type: exam.exam_type,
          type: 'exam'
        }));
        
        setExams(calendarExams);
      } catch (err) {
        console.error('Error fetching exams:', err);
      }

      console.log('Student calendar - Total homework:', calendarHomework.length);
      console.log('Student calendar - Total classes:', classes.length);
      console.log('Student calendar - Total exams:', exams.length);

    } catch (err) {
      console.error('Error fetching calendar data:', err);
      setError(err.response?.data?.error || 'Failed to fetch calendar data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout userRole="student">
        <div className="page-background">
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        </div>
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

  // Calculate statistics using the same logic as the backend
  const totalHomework = homework.length;
  const completedHomework = homework.filter(hw => 
    hw.completion_status === 'completed' || hw.completion_status === 'graded'
  ).length;
  const pendingHomework = totalHomework - completedHomework;
  // Removed overdue calculation - students can mark homework as completed/graded after due date

  // Get upcoming homework (next 7 days) - only non-completed homework
  const upcomingHomework = homework.filter(hw => {
    const dueDate = new Date(hw.due_date);
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const isUpcoming = dueDate >= today && dueDate <= nextWeek;
    const isCompleted = hw.completion_status === 'completed' || hw.completion_status === 'graded';
    return isUpcoming && !isCompleted;
  }).length;

  // Debug logging for calendar statistics
  console.log('=== CALENDAR STATISTICS DEBUG ===');
  console.log('Total homework:', totalHomework);
  console.log('Completed homework:', completedHomework);
  console.log('Pending homework:', pendingHomework);
  console.log('Upcoming homework:', upcomingHomework);
  // Removed overdue logging
  console.log('Homework completion statuses:', homework.map(hw => ({
    title: hw.title,
    completion_status: hw.completion_status,
    due_date: hw.due_date
  })));
  console.log('=== END CALENDAR STATISTICS DEBUG ===');

  return (
    <DashboardLayout userRole="student">
      <style>
        {`
          .dashboard-card {
            background-color: rgba(255, 255, 255, 0.3) !important;
          }
        `}
      </style>
      <div className="page-background">
        <Box>
        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <div className="dashboard-card">
              <div className="card-content">
                <Box display="flex" alignItems="center">
                  <AssignmentIcon sx={{ mr: 2, color: '#95E1D3' }} />
                  <Box>
                    <Typography variant="h3" sx={{ fontWeight: 'bold', fontSize: '1.8rem' }}>
                      {totalHomework}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
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
                  <CheckCircleIcon sx={{ mr: 2, color: '#D6F7AD' }} />
                  <Box>
                    <Typography variant="h3" sx={{ fontWeight: 'bold', fontSize: '1.8rem' }}>
                      {completedHomework}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
                      Completed
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
                  <ScheduleIcon sx={{ mr: 2, color: '#FCE38A' }} />
                  <Box>
                    <Typography variant="h3" sx={{ fontWeight: 'bold', fontSize: '1.8rem' }}>
                      {upcomingHomework}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
                      Due This Week
                    </Typography>
                  </Box>
                </Box>
              </div>
            </div>
          </Grid>

          {/* Removed overdue card - students can mark homework as completed/graded after due date */}
        </Grid>

        {/* Calendar Component */}
        <CalendarComponent events={[...homework, ...classes, ...exams]} userRole="student" />
      </Box>
      </div>
    </DashboardLayout>
  );
};

export default StudentCalendar;
