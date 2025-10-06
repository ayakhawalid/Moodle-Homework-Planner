import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../Components/DashboardLayout';
import { apiService } from '../../services/api';
import { Box, Typography } from '@mui/material';
import {
  BarChart as BarChartIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  School as SchoolIcon
} from '@mui/icons-material';
import '../../styles/DashboardLayout.css';

function WorkloadStats() {
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
          Analyze your teaching workload and student performance
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
                  <div className="stat-item">
                    <span className="stat-value">{statsData.overview.total_graded}</span>
                    <span className="stat-label">Graded</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="dashboard-card">
              <div className="card-header">
                <div className="card-icon accent">
                  <TrendingUpIcon />
                </div>
                <div>
                  <h3 className="card-title">Performance Metrics</h3>
                  <p className="card-subtitle">Student performance overview</p>
                </div>
              </div>
              <div className="card-content">
                <div className="stat-grid">
                  <div className="stat-item">
                    <span className="stat-value">{statsData.overview.average_grade}%</span>
                    <span className="stat-label">Average Grade</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{statsData.overview.pass_rate}%</span>
                    <span className="stat-label">Pass Rate</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{statsData.overview.letter_grade}</span>
                    <span className="stat-label">Letter Grade</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{statsData.grading_progress.completion_rate}%</span>
                    <span className="stat-label">Completion Rate</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Course Statistics */}
          <div className="dashboard-card" style={{ marginTop: '20px' }}>
            <div className="card-header">
              <div className="card-icon secondary">
                <BarChartIcon />
              </div>
              <div>
                <h3 className="card-title">Course Performance</h3>
                <p className="card-subtitle">Detailed course statistics</p>
              </div>
            </div>
            <div className="card-content">
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
                      <div className="metric">
                        <span className="metric-value">{course.average_grade}%</span>
                        <span className="metric-label">Avg Grade</span>
                      </div>
                      <div className="metric">
                        <span className="metric-value">{course.pass_rate}%</span>
                        <span className="metric-label">Pass Rate</span>
                      </div>
                      <div className="metric">
                        <span className="metric-value">{course.letter_grade}</span>
                        <span className="metric-label">Letter</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
