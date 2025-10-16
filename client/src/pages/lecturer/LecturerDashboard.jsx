import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../Components/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import { apiService } from '../../services/api';
import {
  BarChart as BarChartIcon,
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
      {/* Dashboard Grid */}
      <div className="dashboard-grid">

        {/* Statistics Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon primary">
              <BarChartIcon />
            </div>
            <div>
              <h3 className="card-title">Workload Statistics</h3>
              <p className="card-subtitle">Analyze your teaching load</p>
            </div>
          </div>
            <div className="card-content">
            <p>View detailed statistics about your teaching workload.</p>
          </div>
          <div className="card-stats">
            <div className="stat-item">
              <span className="stat-value">{dashboardData?.statistics?.total_courses || 0}</span>
              <span className="stat-label">Courses</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{dashboardData?.statistics?.total_exams || 0}</span>
              <span className="stat-label">Exams</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{dashboardData?.statistics?.total_homework || 0}</span>
              <span className="stat-label">Homework</span>
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
                  <div key={index} style={{marginBottom: '8px', fontSize: '14px', color: '#333', padding: '8px', background: 'rgba(214, 247, 173, 0.2)', borderRadius: '6px'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between'}}>
                      <span>• {activity.message}</span>
                      {activity.timestamp && (
                        <small style={{color: '#777'}}>{new Date(activity.timestamp).toLocaleString()}</small>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{fontSize: '14px', color: '#666', padding: '8px', background: 'rgba(214, 247, 173, 0.2)', borderRadius: '6px'}}>
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
                  <div key={cls._id} style={{marginBottom: '10px', padding: '10px', background: 'rgba(149, 225, 211, 0.3)', borderRadius: '8px'}}>
                    <strong>{cls.course_name}</strong><br />
                    <small style={{color: '#333'}}>
                      {new Date(cls.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                      {new Date(cls.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                      {cls.location}
                    </small>
                    {cls.class_title && (
                      <><br /><small style={{color: '#666', fontStyle: 'italic'}}>{cls.class_title}</small></>
                    )}
                  </div>
                ))
              ) : (
                <div style={{padding: '10px', background: 'rgba(214, 247, 173, 0.3)', borderRadius: '8px', textAlign: 'center', color: '#666'}}>
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
