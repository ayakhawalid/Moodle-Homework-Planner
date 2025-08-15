import React from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../Components/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
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

  return (
    <DashboardLayout userRole="lecturer">
      {/* Welcome Section */}
      <div className="welcome-section">
        <h1 className="welcome-title">Welcome Back, {user?.name || user?.email?.split('@')[0] || 'Professor'}! 👨‍🏫</h1>
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
                <span>68%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{width: '68%'}}></div>
              </div>
            </div>
          </div>
          <div className="card-stats">
            <div className="stat-item">
              <span className="stat-value">24</span>
              <span className="stat-label">Graded</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">11</span>
              <span className="stat-label">Pending</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">3</span>
              <span className="stat-label">Late</span>
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
                <span>87%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{width: '87%'}}></div>
              </div>
            </div>
          </div>
          <div className="card-stats">
            <div className="stat-item">
              <span className="stat-value">4</span>
              <span className="stat-label">Classes</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">127</span>
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
                <span>Class Average Grade</span>
                <span>B+</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{width: '85%'}}></div>
              </div>
            </div>
          </div>
          <div className="card-stats">
            <div className="stat-item">
              <span className="stat-value">85%</span>
              <span className="stat-label">Pass Rate</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">3.2</span>
              <span className="stat-label">Avg GPA</span>
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
                <small style={{color: '#666'}}>15 students with A grades</small>
              </div>
              <div style={{padding: '10px', background: '#fff3cd', borderRadius: '8px'}}>
                <strong>Need Attention</strong><br />
                <small style={{color: '#856404'}}>3 students below C grade</small>
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
              <div style={{marginBottom: '8px', fontSize: '14px', color: '#666'}}>
                • 5 new homework submissions
              </div>
              <div style={{marginBottom: '8px', fontSize: '14px', color: '#666'}}>
                • 2 students requested extensions
              </div>
              <div style={{fontSize: '14px', color: '#666'}}>
                • Class average improved by 5%
              </div>
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
              <div style={{marginBottom: '10px', padding: '10px', background: '#f8f9fa', borderRadius: '8px'}}>
                <strong>Mathematics 101</strong><br />
                <small style={{color: '#666'}}>10:00 AM - Room 204</small>
              </div>
              <div style={{padding: '10px', background: '#f8f9fa', borderRadius: '8px'}}>
                <strong>Advanced Calculus</strong><br />
                <small style={{color: '#666'}}>2:00 PM - Room 301</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default LecturerDashboard;
