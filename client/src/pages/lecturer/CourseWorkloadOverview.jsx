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

  // Debug: Monitor allHomework state changes
  useEffect(() => {
    console.log('allHomework state changed:', allHomework.length, 'items');
    console.log('allHomework details:', allHomework.map(hw => ({
      id: hw._id,
      title: hw.title,
      uploader_role: hw.uploader_role
    })));
  }, [allHomework]);

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
        
        // Debug: Check homework by uploader role
        const lecturerCreatedHomework = lecturerHomework.filter(hw => hw.uploader_role === 'lecturer');
        const studentCreatedHomework = lecturerHomework.filter(hw => hw.uploader_role === 'student');
        console.log('Lecturer-created homework count:', lecturerCreatedHomework.length);
        console.log('Student-created homework count:', studentCreatedHomework.length);
        console.log('Lecturer-created homework:', lecturerCreatedHomework.map(hw => ({ id: hw._id, title: hw.title })));
        console.log('Student-created homework:', studentCreatedHomework.map(hw => ({ id: hw._id, title: hw.title, deadline_status: hw.deadline_verification_status })));
        
        // Debug: Check courses data structure
        console.log('Courses data:', courses.map(c => ({
          id: c._id,
          name: c.course_name,
          id_type: typeof c._id,
          id_string: c._id ? c._id.toString() : 'null'
        })));
        
        // Debug: Check if homework is being filtered out somewhere
        console.log('=== DETAILED HOMEWORK ANALYSIS ===');
        lecturerHomework.forEach((hw, index) => {
          console.log(`Homework ${index + 1}:`, {
            id: hw._id,
            title: hw.title,
            uploader_role: hw.uploader_role,
            uploaded_by: hw.uploaded_by,
            course_id: hw.course_id,
            course: hw.course,
            completion_status: hw.completion_status,
            deadline_verification_status: hw.deadline_verification_status,
            claimed_deadline: hw.claimed_deadline
          });
        });
        console.log('================================');
        
        console.log('Setting allHomework state with:', lecturerHomework.length, 'items');
        setAllHomework(lecturerHomework);
        
        // Debug: Verify state was set correctly
        setTimeout(() => {
          console.log('State after setAllHomework:', allHomework.length);
        }, 100);
      
      // Debug: Log summary
      console.log('=== WORKLOAD OVERVIEW SUMMARY ===');
      console.log('Lecturer ID:', lecturerId);
      console.log('Active courses count:', lecturerCourses.length);
      console.log('Total homework count:', lecturerHomework.length);
      console.log('Courses:', lecturerCourses.map(c => ({ id: c._id, name: c.course_name, code: c.course_code })));
      console.log('Homework:', lecturerHomework.map(h => ({ id: h._id, title: h.title, course: h.course._id })));
      console.log('================================');

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
      <Typography variant="h4" component="h1" gutterBottom>
        Course Workload Overview
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Visualize student workload across all your courses
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Debug Section */}
      <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
        <Typography variant="h6" gutterBottom>Debug Tools</Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Total homework loaded: <strong>{allHomework.length}</strong> items
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Courses loaded: <strong>{courses.length}</strong> courses
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          First course ID: <strong>{courses[0]?._id}</strong> (type: {typeof courses[0]?._id})
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          First homework course ID: <strong>{allHomework[0]?.course_id}</strong> (type: {typeof allHomework[0]?.course_id})
        </Typography>
        <Box display="flex" gap={2}>
          <Button 
            variant="outlined" 
            onClick={async () => {
              try {
                console.log('Testing server connectivity...');
                const healthResponse = await fetch('http://localhost:5000/api/health');
                console.log('Health check response:', healthResponse.status, healthResponse.statusText);
                
                // Test with API service to check token
                console.log('Testing API service with token...');
                try {
                  const testResponse = await apiService.user.getProfile();
                  console.log('API test successful:', testResponse);
                } catch (apiError) {
                  console.error('API test failed:', apiError);
                  console.error('API error details:', {
                    message: apiError.message,
                    status: apiError.response?.status,
                    data: apiError.response?.data
                  });
                }
                
                const response = await apiService.testData.getStatus();
                console.log('=== DEBUG STATUS ===');
                console.log('User:', response.data.user);
                console.log('Courses:', response.data.courses);
                console.log('Homework:', response.data.homework);
                console.log('==================');
                
                // Also test the specific homework endpoints
                try {
                  console.log('Testing lecturer-homework endpoint...');
                  const lecturerHomeworkResponse = await apiService.studentHomework.getLecturerHomework();
                  console.log('Lecturer homework response:', lecturerHomeworkResponse);
                  console.log('Lecturer homework data:', lecturerHomeworkResponse.data);
                } catch (homeworkError) {
                  console.error('Lecturer homework endpoint failed:', homeworkError);
                }
                
                try {
                  console.log('Testing student-homework endpoint (should fail for lecturer)...');
                  const studentHomeworkResponse = await apiService.studentHomework.getHomework();
                  console.log('Student homework response:', studentHomeworkResponse);
                } catch (homeworkError) {
                  console.log('Student homework endpoint failed as expected for lecturer:', homeworkError.message);
                }
                
                // Show detailed homework info
                if (response.data.homework.list && response.data.homework.list.length > 0) {
                  const homework = response.data.homework.list[0];
                  console.log('=== FIRST HOMEWORK DETAILS ===');
                  console.log('Homework ID:', homework._id);
                  console.log('Title:', homework.title);
                  console.log('Course ID:', homework.course);
                  console.log('Uploaded by:', homework.uploaded_by);
                  console.log('Uploader role:', homework.uploader_role);
                  console.log('Deadline status:', homework.deadline_status);
                  console.log('Grade status:', homework.grade_status);
                  console.log('Completion status:', homework.completion_status);
                  console.log('=============================');
                }
                
                alert(`Found ${response.data.courses.total} courses and ${response.data.homework.total} homework items. Check console for details.`);
              } catch (err) {
                console.error('Debug error:', err);
                console.error('Error details:', {
                  message: err.message,
                  code: err.code,
                  response: err.response?.data,
                  status: err.response?.status
                });
                alert(`Debug failed: ${err.message}\n\nCheck console for detailed error information.`);
              }
            }}
          >
            Check Data Status
          </Button>
          <Button 
            variant="outlined" 
            onClick={async () => {
              try {
                const response = await apiService.testData.createSample();
                console.log('Sample created:', response.data);
                alert('Sample homework created! Refresh the page to see it.');
                fetchData(); // Refresh data
              } catch (err) {
                console.error('Create sample error:', err);
                alert('Create sample failed: ' + err.message);
              }
            }}
          >
            Create Sample Data
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => {
              console.log('=== MANUAL FILTERING TEST ===');
              if (courses.length > 0 && allHomework.length > 0) {
                const testCourse = courses[0];
                const testCourseIdStr = testCourse._id.toString();
                console.log('Test course:', testCourse.course_name, 'ID:', testCourseIdStr);
                
                const matchingHomework = allHomework.filter(hw => {
                  const hwCourseId = hw.course_id || (hw.course && hw.course._id);
                  const hwCourseIdStr = hwCourseId ? hwCourseId.toString() : null;
                  const match = hwCourseIdStr === testCourseIdStr;
                  console.log(`Homework "${hw.title}": course_id=${hwCourseIdStr}, match=${match}`);
                  return match;
                });
                
                console.log(`Found ${matchingHomework.length} matching homework for ${testCourse.course_name}`);
                console.log('Matching homework:', matchingHomework.map(hw => hw.title));
                alert(`Found ${matchingHomework.length} matching homework for ${testCourse.course_name}. Check console for details.`);
              } else {
                console.log('No courses or homework available for testing');
                alert('No courses or homework available for testing');
              }
            }}
          >
            Test Filtering
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => {
              console.log('=== TEST FILTERING FOR COMPUTER GRAPHICS ===');
              // Find Computer Graphics course (which has homework)
              const computerGraphicsCourse = courses.find(c => c.course_name === 'Computer Graphics');
              if (computerGraphicsCourse && allHomework.length > 0) {
                const courseIdStr = computerGraphicsCourse._id.toString();
                console.log('Computer Graphics course ID:', courseIdStr);
                
                const matchingHomework = allHomework.filter(hw => {
                  const hwCourseId = hw.course_id || (hw.course && hw.course._id);
                  const hwCourseIdStr = hwCourseId ? hwCourseId.toString() : null;
                  const match = hwCourseIdStr === courseIdStr;
                  console.log(`Homework "${hw.title}": course_id=${hwCourseIdStr}, match=${match}`);
                  return match;
                });
                
                console.log(`Found ${matchingHomework.length} matching homework for Computer Graphics`);
                console.log('Matching homework:', matchingHomework.map(hw => hw.title));
                alert(`Found ${matchingHomework.length} matching homework for Computer Graphics. Check console for details.`);
              } else {
                console.log('Computer Graphics course not found or no homework available');
                alert('Computer Graphics course not found or no homework available');
              }
            }}
          >
            Test Computer Graphics
          </Button>
        </Box>
      </Box>

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
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <SchoolIcon color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4">{courses?.length || 0}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Courses
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
                <AssignmentIcon color="secondary" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4">{allHomework?.length || 0}</Typography>
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
                <ScheduleIcon color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4">
                    {workloadData?.reduce((sum, course) => sum + (course?.upcomingDeadlines || 0), 0) || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Upcoming Deadlines
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
                <WarningIcon color="error" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4">
                    {workloadData?.reduce((sum, course) => sum + (course?.overdue || 0), 0) || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Overdue Assignments
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Course Workload Comparison */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
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
                    <Bar dataKey="totalHomework" fill="#8884d8" name="Total Assignments" />
                    <Bar dataKey="upcomingDeadlines" fill="#82ca9d" name="Upcoming Deadlines" />
                    <Bar dataKey="overdue" fill="#ff7300" name="Overdue" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Timeline */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
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
                    <Line type="monotone" dataKey="assignments" stroke="#8884d8" name="Assignments Due" strokeWidth={3} />
                    <Line type="monotone" dataKey="courses" stroke="#82ca9d" name="Courses Affected" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Detailed Course Breakdown */}
      <Typography variant="h5" gutterBottom>
        Detailed Course Breakdown
      </Typography>
      
      <Grid container spacing={3}>
        {workloadData.map((course) => (
          <Grid item xs={12} md={6} lg={4} key={course.courseId}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {course.courseName}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {course.courseCode}
                </Typography>

                <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                  <Chip
                    label={`${course.totalHomework} Total`}
                    color="primary"
                    size="small"
                  />
                  <Chip
                    label={`${course.upcomingDeadlines} Upcoming`}
                    color="warning"
                    size="small"
                  />
                  {course.overdue > 0 && (
                    <Chip
                      label={`${course.overdue} Overdue`}
                      color="error"
                      size="small"
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
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      </Box>
    </DashboardLayout>
  );
};

export default CourseWorkloadOverview;
