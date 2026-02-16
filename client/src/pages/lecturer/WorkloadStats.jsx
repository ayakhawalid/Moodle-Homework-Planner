import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../Components/DashboardLayout';
import { apiService } from '../../services/api';
import { 
  Box, 
  Typography, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Grid, 
  Paper, 
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import {
  BarChart as BarChartIcon,
  Assignment as AssignmentIcon,
  School as SchoolIcon
} from '@mui/icons-material';
import '../../styles/DashboardLayout.css';

function WorkloadStats() {
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [courseDetails, setCourseDetails] = useState(null);
  const [homeworkStatusData, setHomeworkStatusData] = useState(null);
  const [studentsModal, setStudentsModal] = useState({
    open: false,
    homeworkTitle: '',
    status: '',
    students: [],
    loading: false
  });

  useEffect(() => {
    const fetchWorkloadStats = async () => {
      try {
        setLoading(true);
        const response = await apiService.lecturerDashboard.getWorkloadStats();
        setStatsData(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching workload stats:', err);
        setError('Failed to load workload statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkloadStats();
  }, []);

  useEffect(() => {
    const fetchCourseDetails = async () => {
      if (selectedCourse === 'all') {
        setCourseDetails(null);
        setHomeworkStatusData(null);
        return;
      }

      try {
        const response = await apiService.lecturerDashboard.getCoursesInfo();
        const course = response.data.find(c => c._id === selectedCourse);
        setCourseDetails(course);
      } catch (err) {
        console.error('Error fetching course details:', err);
      }
    };

    if (selectedCourse !== 'all') {
      fetchCourseDetails();
    }
  }, [selectedCourse]);

  useEffect(() => {
    const fetchHomeworkStatus = async () => {
      if (selectedCourse === 'all' || !selectedCourse) {
        setHomeworkStatusData(null);
        return;
      }

      try {
        const response = await apiService.lecturerDashboard.getHomeworkStatus(selectedCourse);
        setHomeworkStatusData(response.data);
      } catch (err) {
        console.error('Error fetching homework status:', err);
      }
    };

    if (selectedCourse !== 'all') {
      fetchHomeworkStatus();
    }
  }, [selectedCourse]);

  const handleOpenStudents = async (hw, statusKey) => {
    const count = hw.status_counts?.[statusKey];
    if (!count || count < 1 || !selectedCourse || selectedCourse === 'all') return;
    setStudentsModal(prev => ({ ...prev, open: true, homeworkTitle: hw.title, status: statusKey, students: [], loading: true }));
    try {
      const res = await apiService.lecturerDashboard.getHomeworkStatusStudents(selectedCourse, hw._id, statusKey);
      const list = res.data?.students ?? [];
      setStudentsModal(prev => ({ ...prev, students: list, loading: false }));
    } catch (err) {
      console.error('Error fetching students by status:', err);
      setStudentsModal(prev => ({ ...prev, students: [], loading: false }));
    }
  };

  const handleCloseStudents = () => {
    setStudentsModal(prev => ({ ...prev, open: false }));
  };

  const statusLabel = (key) => {
    const map = { graded: 'Graded', completed: 'Completed', in_progress: 'In Progress', not_started: 'Not Started' };
    return map[key] || key;
  };

  if (loading) {
    return (
      <DashboardLayout userRole="lecturer">
        <div className="white-page-background">
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout userRole="lecturer">
        <div className="white-page-background">
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <Typography variant="h6" color="error">
              {error}
            </Typography>
          </Box>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="lecturer">
      <div className="white-page-background">
      <Box>
      

      {statsData && (
        <>
          {/* Overview Statistics */}
          <div className="dashboard-grid">
            <div className="dashboard-card">
              <div className="card-header">
                <div className="card-icon primary">
                  <SchoolIcon />
                </div>
                <div>
                  <h3 className="card-title">Course Overview</h3>
                  <p className="card-subtitle">Teaching load summary</p>
                </div>
              </div>
              <div className="card-content">
                <div className="stat-grid">
                  <div className="stat-item">
                    <span className="stat-value">{statsData.overview.total_courses}</span>
                    <span className="stat-label">Total Courses</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{statsData.overview.total_students}</span>
                    <span className="stat-label">Total Students</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{statsData.overview.total_homework}</span>
                    <span className="stat-label">Total Homework</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Course Details with Dropdown */}
          <div className="dashboard-card" style={{ marginTop: '20px' }}>
            <div className="card-header">
              <div className="card-icon secondary">
                <BarChartIcon />
              </div>
              <div style={{ flex: 1 }}>
                <h3 className="card-title">Course Details</h3>
                <p className="card-subtitle">Student grades and homework completion</p>
              </div>
              <FormControl sx={{ minWidth: 250 }} size="small">
                <InputLabel>Select Course</InputLabel>
                <Select
                  value={selectedCourse}
                  label="Select Course"
                  onChange={(e) => setSelectedCourse(e.target.value)}
                >
                  <MenuItem value="all">All Courses</MenuItem>
                  {statsData.course_statistics.map((course) => (
                    <MenuItem key={course.course_id} value={course.course_id}>
                      {course.course_name} ({course.course_code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>
            <div className="card-content">
              {selectedCourse === 'all' ? (
                <div className="course-stats-grid">
                  {statsData.course_statistics.map((course) => (
                    <div key={course.course_id} className="course-stat-item">
                      <h4>{course.course_name} ({course.course_code})</h4>
                      <div className="course-metrics">
                        <div className="metric">
                          <span className="metric-value">{course.student_count}</span>
                          <span className="metric-label">Students</span>
                        </div>
                        <div className="metric">
                          <span className="metric-value">{course.homework_count}</span>
                          <span className="metric-label">Homework</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : courseDetails ? (
                <div>
                  <div style={{ marginBottom: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
                    <h4 style={{ marginBottom: '10px' }}>{courseDetails.course_name} ({courseDetails.course_code})</h4>
                    <p style={{ color: '#666', marginBottom: '5px' }}>
                      <strong>Students Enrolled:</strong> {courseDetails.student_count ?? 0}
                    </p>
                    <p style={{ color: '#666', marginBottom: '0' }}>
                      <strong>Total Homework:</strong> {homeworkStatusData?.homework_status?.length ?? 0}
                    </p>
                  </div>

                  <div style={{ marginTop: '20px' }}>
                    <h4 style={{ marginBottom: '15px' }}>Homework Status Breakdown</h4>
                    {homeworkStatusData && homeworkStatusData.homework_status.length > 0 ? (
                      <div>
                        {/* Overall Statistics */}
                        <div style={{ 
                          marginBottom: '12px', 
                          padding: '10px', 
                          background: '#f8f9fa', 
                          borderRadius: '8px' 
                        }}>
                          <Typography variant="subtitle2" fontWeight="bold" sx={{ marginBottom: 1, color: '#2c3e50', fontSize: '0.85rem' }}>Overall Statistics</Typography>
                          <Grid container spacing={1.5}>
                            <Grid item xs={6} sm={3}>
                              <Box textAlign="center" sx={{ p: 0.75, backgroundColor: 'rgba(149, 225, 211, 0.2)', borderRadius: 1 }}>
                                <Typography variant="body1" sx={{ color: '#95E1D3', fontWeight: 'bold', fontSize: '1rem' }}>
                                  {homeworkStatusData.overall_stats.total_homework}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                  Total Homework
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <Box textAlign="center" sx={{ p: 0.75, backgroundColor: 'rgba(214, 247, 173, 0.2)', borderRadius: 1 }}>
                                <Typography variant="body1" sx={{ color: '#D6F7AD', fontWeight: 'bold', fontSize: '1rem' }}>
                                  {homeworkStatusData.overall_stats.total_graded}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                  Graded Submissions
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <Box textAlign="center" sx={{ p: 0.75, backgroundColor: 'rgba(252, 227, 138, 0.2)', borderRadius: 1 }}>
                                <Typography variant="body1" sx={{ color: '#FCE38A', fontWeight: 'bold', fontSize: '1rem' }}>
                                  {homeworkStatusData.overall_stats.total_not_graded}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                  Pending Grading
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <Box textAlign="center" sx={{ p: 0.75, backgroundColor: 'rgba(243, 129, 129, 0.2)', borderRadius: 1 }}>
                                <Typography variant="body1" sx={{ color: '#F38181', fontWeight: 'bold', fontSize: '1rem' }}>
                                  {homeworkStatusData.overall_stats.average_grade ? `${homeworkStatusData.overall_stats.average_grade}%` : 'N/A'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                  Average Grade
                                </Typography>
                              </Box>
                            </Grid>
                          </Grid>
                        </div>

                        {/* Individual Homework Status - 3 per row like Workload Overview */}
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
                          {homeworkStatusData.homework_status.map((hw) => (
                            <Paper 
                              key={hw._id}
                              elevation={0}
                              sx={{ 
                                p: 2, 
                                height: '100%',
                                minWidth: 0,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                                borderLeft: `4px solid ${hw.homework_type === 'student' ? '#FCE38A' : '#95E1D3'}`,
                                backgroundColor: 'rgba(255, 255, 255, 0.6)'
                              }}
                            >
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                <Box>
                                  <Typography variant="subtitle2" fontWeight="bold" sx={{ fontSize: '0.85rem' }}>
                                    {hw.title}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.7rem', mt: 0.25 }}>
                                    {(() => {
                                      const dateStr = hw.homework_type === 'traditional' ? hw.due_date : hw.claimed_deadline;
                                      const dateObj = dateStr ? new Date(dateStr) : null;
                                      return `Due: ${dateObj ? dateObj.toLocaleDateString() : 'N/A'}`;
                                    })()}
                                  </Typography>
                                  <Chip 
                                    label={hw.homework_type === 'student' ? 'Student Created' : 'Lecturer Created'} 
                                    size="small"
                                    sx={{ 
                                      mt: 0.5,
                                      fontSize: '0.7rem',
                                      backgroundColor: hw.homework_type === 'student' ? 'rgba(252, 227, 138, 0.3)' : 'rgba(149, 225, 211, 0.3)',
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
                                    hw.status_counts.graded,
                                    hw.status_counts.completed,
                                    hw.status_counts.in_progress,
                                    hw.status_counts.not_started,
                                    1
                                  );
                                  const statusData = [
                                    { value: hw.status_counts.graded, color: '#95E1D3' },
                                    { value: hw.status_counts.completed, color: '#D6F7AD' },
                                    { value: hw.status_counts.in_progress, color: '#FCE38A' },
                                    { value: hw.status_counts.not_started, color: '#F38181' }
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
                                              boxShadow: 'none',
                                              '&:hover': { transform: 'scale(1.02)', opacity: 0.9 }
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
                                {[
                                  { key: 'graded', color: '#95E1D3', bg: 'rgba(149, 225, 211, 0.3)' },
                                  { key: 'completed', color: '#D6F7AD', bg: 'rgba(214, 247, 173, 0.3)' },
                                  { key: 'in_progress', color: '#FCE38A', bg: 'rgba(252, 227, 138, 0.3)' },
                                  { key: 'not_started', color: '#F38181', bg: 'rgba(243, 129, 129, 0.3)' }
                                ].map(({ key, color, bg }) => (
                                  <Box
                                    key={key}
                                    onClick={() => handleOpenStudents(hw, key)}
                                    sx={{
                                      flex: '1 1 0',
                                      minWidth: 0,
                                      p: 0.5,
                                      backgroundColor: bg,
                                      borderRadius: 1,
                                      textAlign: 'center',
                                      cursor: (hw.status_counts[key] || 0) > 0 ? 'pointer' : 'default',
                                      '&:hover': (hw.status_counts[key] || 0) > 0 ? { opacity: 0.9, boxShadow: 1 } : {}
                                    }}
                                  >
                                    <Typography variant="caption" sx={{ color, fontWeight: 'bold', lineHeight: 1.2, fontSize: '0.85rem' }}>{hw.status_counts[key]}</Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', lineHeight: 1.2, display: 'block', mt: 0.75 }}>{statusLabel(key)}</Typography>
                                  </Box>
                                ))}
                              </Box>

                              {/* Average Grade and Completion Rate - bigger text */}
                              <Box sx={{ mt: 0.75, display: 'flex', justifyContent: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                                <Box sx={{ p: 1, backgroundColor: 'rgba(255, 255, 255, 0.4)', borderRadius: 1, textAlign: 'center', minWidth: 88 }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.9rem', display: 'block', mb: 0.25 }}>Average Grade</Typography>
                                  <Typography variant="body1" sx={{ color: '#333', fontWeight: 'bold', fontSize: '1.2rem' }}>{hw.average_grade ? `${hw.average_grade}%` : 'N/A'}</Typography>
                                </Box>
                                <Box sx={{ p: 1, backgroundColor: 'rgba(255, 255, 255, 0.4)', borderRadius: 1, textAlign: 'center', minWidth: 88 }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.9rem', display: 'block', mb: 0.25 }}>Completion Rate</Typography>
                                  <Typography variant="body1" sx={{ color: '#333', fontWeight: 'bold', fontSize: '1.2rem' }}>
                                    {hw.total_students > 0 ? Math.round(((hw.status_counts.graded + hw.status_counts.completed) / hw.total_students) * 100) : 0}%
                                  </Typography>
                                </Box>
                              </Box>

                              {/* Progress Bar */}
                              <Box sx={{ mt: 1 }}>
                                <Box sx={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.3)', borderRadius: 1, height: 5 }}>
                                  <Box 
                                    sx={{ 
                                      width: `${hw.total_students > 0 ? ((hw.status_counts.graded + hw.status_counts.completed) / hw.total_students) * 100 : 0}%`, 
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
                      </div>
                    ) : homeworkStatusData ? (
                      <div style={{ 
                        padding: '30px', 
                        background: '#f8f9fa', 
                        borderRadius: '8px', 
                        textAlign: 'center',
                        color: '#666'
                      }}>
                        No homework assignments found for this course
                      </div>
                    ) : (
                      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                        <CircularProgress />
                      </Box>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                  Loading course details...
                </div>
              )}
            </div>
          </div>

          {/* Students by status modal */}
          <Dialog open={studentsModal.open} onClose={handleCloseStudents} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
              <Typography variant="h6">
                {studentsModal.homeworkTitle} — {statusLabel(studentsModal.status)}
              </Typography>
              <IconButton aria-label="Close" onClick={handleCloseStudents} size="small">
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              {studentsModal.loading ? (
                <Box display="flex" justifyContent="center" py={3}>
                  <CircularProgress size={32} />
                </Box>
              ) : (
                <TableContainer>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Full Name</strong></TableCell>
                        <TableCell><strong>Student ID</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {studentsModal.students.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={2} align="center">No students in this status</TableCell>
                        </TableRow>
                      ) : (
                        studentsModal.students.map((row, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{row.full_name}</TableCell>
                            <TableCell>{row.student_id}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </DialogContent>
          </Dialog>

          {/* Weekly Workload */}
          <div className="dashboard-card" style={{ marginTop: '20px' }}>
            <div className="card-header">
              <div className="card-icon primary">
                <AssignmentIcon />
              </div>
              <div>
                <h3 className="card-title">Weekly Workload Distribution</h3>
                <p className="card-subtitle">Homework due dates by day</p>
              </div>
            </div>
            <div className="card-content">
              <div className="weekly-workload-grid">
                {statsData.weekly_workload.map((day) => (
                  <div key={day.day} className="day-workload">
                    <h4>{day.day}</h4>
                    <div className="workload-count">{day.homework_count} assignments</div>
                    {day.homework.length > 0 && (
                      <div className="homework-list">
                        {day.homework.map((hw) => (
                          <div key={hw._id} className="homework-item">
                            <span className="homework-title">{hw.title}</span>
                            <span className="homework-course">{hw.course}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
      </Box>
      </div>
    </DashboardLayout>
  );
}

export default WorkloadStats;
