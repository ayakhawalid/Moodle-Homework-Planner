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
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Checkbox,
  FormControlLabel
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

const ROWS_PER_PAGE = 10;

// Format ISO date (YYYY-MM-DD) for display as DD.MM.YYYY (e.g. 2026-10-02 → 02.10.2026)
const formatDeadlineDisplay = (isoStr) => {
  if (!isoStr) return '';
  const d = new Date(isoStr + 'T12:00:00');
  if (isNaN(d.getTime())) return isoStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
};

const CourseWorkloadOverview = () => {
  const { isAuthenticated } = useAuth0();
  const [courses, setCourses] = useState([]);
  const [allHomework, setAllHomework] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('30'); // days
  const [selectedCourseForTimeline, setSelectedCourseForTimeline] = useState(''); // filter Assignment Timeline by course
  const [selectedCourseForWorkload, setSelectedCourseForWorkload] = useState('');
  const [studentWorkloadData, setStudentWorkloadData] = useState(null);
  const [lecturerCourses, setLecturerCourses] = useState([]);
  const [homeworkStatusData, setHomeworkStatusData] = useState(null);
  const [timelineTableRows, setTimelineTableRows] = useState([]);
  const [timelineTableLoading, setTimelineTableLoading] = useState(false);
  const [selectedTableColumn, setSelectedTableColumn] = useState(null); // 'student' | 'course' | 'deadline'
  const [selectedTableValue, setSelectedTableValue] = useState(null); // { type, id/date, label }
  const [tablePage, setTablePage] = useState(0);
  const [timelineTableMyCoursesOnly, setTimelineTableMyCoursesOnly] = useState(false);

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
      
      // Fetch lecturer's own courses only (for Student Workload dropdown).
      // Four statuses, assignment distribution, and timeline use ALL courses from getAllHomework().
      console.log('Fetching lecturer courses for dropdown...');
      let myCourses = [];
      try {
        const allCoursesResponse = await apiService.courses.getAll();
        if (allCoursesResponse && allCoursesResponse.data) {
          myCourses = allCoursesResponse.data.filter(course => course.is_active);
        } else if (Array.isArray(allCoursesResponse)) {
          myCourses = allCoursesResponse.filter(course => course.is_active);
        }
      } catch (coursesError) {
        console.error('Error fetching lecturer courses:', coursesError);
      }
      // Backend already returns only this lecturer's courses when role is lecturer
      setLecturerCourses(myCourses);
      console.log('Lecturer courses for dropdown:', myCourses.length);


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

  // Fetch assignment timeline table (student, course, deadline rows) - always all courses; timeline filter is only for the graph above
  useEffect(() => {
    const fetchTable = async () => {
      setTimelineTableLoading(true);
      try {
        const res = await apiService.lecturerDashboard.getAssignmentTimelineTable();
        setTimelineTableRows(res.data.rows || []);
      } catch (err) {
        console.error('Error fetching assignment timeline table:', err);
        setTimelineTableRows([]);
      } finally {
        setTimelineTableLoading(false);
      }
    };
    if (isAuthenticated) fetchTable();
  }, [isAuthenticated]);

  // Table data for overview/detail (replaces D3 graphs)
  const countUniqueHomework = (arr) => new Set((arr || []).map(r => String(r.homework_id))).size;
  const lecturerCourseIds = new Set((lecturerCourses || []).map(c => String(c._id)));
  const timelineTableRowsFiltered = timelineTableMyCoursesOnly
    ? (timelineTableRows || []).filter(r => lecturerCourseIds.has(String(r.course_id)))
    : (timelineTableRows || []);
  const getTimelineTableData = () => {
    const rows = timelineTableRowsFiltered;
    if (rows.length === 0 || (!selectedTableColumn && !selectedTableValue)) return { kind: null, columns: [], rows: [] };
    if (selectedTableValue?.type === 'course') return { kind: 'course', columns: [], rows: [] }; // course uses the two tables above

    if (selectedTableValue?.type === 'student') {
      const studentRows = rows.filter(r => String(r.student_id) === String(selectedTableValue.id));
      const byCourse = new Map();
      studentRows.forEach(r => {
        const k = r.course_name || r.course_code || '';
        if (!byCourse.has(k)) byCourse.set(k, []);
        byCourse.get(k).push(r);
      });
      const tableRows = Array.from(byCourse.entries()).map(([name, arr]) => ({ name, count: countUniqueHomework(arr) })).sort((a, b) => (b.count - a.count));
      return { kind: 'detailCourse', columns: ['Course', 'Assignment count'], rows: tableRows };
    }
    if (selectedTableValue?.type === 'deadline') {
      const dateRows = rows.filter(r => r.deadline_str === selectedTableValue.date);
      const byCourse = new Map();
      dateRows.forEach(r => {
        const k = r.course_name || r.course_code || '';
        if (!byCourse.has(k)) byCourse.set(k, []);
        byCourse.get(k).push(r);
      });
      const tableRows = Array.from(byCourse.entries()).map(([name, arr]) => ({ name, count: countUniqueHomework(arr) })).sort((a, b) => (b.count - a.count));
      return { kind: 'detailCourse', columns: ['Course', 'Assignment count'], rows: tableRows };
    }

    if (selectedTableColumn === 'student') {
      const byStudent = new Map();
      rows.forEach(r => {
        const k = String(r.student_display_id || r.student_id);
        if (!byStudent.has(k)) byStudent.set(k, { name: r.student_name, id: k, rows: [] });
        byStudent.get(k).rows.push(r);
      });
      const tableRows = Array.from(byStudent.entries())
        .map(([id, v]) => {
          const displayId = v.rows[0]?.student_display_id;
          const hasDisplayId = displayId != null && String(displayId).trim() !== '';
          return { studentName: v.name, studentId: id, studentDisplayId: hasDisplayId ? String(displayId) : '', count: v.rows.length };
        })
        .sort((a, b) => b.count - a.count);
      return { kind: 'overviewStudent', columns: ['Student', 'Student ID', 'Assignment count'], rows: tableRows };
    }
    if (selectedTableColumn === 'course') {
      const byCourse = new Map();
      rows.forEach(r => {
        const k = String(r.course_id || '');
        if (!k) return;
        if (!byCourse.has(k)) byCourse.set(k, []);
        byCourse.get(k).push(r);
      });
      const tableRows = Array.from(byCourse.entries()).map(([courseId, arr]) => {
        const first = arr[0];
        const name = first?.course_name && first?.course_code ? `${first.course_name} (${first.course_code})` : (first?.course_name || first?.course_code || courseId);
        return { name, count: countUniqueHomework(arr), courseId, label: name };
      }).sort((a, b) => (b.count - a.count));
      return { kind: 'overviewCourse', columns: ['Course', 'Assignment count'], rows: tableRows };
    }
    if (selectedTableColumn === 'deadline') {
      const byDate = new Map();
      rows.forEach(r => {
        const k = r.deadline_str || '';
        if (!byDate.has(k)) byDate.set(k, []);
        byDate.get(k).push(r);
      });
      const tableRows = Array.from(byDate.entries()).map(([date, arr]) => ({ date, count: countUniqueHomework(arr) })).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      return { kind: 'overviewDeadline', columns: ['Due date', 'Assignment count'], rows: tableRows };
    }
    return { kind: null, columns: [], rows: [] };
  };
  const timelineTableData = getTimelineTableData();



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

      // Helper to consistently extract course ID from homework item (handles populated objects)
      const extractHomeworkCourseId = (hw) => {
        if (!hw) return null;
        // Prefer nested _id when course_id is populated
        if (hw.course_id && typeof hw.course_id === 'object') {
          return hw.course_id._id || null;
        }
        // Fallbacks
        return hw.course_id || (hw.course && hw.course._id) || null;
      };

      // Group homework by course
      const courseWorkloads = courses.map(course => {
        console.log(`\n--- Processing Course: ${course.course_name} (${course._id}) ---`);
        console.log('All homework to check:', allHomework.map(hw => ({
          id: hw._id,
          title: hw.title,
          course_id: hw.course_id,
          course: hw.course,
          extracted_course_id: extractHomeworkCourseId(hw),
          course_match: (() => {
            const hwCourseId = extractHomeworkCourseId(hw);
            return hwCourseId && course._id && hwCourseId.toString() === course._id.toString();
          })()
        })));
        
        const courseHomework = allHomework.filter(hw => {
          const hwCourseId = extractHomeworkCourseId(hw);
          if (!hwCourseId || !course._id) return false;
          return hwCourseId.toString() === course._id.toString();
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

        // Unique label for chart so different courses with same code don't look like one (code + name)
        const chartLabel = `${course.course_code} - ${course.course_name}`;

        return {
          courseId: course._id,
          courseName: course.course_name,
          courseCode: abbreviatedCode,
          chartLabel,
          fullCourseCode: course.course_code, // Keep full code for tooltip
          totalHomework: courseHomework.length,
          upcomingDeadlines,
          overdue,
          statusCounts,
          homework: courseHomework
        };
      });

      // Ensure chart labels are unique (same code + name = add suffix so each bar is distinct)
      const labelCounts = {};
      courseWorkloads.forEach((row, index) => {
        const key = row.chartLabel;
        labelCounts[key] = (labelCounts[key] || 0) + 1;
        if (labelCounts[key] > 1) {
          row.chartLabel = `${row.chartLabel} (${labelCounts[key]})`;
        }
      });

      return courseWorkloads;
    } catch (error) {
      console.error('Error in getWorkloadData:', error);
      return [];
    }
  };

  const extractHomeworkCourseId = (hw) => {
    if (!hw) return null;
    if (hw.course_id && typeof hw.course_id === 'object') return hw.course_id._id || null;
    return hw.course_id || (hw.course && hw.course._id) || null;
  };

  const COURSE_LINE_COLORS = ['#0D9488', '#15803D', '#B45309', '#B91C1C', '#0E7490', '#047857', '#BE123C', '#1D4ED8', '#6D28D9', '#9D174D'];

  const getTimelineData = () => {
    try {
      const now = new Date();
      const timeframeDays = parseInt(selectedTimeframe);
      const courseFilter = selectedCourseForTimeline || null;

      const dayHomeworkFilter = (hw) => {
        if (!hw) return false;
        const deadlineDate = hw.claimed_deadline || hw.due_date;
        if (!deadlineDate) return false;
        if (courseFilter) {
          const cid = extractHomeworkCourseId(hw);
          if (!cid || cid.toString() !== courseFilter) return false;
        }
        return true;
      };

      const filteredHomework = allHomework.filter(dayHomeworkFilter);
      const courseIdsInRange = [...new Set(filteredHomework.map(hw => {
        const id = extractHomeworkCourseId(hw);
        return id && id.toString ? id.toString() : id;
      }).filter(Boolean))];
      const courseIdToInfo = new Map();
      courses.forEach(c => {
        const id = c._id && c._id.toString ? c._id.toString() : c._id;
        if (id) courseIdToInfo.set(id, { name: c.course_name, code: c.course_code });
      });
      const orderedCourseIds = courseIdsInRange.filter(id => courseIdToInfo.has(id));
      orderedCourseIds.sort((a, b) => (courseIdToInfo.get(a)?.code || a).localeCompare(courseIdToInfo.get(b)?.code || b));

      // Total per day is always across ALL courses (ignores course filter)
      const allHomeworkWithDeadline = allHomework.filter(hw => hw && (hw.claimed_deadline || hw.due_date));
      const timelineData = [];
      for (let i = 0; i < timeframeDays; i++) {
        const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const dayHomework = filteredHomework.filter(hw => {
          const deadline = new Date(hw.claimed_deadline || hw.due_date);
          return deadline.toISOString().split('T')[0] === dateStr;
        });
        const total = allHomeworkWithDeadline.filter(hw => {
          const deadline = new Date(hw.claimed_deadline || hw.due_date);
          return deadline.toISOString().split('T')[0] === dateStr;
        }).length;
        const byCourse = {};
        orderedCourseIds.forEach(cid => { byCourse[cid] = 0; });
        dayHomework.forEach(hw => {
          const cid = extractHomeworkCourseId(hw);
          const key = cid && cid.toString ? cid.toString() : cid;
          if (key && byCourse[key] !== undefined) byCourse[key]++;
        });
        timelineData.push({
          date: dateStr,
          day: date.getDate(),
          month: date.getMonth() + 1,
          total,
          ...byCourse
        });
      }

      return { timelineData, timelineCourseIds: orderedCourseIds, courseIdToInfo };
    } catch (error) {
      console.error('Error in getTimelineData:', error);
      return { timelineData: [], timelineCourseIds: [], courseIdToInfo: new Map() };
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
  let timelineCourseIds = [];
  let courseIdToInfo = new Map();
  
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
    const timelineResult = getTimelineData();
    timelineData = timelineResult.timelineData;
    timelineCourseIds = timelineResult.timelineCourseIds || [];
    courseIdToInfo = timelineResult.courseIdToInfo || new Map();
    
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
      <div className="white-page-background">
      <Box sx={{ p: 3 }}>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}


      {/* Range + Summary Cards - same card design */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <div className="dashboard-card">
            <div className="card-content">
              <Box display="flex" alignItems="center">
                <ScheduleIcon sx={{ mr: 2, color: '#666' }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <FormControl variant="standard" sx={{ minWidth: 120 }} fullWidth>
                    <Select
                      value={selectedTimeframe}
                      onChange={(e) => setSelectedTimeframe(e.target.value)}
                      disableUnderline
                      sx={{
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        color: '#666',
                        py: 0,
                        '& .MuiSelect-select': { py: 0 }
                      }}
                    >
                      <MenuItem value="7">Next 7 days</MenuItem>
                      <MenuItem value="14">Next 14 days</MenuItem>
                      <MenuItem value="30">Next 30 days</MenuItem>
                      <MenuItem value="60">Next 60 days</MenuItem>
                    </Select>
                  </FormControl>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    Range
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
                <SchoolIcon sx={{ mr: 2, color: '#95E1D3' }} />
                <Box>
                  <Typography variant="h5" sx={{ fontSize: '1.1rem', fontWeight: 700 }}>{courses?.length || 0}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
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
                  <Typography variant="h5" sx={{ fontSize: '1.1rem', fontWeight: 700 }}>{allHomework?.length || 0}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
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
                  <Typography variant="h5" sx={{ fontSize: '1.1rem', fontWeight: 700 }}>
                    {workloadData?.reduce((sum, course) => sum + (course?.upcomingDeadlines || 0), 0) || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
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
                  <Typography variant="h5" sx={{ fontSize: '1.1rem', fontWeight: 700 }}>
                    {workloadData?.reduce((sum, course) => sum + (course?.overdue || 0), 0) || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    Overdue Assignments
                  </Typography>
                </Box>
              </Box>
            </div>
          </div>
        </Grid>
      </Grid>

      {/* Charts - same container structure as Student Workload Analysis for consistent width */}
      <Box sx={{ mb: 4 }}>
        {/* Assignment Distribution by Course */}
        <Box sx={{ mb: 3 }}>
          <div className="dashboard-card">
            <div className="card-content">
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ fontSize: '0.95rem' }}>
                Assignment Distribution by Course
                {workloadData.length > 8 && (
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    Scroll horizontally to see all courses
                  </Typography>
                )}
              </Typography>
              <Box sx={{ overflowX: 'auto', overflowY: 'hidden' }}>
                <ResponsiveContainer 
                  width={workloadData.length > 8 ? workloadData.length * 56 : '100%'} 
                  height={Math.max(340, workloadData.length * 22 + 120)}
                >
                  <BarChart 
                    data={workloadData && workloadData.length > 0 ? workloadData : []}
                    margin={{ top: 16, right: 24, left: 16, bottom: 50 }}
                    barCategoryGap={8}
                    barGap={4}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="chartLabel" 
                      angle={-45}
                      textAnchor="end"
                      height={64}
                      interval={0}
                      fontSize={10}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis
                      width={32}
                      tick={{ fontSize: 10 }}
                      domain={[0, Math.max(2, ...(workloadData || []).flatMap((d) => [d.totalHomework || 0, d.upcomingDeadlines || 0, d.overdue || 0]))]}
                    />
                    <Tooltip 
                      formatter={(value, name) => [value, name]}
                      labelFormatter={(label, payload) => {
                        if (payload && payload.length > 0) {
                          const data = payload[0].payload;
                          return data.chartLabel || `${data.fullCourseCode || data.courseCode} - ${data.courseName}`;
                        }
                        return label;
                      }}
                    />
                    <Bar dataKey="totalHomework" fill="#7DD3C0" name="Total Assignments" barSize={14} />
                    <Bar dataKey="upcomingDeadlines" fill="#C8F299" name="Upcoming Deadlines" barSize={14} />
                    <Bar dataKey="overdue" fill="#E85A6B" name="Overdue" barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2, pt: 1.5, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: 1, backgroundColor: '#7DD3C0' }} />
                  <Typography variant="caption" sx={{ fontSize: '0.75rem', color: '#333' }}>Total Assignments</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: 1, backgroundColor: '#C8F299' }} />
                  <Typography variant="caption" sx={{ fontSize: '0.75rem', color: '#333' }}>Upcoming Deadlines</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: 1, backgroundColor: '#E85A6B' }} />
                  <Typography variant="caption" sx={{ fontSize: '0.75rem', color: '#333' }}>Overdue</Typography>
                </Box>
              </Box>
            </div>
          </div>
        </Box>

        {/* Assignment Timeline */}
        <Box sx={{ mb: 3 }}>
          <div className="dashboard-card">
            <div className="card-content">
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ fontSize: '0.95rem' }}>
                  Assignment Timeline (Next {selectedTimeframe} Days)
                </Typography>
                <FormControl variant="standard" sx={{ minWidth: 200 }} fullWidth>
                  <Select
                    value={selectedCourseForTimeline || ''}
                    onChange={(e) => setSelectedCourseForTimeline(e.target.value || '')}
                    disableUnderline
                    displayEmpty
                    renderValue={(v) => {
                      if (!v) return 'All courses';
                      const c = courses.find((x) => x._id === v);
                      return c ? `${c.course_name} (${c.course_code})` : 'All courses';
                    }}
                    sx={{
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      color: '#666',
                      py: 0,
                      '& .MuiSelect-select': { py: 0 }
                    }}
                  >
                    <MenuItem value="">
                      <em>All courses</em>
                    </MenuItem>
                    {courses.map((c) => (
                      <MenuItem key={c._id} value={c._id}>
                        {c.course_name} ({c.course_code})
                      </MenuItem>
                    ))}
                  </Select>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', display: 'block', mt: 0.5 }}>
                    Filter by course
                  </Typography>
                </FormControl>
              </Box>
              <Box sx={{ overflowX: 'auto', overflowY: 'hidden' }}>
                <ResponsiveContainer 
                  width={timelineData.length > 14 ? timelineData.length * 44 : '100%'} 
                  height={340}
                >
                  <LineChart
                    data={timelineData && timelineData.length > 0 ? timelineData : []}
                    margin={{ top: 16, right: 24, left: 16, bottom: 50 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="day" 
                      angle={-45}
                      textAnchor="end"
                      height={64}
                      interval={0}
                      fontSize={10}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis width={32} tick={{ fontSize: 10 }} />
                    <Tooltip 
                      formatter={(value, name) => [value, name]}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.date ? `Date: ${formatDeadlineDisplay(payload[0].payload.date)}` : `Date: ${label}`}
                    />
                    <Legend />
                    {timelineCourseIds.map((cid, idx) => (
                      <Line
                        key={cid}
                        type="monotone"
                        dataKey={cid}
                        stroke={COURSE_LINE_COLORS[idx % COURSE_LINE_COLORS.length]}
                        name={courseIdToInfo.get(cid) ? `${courseIdToInfo.get(cid).code} (${courseIdToInfo.get(cid).name})` : cid}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                    <Line type="monotone" dataKey="total" stroke="#6b7280" name="Total (Assignments Due)" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </div>
          </div>
        </Box>

        {/* Assignment Timeline Table + D3 Graph */}
        <Box sx={{ mb: 0 }}>
          <div className="dashboard-card">
            <div className="card-content">
              <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                <Typography variant="subtitle1" component="span" fontWeight="bold" sx={{ mr: 1, fontSize: '0.95rem' }}>
                  Assignment Timeline Table — click a column header for overview, or a cell for detail
                </Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={timelineTableMyCoursesOnly}
                      onChange={(e) => {
                        setTimelineTableMyCoursesOnly(e.target.checked);
                        setTablePage(0);
                      }}
                      sx={{ color: '#95E1D3', '&.Mui-checked': { color: '#95E1D3' } }}
                    />
                  }
                  label="My courses only"
                />
              </Box>
              {timelineTableLoading ? (
                <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
              ) : (
                <>
                  <TableContainer component={Paper} sx={{ maxHeight: 360, mb: 2 }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell
                            align="left"
                            sx={{
                              fontWeight: 'bold',
                              backgroundColor: selectedTableColumn === 'student' && !selectedTableValue ? 'rgba(149, 225, 211, 0.4)' : undefined,
                              cursor: 'pointer'
                            }}
                            onClick={() => {
                              setSelectedTableColumn('student');
                              setSelectedTableValue(null);
                              setTablePage(0);
                            }}
                          >
                            Student (Name & ID)
                          </TableCell>
                          <TableCell
                            align="left"
                            sx={{
                              fontWeight: 'bold',
                              backgroundColor: selectedTableColumn === 'course' && !selectedTableValue ? 'rgba(149, 225, 211, 0.4)' : undefined,
                              cursor: 'pointer'
                            }}
                            onClick={() => {
                              setSelectedTableColumn('course');
                              setSelectedTableValue(null);
                              setTablePage(0);
                            }}
                          >
                            Course
                          </TableCell>
                          <TableCell
                            align="left"
                            sx={{
                              fontWeight: 'bold',
                              backgroundColor: selectedTableColumn === 'deadline' && !selectedTableValue ? 'rgba(149, 225, 211, 0.4)' : undefined,
                              cursor: 'pointer'
                            }}
                            onClick={() => {
                              setSelectedTableColumn('deadline');
                              setSelectedTableValue(null);
                              setTablePage(0);
                            }}
                          >
                            Deadline
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {timelineTableRowsFiltered
                          .slice(tablePage * ROWS_PER_PAGE, tablePage * ROWS_PER_PAGE + ROWS_PER_PAGE)
                          .map((row, idx) => (
                            <TableRow key={`${row.student_id}-${row.homework_id}-${idx}`}>
                              <TableCell
                                sx={{
                                  backgroundColor: selectedTableValue?.type === 'student' && String(selectedTableValue?.id) === String(row.student_id) ? 'rgba(214, 247, 173, 0.5)' : undefined,
                                  cursor: 'pointer'
                                }}
                                onClick={() => {
                                  setSelectedTableColumn('student');
                                  setSelectedTableValue({ type: 'student', id: row.student_id, label: row.student_name });
                                  setTablePage(0);
                                }}
                              >
                                {row.student_name}{row.student_display_id != null && String(row.student_display_id).trim() !== '' ? ` (${String(row.student_display_id)})` : ''}
                              </TableCell>
                              <TableCell
                                sx={{
                                  backgroundColor: selectedTableValue?.type === 'course' && String(selectedTableValue?.id) === String(row.course_id) ? 'rgba(214, 247, 173, 0.5)' : undefined,
                                  cursor: 'pointer'
                                }}
                                onClick={() => {
                                  setSelectedTableColumn('course');
                                  setSelectedTableValue({ type: 'course', id: row.course_id, label: `${row.course_name} (${row.course_code})` });
                                  setTablePage(0);
                                }}
                              >
                                {row.course_name} ({row.course_code})
                              </TableCell>
                              <TableCell
                                sx={{
                                  backgroundColor: selectedTableValue?.type === 'deadline' && selectedTableValue?.date === row.deadline_str ? 'rgba(214, 247, 173, 0.5)' : undefined,
                                  cursor: 'pointer'
                                }}
                                onClick={() => {
                                  setSelectedTableColumn('deadline');
                                  setSelectedTableValue({ type: 'deadline', date: row.deadline_str, label: row.deadline_str });
                                  setTablePage(0);
                                }}
                              >
                                {formatDeadlineDisplay(row.deadline_str)} — {row.homework_title}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination
                    component="div"
                    count={timelineTableRowsFiltered.length}
                    page={tablePage}
                    onPageChange={(_, p) => setTablePage(p)}
                    rowsPerPage={ROWS_PER_PAGE}
                    rowsPerPageOptions={[ROWS_PER_PAGE]}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {selectedTableColumn && !selectedTableValue && 'Overview: '}
                    {selectedTableValue && selectedTableValue.type === 'student' && `Student: courses for ${selectedTableValue.label}`}
                    {selectedTableValue && selectedTableValue.type === 'course' && `Course: Students and due dates for ${selectedTableValue.label}`}
                    {selectedTableValue && selectedTableValue.type === 'deadline' && `Deadline: courses on ${formatDeadlineDisplay(selectedTableValue.date)}`}
                  </Typography>
                  {selectedTableValue?.type === 'course' && (
                    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Students in this course</Typography>
                        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 220 }}>
                          <Table size="small" stickyHeader>
                            <TableHead>
                              <TableRow>
                                <TableCell><strong>Student</strong></TableCell>
                                <TableCell><strong>Student ID</strong></TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {(() => {
                                const courseRows = (timelineTableRowsFiltered || []).filter(r => String(r.course_id) === String(selectedTableValue.id));
                                const seen = new Set();
                                return courseRows
                                  .filter(r => { const k = String(r.student_id); if (seen.has(k)) return false; seen.add(k); return true; })
                                  .map((row) => (
                                    <TableRow key={row.student_id}>
                                      <TableCell>{row.student_name}</TableCell>
                                      <TableCell>{row.student_display_id != null && String(row.student_display_id).trim() !== '' ? String(row.student_display_id) : ''}</TableCell>
                                    </TableRow>
                                  ));
                              })()}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Due dates and homework</Typography>
                        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 220 }}>
                          <Table size="small" stickyHeader>
                            <TableHead>
                              <TableRow>
                                <TableCell><strong>Due date</strong></TableCell>
                                <TableCell><strong>Homework</strong></TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {(() => {
                                const courseRows = (timelineTableRowsFiltered || []).filter(r => String(r.course_id) === String(selectedTableValue.id));
                                const seen = new Set();
                                return courseRows
                                  .filter(r => { const k = String(r.homework_id); if (seen.has(k)) return false; seen.add(k); return true; })
                                  .sort((a, b) => (a.deadline_str || '').localeCompare(b.deadline_str || ''))
                                  .map((row) => (
                                    <TableRow key={row.homework_id}>
                                      <TableCell>{formatDeadlineDisplay(row.deadline_str)}</TableCell>
                                      <TableCell>{row.homework_title ?? '—'}</TableCell>
                                    </TableRow>
                                  ));
                              })()}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Box>
                    </Box>
                  )}
                  {timelineTableData.kind && timelineTableData.kind !== 'course' && (
                    <TableContainer component={Paper} variant="outlined" sx={{ mt: 2, maxHeight: 380 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            {timelineTableData.columns.map((col) => (
                              <TableCell key={col}><strong>{col}</strong></TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {timelineTableData.kind === 'overviewStudent' && timelineTableData.rows.map((row, idx) => (
                            <TableRow key={row.studentId + idx}>
                              <TableCell>{row.studentName}</TableCell>
                              <TableCell>{row.studentDisplayId ?? ''}</TableCell>
                              <TableCell>{row.count}</TableCell>
                            </TableRow>
                          ))}
                          {timelineTableData.kind === 'detailCourse' && timelineTableData.rows.map((row, idx) => (
                            <TableRow key={(row.name || '') + idx}>
                              <TableCell>{row.name}</TableCell>
                              <TableCell>{row.count}</TableCell>
                            </TableRow>
                          ))}
                          {timelineTableData.kind === 'overviewCourse' && timelineTableData.rows.map((row, idx) => (
                            <TableRow
                              key={(row.courseId || row.name || '') + idx}
                              hover
                              sx={{ cursor: 'pointer', backgroundColor: selectedTableValue?.type === 'course' && String(selectedTableValue?.id) === String(row.courseId) ? 'rgba(214, 247, 173, 0.5)' : undefined }}
                              onClick={() => {
                                setSelectedTableValue({ type: 'course', id: row.courseId, label: row.label || row.name });
                                setTablePage(0);
                              }}
                            >
                              <TableCell>{row.name}</TableCell>
                              <TableCell>{row.count}</TableCell>
                            </TableRow>
                          ))}
                          {timelineTableData.kind === 'overviewDeadline' && timelineTableData.rows.map((row, idx) => (
                            <TableRow key={(row.date || '') + idx}>
                              <TableCell>{formatDeadlineDisplay(row.date)}</TableCell>
                              <TableCell>{row.count}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </>
              )}
            </div>
          </div>
        </Box>
      </Box>

      {/* Student Course Workload Analysis */}
      <Box sx={{ mb: 4 }}>
        <div className="dashboard-card">
          <div className="card-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <div className="card-icon primary">
                <PersonIcon />
              </div>
              <div style={{ flex: 1 }}>
                <h3 className="card-title" style={{ color: '#666' }}>Student Workload Analysis</h3>
                <p className="card-subtitle" style={{ color: '#666' }}>See what other courses your students are taking</p>
              </div>
            </Box>
            <Box sx={{ mt: 2 }}>
              <FormControl variant="standard" sx={{ minWidth: 260 }} fullWidth>
                <Select
                  value={selectedCourseForWorkload}
                  onChange={(e) => setSelectedCourseForWorkload(e.target.value)}
                  disableUnderline
                  displayEmpty
                  renderValue={(v) => {
                    if (!v) return 'Select a course';
                    const c = lecturerCourses.find((x) => x._id === v);
                    return c ? `${c.course_name} (${c.course_code})` : 'Select a course';
                  }}
                  sx={{
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: '#666',
                    py: 0,
                    '& .MuiSelect-select': { py: 0 }
                  }}
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
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', display: 'block', mt: 0.5 }}>
                  Select Your Course
                </Typography>
              </FormControl>
            </Box>
          </div>
          
          {studentWorkloadData ? (
            <div className="card-content">
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom sx={{ fontSize: '0.85rem' }}>
                  <strong>Course:</strong> {studentWorkloadData.selected_course.course_name} ({studentWorkloadData.selected_course.course_code})
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                  Analyzing workload for {studentWorkloadData.selected_course.student_count} students
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, mb: 1.5 }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ fontSize: '0.95rem' }}>
                Courses Your Students Are Taking
              </Typography>
                <Box sx={{ 
                  backgroundColor: 'rgba(149, 225, 211, 0.3)', 
                  borderRadius: 2, 
                  px: 1.5, 
                  py: 0.75,
                  border: '1px solid rgba(149, 225, 211, 0.5)'
                }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                    Total Students in Selected Course
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#95E1D3', fontWeight: 'bold', textAlign: 'center', fontSize: '0.9rem' }}>
                    {studentWorkloadData.selected_course.student_count}
                  </Typography>
                </Box>
              </Box>
              
              {studentWorkloadData.student_workload.length > 0 ? (
                <>
                  {/* Bar Chart */}
                  <Box sx={{ overflowX: 'auto', mb: 3 }}>
                    <ResponsiveContainer 
                      width={studentWorkloadData.student_workload.length > 6 ? studentWorkloadData.student_workload.length * 70 : '100%'} 
                      height={340}
                    >
                      <BarChart 
                        data={studentWorkloadData.student_workload}
                        margin={{ top: 16, right: 24, left: 16, bottom: 64 }}
                        barCategoryGap={8}
                        barGap={4}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="course_name" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          interval={0}
                          fontSize={10}
                          tick={{ fontSize: 10 }}
                        />
                        <YAxis width={32} tick={{ fontSize: 10 }} />
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
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                        {selectedTimeframe === '7' && (
                          <Bar dataKey="upcoming_week" fill="#95E1D3" name="Due This Week" barSize={12} />
                        )}
                        {selectedTimeframe === '30' && (
                          <Bar dataKey="upcoming_month" fill="#D6F7AD" name="Due This Month" barSize={12} />
                        )}
                        {selectedTimeframe === '60' && (
                          <Bar dataKey="upcoming_quarter" fill="#FCE38A" name="Due This Quarter" barSize={12} />
                        )}
                        <Bar dataKey="student_count" fill="#F38181" name="Students Taking This Course" barSize={12} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>

                  {/* Detailed List - one course per row, full width */}
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ fontSize: '0.95rem' }}>
                    Course Details
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {studentWorkloadData.student_workload.map((courseData) => (
                      <Box key={courseData.course_id} sx={{ width: '100%' }}>
                        <Paper sx={{ p: 1.5 }}>
                          <Typography variant="subtitle2" fontWeight="bold" sx={{ fontSize: '0.85rem' }}>
                            {courseData.course_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.7rem' }}>
                            {courseData.course_code}
                          </Typography>
                          {courseData.lecturer && (
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.7rem' }}>
                              Lecturer: {courseData.lecturer.name}
                            </Typography>
                          )}
                          
                          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Chip
                              label={`${courseData.upcoming_week} due this week`}
                              size="small"
                              sx={{
                                backgroundColor: courseData.upcoming_week > 3 ? 'rgba(243, 129, 129, 0.3)' : 'rgba(149, 225, 211, 0.3)',
                                color: '#666666',
                                fontWeight: 'bold'
                              }}
                            />
                            <Chip
                              label={`${courseData.upcoming_month} due this month`}
                              size="small"
                              sx={{
                                backgroundColor: 'rgba(214, 247, 173, 0.3)',
                                color: '#666666',
                                fontWeight: 'bold'
                              }}
                            />
                            {selectedTimeframe === '60' && courseData.upcoming_quarter && (
                              <Chip
                                label={`${courseData.upcoming_quarter} due this quarter`}
                                size="small"
                                sx={{
                                  backgroundColor: 'rgba(252, 227, 138, 0.3)',
                                  color: '#666666',
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
                                <Typography variant="body2" fontWeight="bold" gutterBottom sx={{ fontSize: '0.8rem' }}>
                                  Homework Status Breakdown
                                </Typography>
                                <Box
                                  sx={{
                                    display: 'grid',
                                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                                    gap: 2
                                  }}
                                >
                                {courseStatusData.homework_status.map((homework) => (
                                  <Paper key={homework._id} sx={{ p: 2, height: '100%', minWidth: 0, borderLeft: `4px solid ${homework.homework_type === 'student' ? '#FCE38A' : '#95E1D3'}`, backgroundColor: 'rgba(255, 255, 255, 0.6)' }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                      <Box>
                                        <Typography variant="subtitle2" fontWeight="bold" sx={{ fontSize: '0.85rem' }}>
                                          {homework.title}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.7rem', mt: 0.25 }}>
                                          Due: {formatDeadlineDisplay(new Date(homework.claimed_deadline || homework.due_date).toISOString().split('T')[0])}
                                        </Typography>
                                        <Chip 
                                          label={homework.homework_type === 'student' ? 'Student Created' : 'Lecturer Created'} 
                                          size="small"
                                          sx={{ 
                                            mt: 0.5,
                                            fontSize: '0.7rem',
                                            backgroundColor: homework.homework_type === 'student' ? 'rgba(252, 227, 138, 0.3)' : 'rgba(149, 225, 211, 0.3)',
                                            color: '#666666',
                                            fontWeight: 'bold'
                                          }}
                                        />
                                      </Box>
                                    </Box>
                                    
                                    {/* Elegant 4-Bar Chart - aligned with status rectangles below */}
                                    <Box sx={{ mb: 1.5, height: 64, display: 'flex', alignItems: 'end', minWidth: 0 }}>
                                      {(() => {
                                        const maxValue = Math.max(
                                          homework.status_counts.graded,
                                          homework.status_counts.completed,
                                          homework.status_counts.in_progress,
                                          homework.status_counts.not_started,
                                          1
                                        );
                                        const statusData = [
                                          { value: homework.status_counts.graded, color: '#95E1D3' },
                                          { value: homework.status_counts.completed, color: '#D6F7AD' },
                                          { value: homework.status_counts.in_progress, color: '#FCE38A' },
                                          { value: homework.status_counts.not_started, color: '#F38181' }
                                        ];
                                        return (
                                          <Box sx={{ display: 'flex', alignItems: 'end', gap: 0.5, flexWrap: 'nowrap', minWidth: 0, width: '100%' }}>
                                            {statusData.map((status, index) => (
                                              <Box key={index} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '1 1 0', minWidth: 0 }}>
                                                <Box
                                                  sx={{
                                                    width: '100%',
                                                    maxWidth: 32,
                                                    height: `${(status.value / maxValue) * 48}px`,
                                                    background: `linear-gradient(135deg, ${status.color} 0%, ${status.color}CC 100%)`,
                                                    borderRadius: '12px 12px 0 0',
                                                    minHeight: status.value > 0 ? '6px' : '0px',
                                                    transition: 'all 0.3s ease',
                                                    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)',
                                                    '&:hover': { transform: 'scale(1.05)', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)' }
                                                  }}
                                                />
                                                <Typography variant="caption" sx={{ mt: 0.5, fontSize: '0.75rem', fontWeight: 600, color: '#666' }}>
                                                  {status.value}
                                                </Typography>
                                              </Box>
                                            ))}
                                          </Box>
                                        );
                                      })()}
                                    </Box>

                                    {/* Status Counts - one row (same width distribution as bars above) */}
                                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'nowrap', minWidth: 0 }}>
                                      <Box sx={{ flex: '1 1 0', minWidth: 0, p: 0.5, backgroundColor: 'rgba(149, 225, 211, 0.3)', borderRadius: 1, textAlign: 'center' }}>
                                        <Typography variant="caption" sx={{ color: '#95E1D3', fontWeight: 'bold', lineHeight: 1.2, fontSize: '0.85rem' }}>{homework.status_counts.graded}</Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', lineHeight: 1.2, display: 'block', mt: 0.75 }}>Graded</Typography>
                                      </Box>
                                      <Box sx={{ flex: '1 1 0', minWidth: 0, p: 0.5, backgroundColor: 'rgba(214, 247, 173, 0.3)', borderRadius: 1, textAlign: 'center' }}>
                                        <Typography variant="caption" sx={{ color: '#D6F7AD', fontWeight: 'bold', lineHeight: 1.2, fontSize: '0.85rem' }}>{homework.status_counts.completed}</Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', lineHeight: 1.2, display: 'block', mt: 0.75 }}>Completed</Typography>
                                      </Box>
                                      <Box sx={{ flex: '1 1 0', minWidth: 0, p: 0.5, backgroundColor: 'rgba(252, 227, 138, 0.3)', borderRadius: 1, textAlign: 'center' }}>
                                        <Typography variant="caption" sx={{ color: '#FCE38A', fontWeight: 'bold', lineHeight: 1.2, fontSize: '0.85rem' }}>{homework.status_counts.in_progress}</Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', lineHeight: 1.2, display: 'block', mt: 0.75 }}>In Progress</Typography>
                                      </Box>
                                      <Box sx={{ flex: '1 1 0', minWidth: 0, p: 0.5, backgroundColor: 'rgba(243, 129, 129, 0.3)', borderRadius: 1, textAlign: 'center' }}>
                                        <Typography variant="caption" sx={{ color: '#F38181', fontWeight: 'bold', lineHeight: 1.2, fontSize: '0.85rem' }}>{homework.status_counts.not_started}</Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', lineHeight: 1.2, display: 'block', mt: 0.75 }}>Not Started</Typography>
                                      </Box>
                                    </Box>

                                    {/* Average Grade and Completion Rate - bigger text */}
                                    <Box sx={{ mt: 0.75, display: 'flex', justifyContent: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                                      <Box sx={{ p: 1, backgroundColor: 'rgba(255, 255, 255, 0.4)', borderRadius: 1, textAlign: 'center', minWidth: 88 }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.9rem', display: 'block', mb: 0.25 }}>Average Grade</Typography>
                                        <Typography variant="body1" sx={{ color: '#333', fontWeight: 'bold', fontSize: '1.2rem' }}>{homework.average_grade ? `${homework.average_grade}%` : 'N/A'}</Typography>
                                      </Box>
                                      <Box sx={{ p: 1, backgroundColor: 'rgba(255, 255, 255, 0.4)', borderRadius: 1, textAlign: 'center', minWidth: 88 }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.9rem', display: 'block', mb: 0.25 }}>Completion Rate</Typography>
                                        <Typography variant="body1" sx={{ color: '#333', fontWeight: 'bold', fontSize: '1.2rem' }}>{homework.total_students > 0 ? Math.round(((homework.status_counts.graded + homework.status_counts.completed) / homework.total_students) * 100) : 0}%</Typography>
                                      </Box>
                                    </Box>

                                    {/* Progress Bar */}
                                    <Box sx={{ mt: 1 }}>
                                      <Box sx={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.3)', borderRadius: 1, height: 5 }}>
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
                              </Box>
                            ) : null;
                          })()}
                        </Paper>
                      </Box>
                    ))}
                  </Box>
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
      </div>
    </DashboardLayout>
  );
};

export default CourseWorkloadOverview;
