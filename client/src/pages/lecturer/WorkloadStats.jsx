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
  CircularProgress
} from '@mui/material';
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

  if (loading) {
    return (
      <DashboardLayout userRole="lecturer">
        <div className="welcome-section">
          <h1 className="welcome-title">Loading Workload Statistics...</h1>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout userRole="lecturer">
        <div className="welcome-section">
          <h1 className="welcome-title">Error Loading Statistics</h1>
          <p className="welcome-subtitle">{error}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="lecturer">
      <Box>
        <Typography variant="h3" component="h1" sx={{ 
          fontWeight: '600',
          fontSize: '2.5rem',
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
          letterSpacing: '-0.01em',
          lineHeight: '1.2',
          color: '#2c3e50',
          mb: 1
        }}>
          Workload Statistics
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
          Analyze your teaching workload and course overview
        </Typography>
      </Box>

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
                          marginBottom: '20px', 
                          padding: '15px', 
                          background: '#f8f9fa', 
                          borderRadius: '8px' 
                        }}>
                          <h5 style={{ marginBottom: '10px', color: '#2c3e50' }}>Overall Statistics</h5>
                          <Grid container spacing={2}>
                            <Grid item xs={6} sm={3}>
                              <Box textAlign="center" sx={{ p: 1, backgroundColor: 'rgba(149, 225, 211, 0.2)', borderRadius: 1 }}>
                                <Typography variant="h5" sx={{ color: '#95E1D3', fontWeight: 'bold' }}>
                                  {homeworkStatusData.overall_stats.total_homework}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Total Homework
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <Box textAlign="center" sx={{ p: 1, backgroundColor: 'rgba(214, 247, 173, 0.2)', borderRadius: 1 }}>
                                <Typography variant="h5" sx={{ color: '#D6F7AD', fontWeight: 'bold' }}>
                                  {homeworkStatusData.overall_stats.total_graded}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Graded Submissions
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <Box textAlign="center" sx={{ p: 1, backgroundColor: 'rgba(252, 227, 138, 0.2)', borderRadius: 1 }}>
                                <Typography variant="h5" sx={{ color: '#FCE38A', fontWeight: 'bold' }}>
                                  {homeworkStatusData.overall_stats.total_not_graded}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Pending Grading
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <Box textAlign="center" sx={{ p: 1, backgroundColor: 'rgba(243, 129, 129, 0.2)', borderRadius: 1 }}>
                                <Typography variant="h5" sx={{ color: '#F38181', fontWeight: 'bold' }}>
                                  {homeworkStatusData.overall_stats.average_grade ? `${homeworkStatusData.overall_stats.average_grade}%` : 'N/A'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Average Grade
                                </Typography>
                              </Box>
                            </Grid>
                          </Grid>
                        </div>

                        {/* Individual Homework Status */}
                        <div style={{ display: 'grid', gap: '15px' }}>
                          {homeworkStatusData.homework_status.map((hw) => (
                            <Paper 
                              key={hw._id} 
                              sx={{ 
                                p: 2, 
                                borderLeft: `4px solid ${hw.type === 'traditional' ? '#2196f3' : '#ff9800'}`,
                                borderRadius: '8px' 
                              }}
                            >
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                <Box>
                                  <Typography variant="h6" fontWeight="bold">
                                    {hw.title}
                                  </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                    {(() => {
                                      const dateStr = hw.homework_type === 'traditional' ? hw.due_date : hw.claimed_deadline;
                                      const dateObj = dateStr ? new Date(dateStr) : null;
                                      return `Due: ${dateObj ? dateObj.toLocaleDateString() : 'N/A'}`;
                                    })()}
                                  </Typography>
                                  <Chip 
                                    label={(hw.homework_type === 'traditional') ? 'Traditional' : 'Student Created'} 
                                    size="small" 
                                    color={(hw.homework_type === 'traditional') ? 'primary' : 'warning'}
                                    variant="outlined"
                                    sx={{ mt: 0.5 }}
                                  />
                                </Box>
                              </Box>
                              
                              {/* Elegant 4-Bar Chart */}
                              <Box sx={{ mb: 2, height: 80, display: 'flex', alignItems: 'end', gap: 2, px: 2 }}>
                                {(() => {
                                  const maxValue = Math.max(
                                    hw.status_counts.graded,
                                    hw.status_counts.completed,
                                    hw.status_counts.in_progress,
                                    hw.status_counts.not_started,
                                    1 // Prevent division by zero
                                  );
                                  
                                const statusData = [
                                    { label: 'Graded', value: hw.status_counts.graded, color: '#95E1D3' },
                                    { label: 'Completed', value: hw.status_counts.completed, color: '#D6F7AD' },
                                    { label: 'In Progress', value: hw.status_counts.in_progress, color: '#FCE38A' },
                                    { label: 'Not Started', value: hw.status_counts.not_started, color: '#F38181' }
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

                              <Grid container spacing={2}>
                                <Grid item xs={6} sm={3}>
                                  <Box sx={{ p: 1, backgroundColor: 'rgba(149, 225, 211, 0.3)', borderRadius: 1, textAlign: 'center' }}>
                                    <Typography variant="h6" sx={{ color: '#95E1D3', fontWeight: 'bold' }}>
                                      {hw.status_counts.graded}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      Graded
                                    </Typography>
                                  </Box>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                  <Box sx={{ p: 1, backgroundColor: 'rgba(214, 247, 173, 0.3)', borderRadius: 1, textAlign: 'center' }}>
                                    <Typography variant="h6" sx={{ color: '#D6F7AD', fontWeight: 'bold' }}>
                                      {hw.status_counts.completed}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      Completed
                                    </Typography>
                                  </Box>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                  <Box sx={{ p: 1, backgroundColor: 'rgba(252, 227, 138, 0.3)', borderRadius: 1, textAlign: 'center' }}>
                                    <Typography variant="h6" sx={{ color: '#FCE38A', fontWeight: 'bold' }}>
                                      {hw.status_counts.in_progress}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      In Progress
                                    </Typography>
                                  </Box>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                  <Box sx={{ p: 1, backgroundColor: 'rgba(243, 129, 129, 0.3)', borderRadius: 1, textAlign: 'center' }}>
                                    <Typography variant="h6" sx={{ color: '#F38181', fontWeight: 'bold' }}>
                                      {hw.status_counts.not_started}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      Not Started
                                    </Typography>
                                  </Box>
                                </Grid>
                              </Grid>
                              
                              {/* Average Grade and Completion Rate */}
                              <Grid container spacing={2} sx={{ mt: 1 }}>
                                <Grid item xs={6}>
                                  <Box sx={{ p: 1, backgroundColor: 'rgba(255, 255, 255, 0.4)', borderRadius: 1, textAlign: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">
                                      Average Grade
                                    </Typography>
                                    <Typography variant="h6" sx={{ color: '#333', fontWeight: 'bold' }}>
                                      {hw.average_grade ? `${hw.average_grade}%` : 'N/A'}
                                    </Typography>
                                  </Box>
                                </Grid>
                                <Grid item xs={6}>
                                  <Box sx={{ p: 1, backgroundColor: 'rgba(255, 255, 255, 0.4)', borderRadius: 1, textAlign: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">
                                      Completion Rate
                                    </Typography>
                                    <Typography variant="h6" sx={{ color: '#333', fontWeight: 'bold' }}>
                                      {hw.total_students > 0 ? Math.round(((hw.status_counts.graded + hw.status_counts.completed) / hw.total_students) * 100) : 0}%
                                    </Typography>
                                  </Box>
                                </Grid>
                              </Grid>

                              {/* Progress Bar */}
                              <Box sx={{ mt: 2 }}>
                                <Box sx={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.3)', borderRadius: 1, height: 8 }}>
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
                        </div>
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
    </DashboardLayout>
  );
}

export default WorkloadStats
