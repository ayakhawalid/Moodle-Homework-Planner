import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../Components/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import { apiService } from '../../services/api';
import {
  Grade as GradingIcon,
  Class as ClassIcon,
  BarChart as BarChartIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
  CalendarToday as CalendarTodayIcon,
  Notifications as NotificationsIcon
} from '@mui/icons-material';
import '../../styles/DashboardLayout.css';

function LecturerDashboard() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get user name with multiple fallbacks, prioritizing full name
  const getUserName = () => {
    // Try from our processed user object first (full_name, then name)
    if (user?.full_name && user.full_name.trim()) {
      return user.full_name;
    }
    if (user?.name && user.name !== 'User' && user.name.trim()) {
      return user.name;
    }

    // Try from Auth0 user object
    if (user?.email) {
      const auth0Name = user.given_name || user.nickname || user.name;
      if (auth0Name && auth0Name.trim()) {
        return auth0Name;
      }
    }

    // Final fallback
    return user?.email?.split('@')[0] || 'Professor';
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await apiService.lecturerDashboard.getOverview();
        setDashboardData(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <DashboardLayout userRole="lecturer">
        <div className="welcome-section">
          <h1 className="welcome-title">Loading Dashboard...</h1>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout userRole="lecturer">
        <div className="welcome-section">
          <h1 className="welcome-title">Error Loading Dashboard</h1>
          <p className="welcome-subtitle">{error}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="lecturer">
      {/* Welcome Section */}
      <div className="welcome-section">
        <h1 className="welcome-title">Welcome Back, {getUserName()}! 👨‍🏫</h1>
        <p className="welcome-subtitle">Ready to inspire and educate your students?</p>
        <div className="quick-actions">
          <Link to="/lecturer/homework-checker" className="action-btn">
            <GradingIcon />
            Grade Assignments
          </Link>
          <Link to="/lecturer/classroom" className="action-btn">
            <ClassIcon />
            Manage Classes
          </Link>
          <Link to="/lecturer/stats" className="action-btn">
            <BarChartIcon />
            View Statistics
          </Link>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="dashboard-grid">
        {/* Grading Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon primary">
              <GradingIcon />
            </div>
            <div>
              <h3 className="card-title">Homework Checker</h3>
              <p className="card-subtitle">Grade student assignments</p>
            </div>
          </div>
          <div className="card-content">
            <p>Review and grade submitted assignments from your students.</p>
            <div className="progress-container">
              <div className="progress-label">
                <span>Grading Progress</span>
                <span>{dashboardData?.workload?.grading_progress || 0}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{width: `${dashboardData?.workload?.grading_progress || 0}%`}}></div>
              </div>
            </div>
          </div>
          <div className="card-stats">
            <div className="stat-item">
              <span className="stat-value">{dashboardData?.homework?.graded || 0}</span>
              <span className="stat-label">Graded</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{dashboardData?.homework?.pending || 0}</span>
              <span className="stat-label">Pending</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{dashboardData?.homework?.total || 0}</span>
              <span className="stat-label">Total</span>
            </div>
          </div>
        </div>

        {/* Classroom Management Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon secondary">
              <ClassIcon />
            </div>
            <div>
              <h3 className="card-title">Classroom Management</h3>
              <p className="card-subtitle">Manage your classes</p>
            </div>
          </div>
          <div className="card-content">
            <p>Organize your classes, track attendance, and manage course materials.</p>
            <div className="progress-container">
              <div className="progress-label">
                <span>Average Attendance</span>
                <span>{dashboardData?.classroom?.attendance_rate || 0}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{width: `${dashboardData?.classroom?.attendance_rate || 0}%`}}></div>
              </div>
            </div>
          </div>
          <div className="card-stats">
            <div className="stat-item">
              <span className="stat-value">{dashboardData?.classroom?.total_classes || 0}</span>
              <span className="stat-label">Classes</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{dashboardData?.classroom?.total_students || 0}</span>
              <span className="stat-label">Students</span>
            </div>
          </div>
        </div>

        {/* Statistics Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon accent">
              <BarChartIcon />
            </div>
            <div>
              <h3 className="card-title">Workload Statistics</h3>
              <p className="card-subtitle">Analyze your teaching load</p>
            </div>
          </div>
          <div className="card-content">
            <p>View detailed statistics about your teaching workload and student performance.</p>
            <div className="progress-container">
              <div className="progress-label">
                <span>Grading Progress</span>
                <span>{dashboardData?.workload?.grading_progress || 0}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{width: `${dashboardData?.workload?.grading_progress || 0}%`}}></div>
              </div>
            </div>
          </div>
          <div className="card-stats">
            <div className="stat-item">
              <span className="stat-value">{dashboardData?.workload?.letter_grade || 'N/A'}</span>
              <span className="stat-label">Avg Grade</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{dashboardData?.workload?.total_courses || 0}</span>
              <span className="stat-label">Courses</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{dashboardData?.workload?.total_exams || 0}</span>
              <span className="stat-label">Exams</span>
            </div>
          </div>
        </div>

        {/* Student Performance Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon primary">
              <PeopleIcon />
            </div>
            <div>
              <h3 className="card-title">Student Performance</h3>
              <p className="card-subtitle">Track student progress</p>
            </div>
          </div>
          <div className="card-content">
            <p>Monitor individual student performance and identify those who need help.</p>
            <div style={{marginTop: '15px'}}>
              <div style={{marginBottom: '10px', padding: '10px', background: '#f8f9fa', borderRadius: '8px'}}>
                <strong>Top Performers</strong><br />
                <small style={{color: '#666'}}>
                  {dashboardData?.student_performance?.total_a_grades || 0} students with A grades
                </small>
              </div>
              <div style={{padding: '10px', background: '#fff3cd', borderRadius: '8px'}}>
                <strong>Need Attention</strong><br />
                <small style={{color: '#856404'}}>
                  {dashboardData?.student_performance?.total_below_c || 0} students below C grade
                </small>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon secondary">
              <NotificationsIcon />
            </div>
            <div>
              <h3 className="card-title">Recent Activity</h3>
              <p className="card-subtitle">Latest updates</p>
            </div>
          </div>
          <div className="card-content">
            <p>Stay updated with recent submissions and class activities.</p>
            <div style={{marginTop: '15px'}}>
              {dashboardData?.recent_activity?.length > 0 ? (
                dashboardData.recent_activity.map((activity, index) => (
                  <div key={index} style={{marginBottom: '8px', fontSize: '14px', color: '#666'}}>
                    • {activity.message}
                  </div>
                ))
              ) : (
                <div style={{fontSize: '14px', color: '#666'}}>
                  No recent activity
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Schedule Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon accent">
              <CalendarTodayIcon />
            </div>
            <div>
              <h3 className="card-title">Today's Schedule</h3>
              <p className="card-subtitle">Your classes today</p>
            </div>
          </div>
          <div className="card-content">
            <p>View your teaching schedule for today.</p>
            <div style={{marginTop: '15px'}}>
              {dashboardData?.todays_schedule?.length > 0 ? (
                dashboardData.todays_schedule.map((cls, index) => (
                  <div key={cls._id} style={{marginBottom: '10px', padding: '10px', background: '#f8f9fa', borderRadius: '8px'}}>
                    <strong>{cls.course_name}</strong><br />
                    <small style={{color: '#666'}}>
                      {new Date(cls.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                      {new Date(cls.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                      {cls.location}
                    </small>
                    {cls.class_title && (
                      <><br /><small style={{color: '#888', fontStyle: 'italic'}}>{cls.class_title}</small></>
                    )}
                  </div>
                ))
              ) : (
                <div style={{padding: '10px', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center', color: '#666'}}>
                  No classes scheduled for today
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default LecturerDashboard;
