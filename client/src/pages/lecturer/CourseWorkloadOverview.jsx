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
      
      // Fetch courses taught by this lecturer
      console.log('Fetching courses for lecturer...');
      let lecturerCourses = [];
      
      try {
        const coursesResponse = await apiService.courses.getByLecturer(lecturerId);
        console.log('Courses response:', coursesResponse);
        
        if (coursesResponse && coursesResponse.data) {
          lecturerCourses = coursesResponse.data.filter(course => course.is_active);
        } else if (Array.isArray(coursesResponse)) {
          // Handle case where response is directly an array
          lecturerCourses = coursesResponse.filter(course => course.is_active);
        } else {
          throw new Error('Invalid courses response format');
        }
      } catch (coursesError) {
        console.warn('Error with getByLecturer, trying getAll approach:', coursesError);
        // Fallback: get all courses and filter by lecturer
        const allCoursesResponse = await apiService.courses.getAll();
        console.log('All courses response:', allCoursesResponse);
        
        if (allCoursesResponse && allCoursesResponse.data) {
          lecturerCourses = allCoursesResponse.data.filter(course => 
            course.is_active && course.lecturer_id === lecturerId
          );
        }
      }
        console.log('Active courses:', lecturerCourses);
        console.log('Course details:', lecturerCourses.map(c => ({
          id: c._id,
          name: c.course_name,
          code: c.course_code,
          lecturer_id: c.lecturer_id
        })));
        setCourses(lecturerCourses);

      if (lecturerCourses.length === 0) {
        console.log('No active courses found for lecturer');
        setAllHomework([]);
        return;
      }

        // Fetch all homework for these courses
        console.log('Fetching homework data...');
        console.log('About to fetch homework for courses:', lecturerCourses.map(c => ({ id: c._id, name: c.course_name })));
        
        // Use the new lecturer-specific endpoint
        console.log('Fetching homework for lecturer...');
        let lecturerHomeworkResponse;
        try {
          lecturerHomeworkResponse = await apiService.studentHomework.getLecturerHomework();
          console.log('Lecturer homework response:', lecturerHomeworkResponse);
          console.log('Lecturer homework data structure:', lecturerHomeworkResponse.data);
          console.log('Lecturer homework array:', lecturerHomeworkResponse.data?.homework);
        } catch (err) {
          console.error('Error fetching lecturer homework:', err);
          lecturerHomeworkResponse = { data: { homework: [] } };
        }
        
        const lecturerHomework = lecturerHomeworkResponse.data?.homework || [];
        console.log('Total homework found for lecturer:', lecturerHomework.length);
        console.log('Lecturer homework details:', lecturerHomework.map(hw => ({
          id: hw._id,
          title: hw.title,
          course_id: hw.course_id,
          course: hw.course,
          uploaded_by: hw.uploaded_by,
          uploader_role: hw.uploader_role,
          completion_status: hw.completion_status,
          claimed_deadline: hw.claimed_deadline,
          deadline_verification_status: hw.deadline_verification_status,
          grade_verification_status: hw.grade_verification_status
        })));
        
        const lecturerCreatedHomework = lecturerHomework.filter(hw => hw.uploader_role === 'lecturer');
        const studentCreatedHomework = lecturerHomework.filter(hw => hw.uploader_role === 'student');
        
        
        setAllHomework(lecturerHomework);

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
          // Use the same string conversion logic as in the accordion
          const hwCourseId = hw.course_id || (hw.course && hw.course._id);
          const hwCourseIdStr = hwCourseId ? hwCourseId.toString() : null;
          const courseIdStr = course._id ? course._id.toString() : null;
          const matches = hwCourseIdStr === courseIdStr;
          console.log(`Homework "${hw?.title}" matches course "${course.course_name}": ${matches}`);
          console.log(`  - Homework course_id: ${hw?.course_id}, course._id: ${hw?.course?._id}`);
          console.log(`  - Target course._id: ${course._id}`);
          console.log(`  - hwCourseIdStr: ${hwCourseIdStr}, courseIdStr: ${courseIdStr}`);
          console.log(`  - Match result: ${matches}`);
          return matches;
        });
        
        console.log(`Course ${course.course_name}: ${courseHomework.length} homework items`);
        console.log(`Course homework:`, courseHomework.map(hw => ({ 
          id: hw._id, 
          title: hw.title, 
          uploader_role: hw.uploader_role,
          completion_status: hw.completion_status 
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
          if (!deadlineDate) return false;
          const deadline = new Date(deadlineDate);
          return deadline >= now && deadline <= endDate;
        }).length;

        // Count overdue assignments
        const overdue = courseHomework.filter(hw => {
          if (!hw) return false;
          const deadlineDate = hw.claimed_deadline || hw.due_date;
          if (!deadlineDate) return false;
          const deadline = new Date(deadlineDate);
          return deadline < now && hw.completion_status !== 'completed';
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
    console.log('allHomework details:', allHomework.map(hw => ({
      id: hw._id,
      title: hw.title,
      uploader_role: hw.uploader_role,
      completion_status: hw.completion_status
    })));
    
    workloadData = getWorkloadData();
    timelineData = getTimelineData();
    
    console.log('Processed data:', {
      workloadData: workloadData.length,
      timelineData: timelineData.length
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
        Visualize student workload across all your courses
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

      {/* Detailed Course Breakdown */}
      <Typography variant="h5" gutterBottom>
        Detailed Course Breakdown
      </Typography>
      
      <Grid container spacing={3}>
        {workloadData.map((course) => (
          <Grid item xs={12} md={6} lg={4} key={course.courseId}>
            <div className="dashboard-card">
              <div className="card-content">
                <Typography variant="h6" gutterBottom>
                  {course.courseName}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {course.courseCode}
                </Typography>

                <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                  <Chip
                    label={`${course.totalHomework} Total`}
                    size="small"
                    sx={{ 
                      backgroundColor: 'rgba(149, 225, 211, 0.3)', 
                      color: '#333',
                      border: '1px solid #95E1D3'
                    }}
                  />
                  <Chip
                    label={`${course.upcomingDeadlines} Upcoming`}
                    size="small"
                    sx={{ 
                      backgroundColor: 'rgba(214, 247, 173, 0.3)', 
                      color: '#333',
                      border: '1px solid #D6F7AD'
                    }}
                  />
                  {course.overdue > 0 && (
                    <Chip
                      label={`${course.overdue} Overdue`}
                      size="small"
                      sx={{ 
                        backgroundColor: 'rgba(243, 129, 129, 0.3)', 
                        color: '#333',
                        border: '1px solid #F38181'
                      }}
                    />
                  )}
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Status Breakdown:
                </Typography>
                <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                  {Object.entries(course.statusCounts).map(([status, count]) => (
                    <Chip
                      key={status}
                      label={`${status.replace('_', ' ')}: ${count}`}
                      color={getStatusColor(status)}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>

                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="body2">View Assignments</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      {(() => {
                        const courseHomework = allHomework.filter(hw => {
                          // Check both course_id and course._id for compatibility
                          const hwCourseId = hw.course_id || (hw.course && hw.course._id);
                          // Convert both to strings for comparison to handle ObjectId vs string issues
                          const hwCourseIdStr = hwCourseId ? hwCourseId.toString() : null;
                          const courseIdStr = course.courseId ? course.courseId.toString() : null;
                          return hwCourseIdStr === courseIdStr;
                        });
                        console.log(`Course ${course.courseName} (${course.courseId}) homework:`, courseHomework.length, 'items');
                        console.log('Course homework details:', courseHomework.map(hw => ({
                          id: hw._id,
                          title: hw.title,
                          course_id: hw.course_id,
                          course: hw.course,
                          claimed_deadline: hw.claimed_deadline,
                          due_date: hw.due_date,
                          completion_status: hw.completion_status,
                          status: hw.status
                        })));
                        console.log('All homework for comparison:', allHomework.map(hw => {
                          const hwCourseId = hw.course_id || (hw.course && hw.course._id);
                          const hwCourseIdStr = hwCourseId ? hwCourseId.toString() : null;
                          const courseIdStr = course.courseId ? course.courseId.toString() : null;
                          return {
                            id: hw._id,
                            title: hw.title,
                            course_id: hw.course_id,
                            course: hw.course,
                            hwCourseIdStr: hwCourseIdStr,
                            courseIdStr: courseIdStr,
                            course_match: hwCourseIdStr === courseIdStr
                          };
                        }));
                        if (courseHomework.length === 0) {
                          return (
                            <ListItem sx={{ px: 0 }}>
                              <ListItemText
                                primary="No homework assignments found"
                                primaryTypographyProps={{ variant: 'caption', color: 'text.secondary', fontStyle: 'italic' }}
                              />
                            </ListItem>
                          );
                        }
                        
                        return courseHomework.slice(0, 5).map((hw) => (
                          <ListItem key={hw._id} sx={{ px: 0 }}>
                            <ListItemIcon>
                              <ScheduleIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText
                              primary={hw.title}
                              secondary={
                                <Box>
                                  <Typography variant="caption" display="block">
                                    Due: {new Date(hw.claimed_deadline || hw.due_date).toLocaleDateString()}
                                  </Typography>
                                  <Box display="flex" gap={0.5} mt={0.5}>
                                    <Chip
                                      label={hw.completion_status || hw.status || 'Unknown'}
                                      color={getStatusColor(hw.completion_status || hw.status)}
                                      size="small"
                                    />
                                  </Box>
                                </Box>
                              }
                            />
                          </ListItem>
                        ));
                      })()}
                      {(() => {
                        const courseHomework = allHomework.filter(hw => {
                          // Check both course_id and course._id for compatibility
                          const hwCourseId = hw.course_id || (hw.course && hw.course._id);
                          // Convert both to strings for comparison to handle ObjectId vs string issues
                          const hwCourseIdStr = hwCourseId ? hwCourseId.toString() : null;
                          const courseIdStr = course.courseId ? course.courseId.toString() : null;
                          return hwCourseIdStr === courseIdStr;
                        });
                        return courseHomework.length > 5;
                      })() && (
                        <ListItem sx={{ px: 0 }}>
                          <ListItemText
                            primary={`... and ${(() => {
                              const courseHomework = allHomework.filter(hw => {
                                const hwCourseId = hw.course_id || (hw.course && hw.course._id);
                                // Convert both to strings for comparison to handle ObjectId vs string issues
                          const hwCourseIdStr = hwCourseId ? hwCourseId.toString() : null;
                          const courseIdStr = course.courseId ? course.courseId.toString() : null;
                          return hwCourseIdStr === courseIdStr;
                              });
                              return courseHomework.length - 5;
                            })()} more assignments`}
                            primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                          />
                        </ListItem>
                      )}
                    </List>
                  </AccordionDetails>
                </Accordion>
              </div>
            </div>
          </Grid>
        ))}
      </Grid>
      </Box>
    </DashboardLayout>
  );
};

export default CourseWorkloadOverview;
