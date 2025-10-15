import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Paper,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button
} from '@mui/material';
import DashboardLayout from '../../Components/DashboardLayout';
import {
  Schedule as ScheduleIcon,
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  ExpandMore as ExpandMoreIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { useAuth0 } from '@auth0/auth0-react';
import { apiService } from '../../services/api';

const CourseWorkloadOverview = () => {
  const { isAuthenticated } = useAuth0();
  const [courses, setCourses] = useState([]);
  const [allHomework, setAllHomework] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('30'); // days
  const [selectedCourseForWorkload, setSelectedCourseForWorkload] = useState('');
  const [studentWorkloadData, setStudentWorkloadData] = useState(null);
  const [lecturerCourses, setLecturerCourses] = useState([]);
  const [homeworkStatusData, setHomeworkStatusData] = useState(null);

  // Helper function to get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'warning';
      case 'not_started':
        return 'default';
      case 'overdue':
        return 'error';
      default:
        return 'default';
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      // Add a small delay to ensure user sync is complete
      const timer = setTimeout(() => {
        fetchData();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, selectedTimeframe]);


  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching user profile...');
      // First get the current user to get lecturer ID
      let userResponse;
      try {
        userResponse = await apiService.user.getProfile();
        console.log('User response:', userResponse);
      } catch (profileError) {
        console.error('Profile fetch failed, trying test data endpoint:', profileError);
        // Fallback: try the test data endpoint to get user info
        const testResponse = await apiService.testData.getStatus();
        userResponse = testResponse.data.user;
        console.log('User from test data:', userResponse);
      }
      
      if (!userResponse || !userResponse._id) {
        throw new Error('User profile not found');
      }
      
      const lecturerId = userResponse._id;
      console.log('Lecturer ID:', lecturerId);
      
      // Fetch ALL courses (not just lecturer's courses)
      console.log('Fetching all courses...');
      let allCourses = [];
      
      try {
        const allCoursesResponse = await apiService.courses.getAll();
        console.log('All courses response:', allCoursesResponse);
        
        if (allCoursesResponse && allCoursesResponse.data) {
          allCourses = allCoursesResponse.data.filter(course => course.is_active);
        } else if (Array.isArray(allCoursesResponse)) {
          // Handle case where response is directly an array
          allCourses = allCoursesResponse.filter(course => course.is_active);
        } else {
          throw new Error('Invalid courses response format');
        }
      } catch (coursesError) {
        console.error('Error fetching all courses:', coursesError);
        throw coursesError;
      }
        console.log('Active courses:', allCourses);
        console.log('Course details:', allCourses.map(c => ({
          id: c._id,
          name: c.course_name,
          code: c.course_code,
          lecturer_id: c.lecturer_id
        })));
        setCourses(allCourses);
        
        // Also get lecturer's own courses for the student workload dropdown
        const myCoursesOnly = allCourses.filter(course => 
          course.lecturer_id && course.lecturer_id._id === lecturerId
        );
        setLecturerCourses(myCoursesOnly);
        console.log('Lecturer courses:', myCoursesOnly);

      if (allCourses.length === 0) {
        console.log('No active courses found');
        setAllHomework([]);
        return;
      }


    } catch (err) {
      console.error('Error fetching data:', err);
      console.error('Error details:', {
        message: err.message,
        code: err.code,
        response: err.response?.data,
        status: err.response?.status,
        config: err.config?.url
      });
      
      let errorMessage = 'Failed to fetch course data';
      if (err.code === 'NETWORK_ERROR' || err.message.includes('Network Error')) {
        errorMessage = 'Network Error: Cannot connect to server. Please check if the server is running.';
      } else if (err.response?.status === 401) {
        errorMessage = 'Authentication Error: Please log in again.';
      } else if (err.response?.status === 403) {
        errorMessage = 'Permission Error: You do not have access to this data.';
      } else if (err.response?.status >= 500) {
        errorMessage = 'Server Error: Please try again later.';
      } else {
        errorMessage = `Failed to fetch course data: ${err.message}`;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Fetch student workload when a course is selected
  useEffect(() => {
    const fetchStudentWorkload = async () => {
      if (!selectedCourseForWorkload) {
        setStudentWorkloadData(null);
        return;
      }

      try {
        const response = await apiService.lecturerDashboard.getStudentCourseWorkload(selectedCourseForWorkload);
        setStudentWorkloadData(response.data);
      } catch (err) {
        console.error('Error fetching student workload:', err);
      }
    };

    fetchStudentWorkload();
  }, [selectedCourseForWorkload]);

  // Fetch homework status for all courses that students are taking
  useEffect(() => {
    const fetchAllHomeworkStatus = async () => {
      if (!selectedCourseForWorkload) {
        setHomeworkStatusData(null);
        return;
      }

      try {
        // Get all courses that students are taking from the studentWorkloadData
        if (studentWorkloadData && studentWorkloadData.student_workload) {
          const courseIds = studentWorkloadData.student_workload.map(course => course.course_id);
          
          // Fetch homework status for each course
          const allHomeworkStatusPromises = courseIds.map(courseId => 
            apiService.lecturerDashboard.getHomeworkStatusAny(courseId)
          );
          
          const allHomeworkStatusResponses = await Promise.all(allHomeworkStatusPromises);
          
          console.log('Homework status responses:', allHomeworkStatusResponses);
          
          // Combine all homework status data
          const combinedHomeworkStatus = allHomeworkStatusResponses.map((response, index) => {
            console.log(`Course ${index} response:`, response.data);
            return {
              course: response.data.course,
              homework_status: response.data.homework_status,
              overall_stats: response.data.overall_stats
            };
          });
          
          console.log('Combined homework status:', combinedHomeworkStatus);
          
          setHomeworkStatusData({
            courses: combinedHomeworkStatus,
            selected_course: studentWorkloadData.course
          });
        }
      } catch (err) {
        console.error('Error fetching homework status for all courses:', err);
      }
    };

    if (studentWorkloadData) {
      fetchAllHomeworkStatus();
    }
  }, [selectedCourseForWorkload, studentWorkloadData]);

  // Fetch ALL homework from ALL courses in the system on component mount
  useEffect(() => {
    const fetchAllHomework = async () => {
      try {
        console.log('Fetching ALL homework from ALL courses in the system');
        const response = await apiService.lecturerDashboard.getAllHomework();
        const data = response.data;
        
        console.log('All homework fetched:', data.homework.length);
        console.log('All courses found:', data.courses.length);
        
        setAllHomework(data.homework);
        setCourses(data.courses);
      } catch (err) {
        console.error('Error fetching all homework:', err);
        if (err.response?.status === 401) {
          console.error('Authentication error - user may not be logged in');
          setError('Please log in to view this data');
        } else {
          setError('Failed to load homework data');
        }
        setAllHomework([]);
        setCourses([]);
      }
    };

    // Only fetch if user is authenticated
    if (isAuthenticated) {
      fetchAllHomework();
    } else {
      console.log('User not authenticated, skipping homework fetch');
    }
  }, [isAuthenticated]); // Run when authentication status changes



  const getWorkloadData = () => {
    try {
      const now = new Date();
      const timeframeDays = parseInt(selectedTimeframe);
      const endDate = new Date(now.getTime() + timeframeDays * 24 * 60 * 60 * 1000);

      console.log('=== WORKLOAD DATA CALCULATION ===');
      console.log('Total homework available:', allHomework.length);
      console.log('Courses count:', courses.length);
      console.log('All homework:', allHomework.map(hw => ({ 
        id: hw._id, 
        title: hw.title, 
        course_id: hw.course_id, 
        uploader_role: hw.uploader_role,
        completion_status: hw.completion_status 
      })));

      // Group homework by course
      const courseWorkloads = courses.map(course => {
        console.log(`\n--- Processing Course: ${course.course_name} (${course._id}) ---`);
        console.log('All homework to check:', allHomework.map(hw => ({
          id: hw._id,
          title: hw.title,
          course_id: hw.course_id,
          course: hw.course,
          course_match: (hw.course_id || (hw.course && hw.course._id)) === course._id
        })));
        
        const courseHomework = allHomework.filter(hw => {
          // Try multiple ways to match course IDs
          const hwCourseId = hw.course_id || (hw.course && hw.course._id);
          const courseId = course._id;
          
          // Convert both to strings for comparison
          const hwCourseIdStr = hwCourseId ? hwCourseId.toString() : null;
          const courseIdStr = course._id ? course._id.toString() : null;
          
          // Also try direct comparison in case they're the same type
          const matches = hwCourseIdStr === courseIdStr || 
                         hwCourseId === course._id ||
                         (hwCourseId && course._id && hwCourseId.toString() === course._id.toString());
          
          return matches;
        });
        
        console.log(`Course ${course.course_name}: ${courseHomework.length} homework items`);
        console.log(`Course ID: ${course._id} (type: ${typeof course._id})`);
        console.log(`Course homework:`, courseHomework.map(hw => ({ 
          id: hw._id, 
          title: hw.title, 
          uploader_role: hw.uploader_role,
          completion_status: hw.completion_status,
          course_id: hw.course_id,
          course: hw.course
        })));
      
        // Count homework by status
        const statusCounts = {
          not_started: 0,
          in_progress: 0,
          completed: 0,
          graded: 0
        };
        
        courseHomework.forEach(hw => {
          if (hw && hw.completion_status) {
            statusCounts[hw.completion_status] = (statusCounts[hw.completion_status] || 0) + 1;
          }
        });

        // Count upcoming deadlines
        const upcomingDeadlines = courseHomework.filter(hw => {
          if (!hw) return false;
          const deadlineDate = hw.claimed_deadline || hw.due_date;
          if (!deadlineDate) {
            console.log(`Homework "${hw.title}" has no deadline date`);
            return false;
          }
          const deadline = new Date(deadlineDate);
          const isUpcoming = deadline >= now && deadline <= endDate;
          
          console.log(`Homework "${hw.title}":`, {
            deadlineDate: deadlineDate,
            deadline: deadline,
            now: now,
            endDate: endDate,
            isUpcoming: isUpcoming,
            timeframe: selectedTimeframe
          });
          
          return isUpcoming;
        }).length;

        // Count overdue assignments (ALL assignments past due date, regardless of completion)
        // Use start of today for proper comparison
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const overdue = courseHomework.filter(hw => {
          if (!hw) return false;
          const deadlineDate = hw.claimed_deadline || hw.due_date;
          if (!deadlineDate) return false;
          const deadline = new Date(deadlineDate);
          return deadline < startOfToday; // Show ALL overdue, regardless of completion status
        }).length;

        // Create abbreviated course code for better chart readability
        const abbreviatedCode = course.course_code.length > 8 
          ? course.course_code.substring(0, 8) + '...' 
          : course.course_code;

        return {
          courseId: course._id,
          courseName: course.course_name,
          courseCode: abbreviatedCode,
          fullCourseCode: course.course_code, // Keep full code for tooltip
          totalHomework: courseHomework.length,
          upcomingDeadlines,
          overdue,
          statusCounts,
          homework: courseHomework
        };
      });

      return courseWorkloads;
    } catch (error) {
      console.error('Error in getWorkloadData:', error);
      return [];
    }
  };

  const getTimelineData = () => {
    try {
      const now = new Date();
      const timeframeDays = parseInt(selectedTimeframe);
      const endDate = new Date(now.getTime() + timeframeDays * 24 * 60 * 60 * 1000);

      // Create daily timeline
      const timelineData = [];
      for (let i = 0; i < timeframeDays; i++) {
        const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayHomework = allHomework.filter(hw => {
          if (!hw) return false;
          const deadlineDate = hw.claimed_deadline || hw.due_date;
          if (!deadlineDate) return false;
          const deadline = new Date(deadlineDate);
          return deadline.toISOString().split('T')[0] === dateStr;
        });

        timelineData.push({
          date: dateStr,
          day: date.getDate(),
          month: date.getMonth() + 1,
          assignments: dayHomework.length,
          courses: [...new Set(dayHomework.map(hw => hw.course?._id).filter(Boolean))].length
        });
      }

      return timelineData;
    } catch (error) {
      console.error('Error in getTimelineData:', error);
      return [];
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  // Safely get data with error handling
  let workloadData = [];
  let timelineData = [];
  
  try {
    console.log('=== RENDER DATA PROCESSING ===');
    console.log('allHomework state at render:', allHomework.length);
    console.log('courses state at render:', courses.length);
    console.log('allHomework details:', allHomework.map(hw => ({
      id: hw._id,
      title: hw.title,
      uploader_role: hw.uploader_role,
      completion_status: hw.completion_status,
      course_id: hw.course_id,
      course: hw.course
    })));
    console.log('courses details:', courses.map(c => ({
      id: c._id,
      name: c.course_name,
      code: c.course_code
    })));
    
    workloadData = getWorkloadData();
    timelineData = getTimelineData();
    
    console.log('Processed data:', {
      totalHomework: allHomework.length,
      courses: courses.length,
      workloadDataLength: workloadData.length,
      workloadData: workloadData
    });
    
    // Debug upcoming deadlines calculation
    const totalUpcomingDeadlines = workloadData?.reduce((sum, course) => sum + (course?.upcomingDeadlines || 0), 0) || 0;
    console.log('Upcoming deadlines calculation:', {
      totalUpcomingDeadlines: totalUpcomingDeadlines,
      courseBreakdown: workloadData.map(course => ({
        courseName: course.courseName,
        upcomingDeadlines: course.upcomingDeadlines
      }))
    });
    console.log('===============================');
  } catch (error) {
    console.error('Error processing data for display:', error);
    setError('Error processing data for display');
  }

  return (
    <DashboardLayout userRole="lecturer">
      <Box sx={{ p: 3 }}>
      <Typography variant="h3" component="h1" sx={{ 
        fontWeight: '600',
        fontSize: '2.5rem',
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        letterSpacing: '-0.01em',
        lineHeight: '1.2',
        color: '#2c3e50',
        mb: 1
      }}>
        Course Workload Overview
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
        Visualize student workload across all courses in the system
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}


      {/* Timeframe Selector */}
      <Box sx={{ mb: 3 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Timeframe</InputLabel>
          <Select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
          >
            <MenuItem value="7">Next 7 days</MenuItem>
            <MenuItem value="14">Next 14 days</MenuItem>
            <MenuItem value="30">Next 30 days</MenuItem>
            <MenuItem value="60">Next 60 days</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <div className="dashboard-card">
            <div className="card-content">
              <Box display="flex" alignItems="center">
                <SchoolIcon sx={{ mr: 2, color: '#95E1D3' }} />
                <Box>
                  <Typography variant="h4">{courses?.length || 0}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Courses
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
                <AssignmentIcon sx={{ mr: 2, color: '#D6F7AD' }} />
                <Box>
                  <Typography variant="h4">{allHomework?.length || 0}</Typography>
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
                <ScheduleIcon sx={{ mr: 2, color: '#FCE38A' }} />
                <Box>
                  <Typography variant="h4">
                    {workloadData?.reduce((sum, course) => sum + (course?.upcomingDeadlines || 0), 0) || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Upcoming Deadlines
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
                <WarningIcon sx={{ mr: 2, color: '#F38181' }} />
                <Box>
                  <Typography variant="h4">
                    {workloadData?.reduce((sum, course) => sum + (course?.overdue || 0), 0) || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Overdue Assignments
                  </Typography>
                </Box>
              </Box>
            </div>
          </div>
        </Grid>
      </Grid>

      {/* Information Note */}
      <Box sx={{ 
        mt: 3, 
        mb: 2, 
        p: 2, 
        backgroundColor: 'rgba(0, 0, 0, 0.02)', 
        borderRadius: 2,
        border: '1px solid rgba(0, 0, 0, 0.1)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Box sx={{ 
            width: 8, 
            height: 8, 
            backgroundColor: '#666', 
            borderRadius: '50%' 
          }} />
          <Typography variant="subtitle2" sx={{ 
            color: '#333', 
            fontWeight: 'bold',
            fontSize: '0.9rem'
          }}>
            System Overview
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ 
          color: '#666', 
          fontSize: '0.85rem',
          lineHeight: 1.4
        }}>
          The statistics above show data from <strong>all homework assignments across all courses</strong> in the system, 
          providing a comprehensive view of the overall academic workload.
        </Typography>
      </Box>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Course Workload Comparison */}
        <Grid item xs={12} md={6}>
          <div className="dashboard-card">
            <div className="card-content">
              <Typography variant="h6" gutterBottom>
                Assignment Distribution by Course
                {workloadData.length > 8 && (
                  <Typography variant="caption" display="block" color="text.secondary">
                    Scroll horizontally to see all courses
                  </Typography>
                )}
              </Typography>
              <Box sx={{ overflowX: 'auto', overflowY: 'hidden' }}>
                <ResponsiveContainer 
                  width={workloadData.length > 8 ? workloadData.length * 80 : '100%'} 
                  height={Math.max(400, workloadData.length * 25 + 150)}
                >
                  <BarChart 
                    data={workloadData && workloadData.length > 0 ? workloadData : []}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="courseCode" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                      fontSize={12}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [value, name]}
                      labelFormatter={(label, payload) => {
                        if (payload && payload.length > 0) {
                          const data = payload[0].payload;
                          return `${data.fullCourseCode || data.courseCode} - ${data.courseName}`;
                        }
                        return `Course: ${label}`;
                      }}
                    />
                    <Legend />
                    <Bar dataKey="totalHomework" fill="#7DD3C0" name="Total Assignments" />
                    <Bar dataKey="upcomingDeadlines" fill="#C8F299" name="Upcoming Deadlines" />
                    <Bar dataKey="overdue" fill="#E85A6B" name="Overdue" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </div>
          </div>
        </Grid>

        {/* Timeline */}
        <Grid item xs={12}>
          <div className="dashboard-card">
            <div className="card-content">
              <Typography variant="h6" gutterBottom>
                Assignment Timeline (Next {selectedTimeframe} Days)
              </Typography>
              <Box sx={{ overflowX: 'auto', overflowY: 'hidden' }}>
                <ResponsiveContainer 
                  width={timelineData.length > 14 ? timelineData.length * 60 : '100%'} 
                  height={400}
                >
                  <LineChart 
                    data={timelineData && timelineData.length > 0 ? timelineData : []}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="day" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                      fontSize={12}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [value, name]}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="assignments" stroke="#7DD3C0" name="Assignments Due" strokeWidth={3} />
                    <Line type="monotone" dataKey="courses" stroke="#E85A6B" name="Courses Affected" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </div>
          </div>
        </Grid>
      </Grid>

      {/* Student Course Workload Analysis */}
      <Box sx={{ mb: 4 }}>
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon primary">
              <PersonIcon />
            </div>
            <div style={{ flex: 1 }}>
              <h3 className="card-title">Student Workload Analysis</h3>
              <p className="card-subtitle">See what other courses your students are taking</p>
            </div>
            <FormControl sx={{ minWidth: 300 }} size="small">
              <InputLabel>Select Your Course</InputLabel>
              <Select
                value={selectedCourseForWorkload}
                label="Select Your Course"
                onChange={(e) => setSelectedCourseForWorkload(e.target.value)}
              >
                <MenuItem value="">
                  <em>Select a course</em>
                </MenuItem>
                {lecturerCourses.map((course) => (
                  <MenuItem key={course._id} value={course._id}>
                    {course.course_name} ({course.course_code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
          
          {studentWorkloadData ? (
            <div className="card-content">
              <Box sx={{ mb: 2 }}>
                <Typography variant="body1" gutterBottom>
                  <strong>Course:</strong> {studentWorkloadData.selected_course.course_name} ({studentWorkloadData.selected_course.course_code})
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Analyzing workload for {studentWorkloadData.selected_course.student_count} students
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3, mb: 2 }}>
                <Typography variant="h6">
                Courses Your Students Are Taking
              </Typography>
                <Box sx={{ 
                  backgroundColor: 'rgba(149, 225, 211, 0.3)', 
                  borderRadius: 2, 
                  px: 2, 
                  py: 1,
                  border: '1px solid rgba(149, 225, 211, 0.5)'
                }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    Total Students in Selected Course
                  </Typography>
                  <Typography variant="h6" sx={{ color: '#95E1D3', fontWeight: 'bold', textAlign: 'center' }}>
                    {studentWorkloadData.selected_course.student_count}
                  </Typography>
                </Box>
              </Box>
              
              {studentWorkloadData.student_workload.length > 0 ? (
                <>
                  {/* Bar Chart */}
                  <Box sx={{ overflowX: 'auto', mb: 3 }}>
                    <ResponsiveContainer 
                      width={studentWorkloadData.student_workload.length > 6 ? studentWorkloadData.student_workload.length * 100 : '100%'} 
                      height={400}
                    >
                      <BarChart 
                        data={studentWorkloadData.student_workload}
                        margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="course_name" 
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          interval={0}
                          fontSize={11}
                        />
                        <YAxis />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <Paper sx={{ p: 2 }}>
                                  <Typography variant="subtitle2">{data.course_name}</Typography>
                                  <Typography variant="caption" display="block">
                                    Code: {data.course_code}
                                  </Typography>
                                  {data.lecturer && (
                                    <Typography variant="caption" display="block">
                                      Lecturer: {data.lecturer.name}
                                    </Typography>
                                  )}
                                  <Divider sx={{ my: 1 }} />
                                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#F38181' }}>
                                    Students from your course taking this: {payload.find(p => p.dataKey === 'student_count')?.value || 0}
                                  </Typography>
                                  <Divider sx={{ my: 1 }} />
                                  {selectedTimeframe === '7' && (
                                  <Typography variant="body2">
                                      Due This Week: {payload.find(p => p.dataKey === 'upcoming_week')?.value || 0} assignments
                                  </Typography>
                                  )}
                                  {selectedTimeframe === '30' && (
                                  <Typography variant="body2">
                                      Due This Month: {payload.find(p => p.dataKey === 'upcoming_month')?.value || 0} assignments
                                  </Typography>
                                  )}
                                  {selectedTimeframe === '60' && (
                                    <Typography variant="body2">
                                      Due This Quarter: {payload.find(p => p.dataKey === 'upcoming_quarter')?.value || 0} assignments
                                    </Typography>
                                  )}
                                </Paper>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend />
                        {selectedTimeframe === '7' && (
                          <Bar dataKey="upcoming_week" fill="#95E1D3" name="Due This Week" />
                        )}
                        {selectedTimeframe === '30' && (
                          <Bar dataKey="upcoming_month" fill="#D6F7AD" name="Due This Month" />
                        )}
                        {selectedTimeframe === '60' && (
                          <Bar dataKey="upcoming_quarter" fill="#FCE38A" name="Due This Quarter" />
                        )}
                        <Bar dataKey="student_count" fill="#F38181" name="Students Taking This Course" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>

                  {/* Detailed List */}
                  <Typography variant="h6" gutterBottom>
                    Course Details
                  </Typography>
                  <Grid container spacing={2}>
                    {studentWorkloadData.student_workload.map((courseData) => (
                      <Grid item xs={12} md={6} key={courseData.course_id}>
                        <Paper sx={{ p: 2, borderLeft: `4px solid ${courseData.upcoming_week > 3 ? '#F38181' : '#95E1D3'}` }}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {courseData.course_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {courseData.course_code}
                          </Typography>
                          {courseData.lecturer && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              Lecturer: {courseData.lecturer.name}
                            </Typography>
                          )}
                          
                          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Chip
                              label={`${courseData.upcoming_week} due this week`}
                              size="small"
                              sx={{
                                backgroundColor: courseData.upcoming_week > 3 ? 'rgba(243, 129, 129, 0.3)' : 'rgba(149, 225, 211, 0.3)',
                                color: courseData.upcoming_week > 3 ? '#F38181' : '#95E1D3',
                                fontWeight: 'bold'
                              }}
                            />
                            <Chip
                              label={`${courseData.upcoming_month} due this month`}
                              size="small"
                              sx={{
                                backgroundColor: 'rgba(214, 247, 173, 0.3)',
                                color: '#D6F7AD',
                                fontWeight: 'bold'
                              }}
                            />
                            {selectedTimeframe === '60' && courseData.upcoming_quarter && (
                              <Chip
                                label={`${courseData.upcoming_quarter} due this quarter`}
                                size="small"
                                sx={{
                                  backgroundColor: 'rgba(252, 227, 138, 0.3)',
                                  color: '#FCE38A',
                                  fontWeight: 'bold'
                                }}
                              />
                            )}
                          </Box>
                          
                          {/* Homework Status Breakdown for this course */}
                          {homeworkStatusData && homeworkStatusData.courses && (() => {
                            const courseStatusData = homeworkStatusData.courses.find(c => c.course._id === courseData.course_id);
                            console.log('Looking for course:', courseData.course_id);
                            console.log('Available courses:', homeworkStatusData.courses.map(c => c.course._id));
                            console.log('Found course status data:', courseStatusData);
                            return courseStatusData && courseStatusData.homework_status.length > 0 ? (
                              <Box sx={{ mt: 2 }}>
                                <Typography variant="body2" fontWeight="bold" gutterBottom>
                                  Homework Status Breakdown
                                </Typography>
                                
                                {courseStatusData.homework_status.map((homework) => (
                                  <Paper key={homework._id} sx={{ p: 2, mb: 2, borderLeft: `4px solid ${homework.type === 'traditional' ? '#95E1D3' : '#FCE38A'}`, backgroundColor: 'rgba(255, 255, 255, 0.6)' }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                      <Box>
                                        <Typography variant="subtitle2" fontWeight="bold">
                                          {homework.title}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" display="block">
                                          Due: {new Date(homework.due_date).toLocaleDateString()}
                                        </Typography>
                                        <Chip 
                                          label={homework.type === 'traditional' ? 'Traditional' : 'Student Created'} 
                                          size="small" 
                                          sx={{ 
                                            mt: 0.5,
                                            backgroundColor: homework.type === 'traditional' ? 'rgba(149, 225, 211, 0.3)' : 'rgba(252, 227, 138, 0.3)',
                                            color: homework.type === 'traditional' ? '#95E1D3' : '#FCE38A',
                                            fontWeight: 'bold'
                                          }}
                                        />
                                      </Box>
                                    </Box>
                                    
                                    {/* Elegant 4-Bar Chart */}
                                    <Box sx={{ mb: 2, height: 80, display: 'flex', alignItems: 'end', gap: 2, px: 2 }}>
                                      {(() => {
                                        const maxValue = Math.max(
                                          homework.status_counts.graded,
                                          homework.status_counts.completed,
                                          homework.status_counts.in_progress,
                                          homework.status_counts.not_started,
                                          1 // Prevent division by zero
                                        );
                                        
                                        const statusData = [
                                          { label: 'Graded', value: homework.status_counts.graded, color: '#95E1D3' },
                                          { label: 'Completed', value: homework.status_counts.completed, color: '#D6F7AD' },
                                          { label: 'In Progress', value: homework.status_counts.in_progress, color: '#FCE38A' },
                                          { label: 'Not Started', value: homework.status_counts.not_started, color: '#F38181' }
                                        ];
                                        
                                        return statusData.map((status, index) => (
                                          <Box key={index} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '60px' }}>
                                            <Box
                                              sx={{
                                                width: '24px',
                                                height: `${(status.value / maxValue) * 50}px`,
                                                background: `linear-gradient(135deg, ${status.color} 0%, ${status.color}CC 100%)`,
                                                borderRadius: '12px 12px 4px 4px',
                                                minHeight: status.value > 0 ? '6px' : '0px',
                                                transition: 'all 0.3s ease',
                                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                                                '&:hover': {
                                                  transform: 'scale(1.05)',
                                                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                                                }
                                              }}
                                            />
                                            <Typography variant="caption" sx={{ mt: 1, fontSize: '11px', textAlign: 'center', fontWeight: 600, color: '#666' }}>
                                              {status.value}
                                            </Typography>
                                            <Typography variant="caption" sx={{ fontSize: '9px', textAlign: 'center', color: '#999', lineHeight: 1 }}>
                                              {status.label}
                                            </Typography>
                                          </Box>
                                        ));
                                      })()}
                                    </Box>

                                    {/* Status Counts */}
                                    <Grid container spacing={1}>
                                      <Grid item xs={6} sm={3}>
                                        <Box sx={{ p: 1, backgroundColor: 'rgba(149, 225, 211, 0.3)', borderRadius: 1, textAlign: 'center' }}>
                                          <Typography variant="h6" sx={{ color: '#95E1D3', fontWeight: 'bold' }}>
                                            {homework.status_counts.graded}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary">
                                            Graded
                                          </Typography>
                                        </Box>
                                      </Grid>
                                      <Grid item xs={6} sm={3}>
                                        <Box sx={{ p: 1, backgroundColor: 'rgba(214, 247, 173, 0.3)', borderRadius: 1, textAlign: 'center' }}>
                                          <Typography variant="h6" sx={{ color: '#D6F7AD', fontWeight: 'bold' }}>
                                            {homework.status_counts.completed}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary">
                                            Completed
                                          </Typography>
                                        </Box>
                                      </Grid>
                                      <Grid item xs={6} sm={3}>
                                        <Box sx={{ p: 1, backgroundColor: 'rgba(252, 227, 138, 0.3)', borderRadius: 1, textAlign: 'center' }}>
                                          <Typography variant="h6" sx={{ color: '#FCE38A', fontWeight: 'bold' }}>
                                            {homework.status_counts.in_progress}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary">
                                            In Progress
                                          </Typography>
                                        </Box>
                                      </Grid>
                                      <Grid item xs={6} sm={3}>
                                        <Box sx={{ p: 1, backgroundColor: 'rgba(243, 129, 129, 0.3)', borderRadius: 1, textAlign: 'center' }}>
                                          <Typography variant="h6" sx={{ color: '#F38181', fontWeight: 'bold' }}>
                                            {homework.status_counts.not_started}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary">
                                            Not Started
                                          </Typography>
                                        </Box>
                                      </Grid>
                                    </Grid>

                                    {/* Average Grade and Completion Rate */}
                                    <Grid container spacing={1} sx={{ mt: 1 }}>
                                      <Grid item xs={6}>
                                        <Box sx={{ p: 1, backgroundColor: 'rgba(255, 255, 255, 0.4)', borderRadius: 1, textAlign: 'center' }}>
                                          <Typography variant="body2" color="text.secondary">
                                            Average Grade
                                          </Typography>
                                          <Typography variant="h6" sx={{ color: '#333', fontWeight: 'bold' }}>
                                            {homework.average_grade ? `${homework.average_grade}%` : 'N/A'}
                                          </Typography>
                                        </Box>
                                      </Grid>
                                      <Grid item xs={6}>
                                        <Box sx={{ p: 1, backgroundColor: 'rgba(255, 255, 255, 0.4)', borderRadius: 1, textAlign: 'center' }}>
                                          <Typography variant="body2" color="text.secondary">
                                            Completion Rate
                                          </Typography>
                                          <Typography variant="h6" sx={{ color: '#333', fontWeight: 'bold' }}>
                                            {homework.total_students > 0 ? Math.round(((homework.status_counts.graded + homework.status_counts.completed) / homework.total_students) * 100) : 0}%
                                          </Typography>
                                        </Box>
                                      </Grid>
                                    </Grid>

                                    {/* Progress Bar */}
                                    <Box sx={{ mt: 2 }}>
                                      <Box sx={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.3)', borderRadius: 1, height: 8 }}>
                                        <Box 
                                          sx={{ 
                                            width: `${homework.total_students > 0 ? ((homework.status_counts.graded + homework.status_counts.completed) / homework.total_students) * 100 : 0}%`, 
                                            backgroundColor: '#95E1D3', 
                                            height: '100%', 
                                            borderRadius: 1,
                                            transition: 'width 0.3s ease'
                                          }} 
                                        />
                                      </Box>
                                    </Box>
                                  </Paper>
                                ))}
                              </Box>
                            ) : null;
                          })()}
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </>
              ) : (
                <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  No other courses found for students in this course
                </Typography>
              )}

            </div>
          ) : selectedCourseForWorkload ? (
            <div className="card-content">
              <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <CircularProgress />
              </Box>
            </div>
          ) : (
            <div className="card-content">
              <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                Select a course from the dropdown to analyze student workload
              </Typography>
            </div>
          )}
        </div>
      </Box>


      </Box>
    </DashboardLayout>
  );
};

export default CourseWorkloadOverview;
