import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../Components/DashboardLayout';
import { apiService } from '../../services/api';
import { Box, Typography, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
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
                      <strong>Students Enrolled:</strong> {courseDetails.statistics?.student_count || 0}
                    </p>
                    <p style={{ color: '#666', marginBottom: '0' }}>
                      <strong>Total Homework:</strong> {courseDetails.statistics?.homework_count || 0}
                    </p>
                  </div>

                  <div style={{ marginTop: '20px' }}>
                    <h4 style={{ marginBottom: '15px' }}>Homework Details</h4>
                    {courseDetails.recent_homework && courseDetails.recent_homework.length > 0 ? (
                      <div style={{ display: 'grid', gap: '15px' }}>
                        {courseDetails.recent_homework.map((hw) => {
                          const totalStudents = courseDetails.statistics?.student_count || 0;
                          const gradedCount = hw.graded_count || 0;
                          const notGradedCount = totalStudents - gradedCount;
                          
                          return (
                            <div 
                              key={hw._id} 
                              style={{ 
                                padding: '15px', 
                                background: 'white', 
                                border: '1px solid #e0e0e0',
                                borderRadius: '8px' 
                              }}
                            >
                              <h5 style={{ marginBottom: '10px', color: '#2c3e50' }}>{hw.title}</h5>
                              <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                                gap: '10px',
                                marginTop: '10px'
                              }}>
                                <div style={{ padding: '10px', background: '#e8f5e9', borderRadius: '6px' }}>
                                  <div style={{ fontSize: '0.85em', color: '#666' }}>Students Graded</div>
                                  <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#4caf50' }}>
                                    {gradedCount}
                                  </div>
                                </div>
                                <div style={{ padding: '10px', background: '#fff3e0', borderRadius: '6px' }}>
                                  <div style={{ fontSize: '0.85em', color: '#666' }}>Not Graded</div>
                                  <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#ff9800' }}>
                                    {notGradedCount}
                                  </div>
                                </div>
                                <div style={{ padding: '10px', background: '#e3f2fd', borderRadius: '6px' }}>
                                  <div style={{ fontSize: '0.85em', color: '#666' }}>Average Grade</div>
                                  <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#2196f3' }}>
                                    {hw.average_grade ? `${hw.average_grade}%` : 'N/A'}
                                  </div>
                                </div>
                              </div>
                              <div style={{ marginTop: '10px', fontSize: '0.9em', color: '#666' }}>
                                <strong>Due Date:</strong> {new Date(hw.due_date).toLocaleDateString()}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ 
                        padding: '30px', 
                        background: '#f8f9fa', 
                        borderRadius: '8px', 
                        textAlign: 'center',
                        color: '#666'
                      }}>
                        No homework assignments found for this course
                      </div>
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
