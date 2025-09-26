import React, { useState, useEffect } from 'react';
import { Grid, Box, Typography, Alert, CircularProgress } from '@mui/material';
import DashboardLayout from '../../Components/DashboardLayout';
import StatCard from '../../Components/charts/StatCard';
import ProgressChart from '../../Components/charts/ProgressChart';
import { useAuth } from '../../hooks/useAuth';
import { useAuth0 } from '@auth0/auth0-react';
import { useUserSyncContext } from '../../contexts/UserSyncContext';
import UserSyncStatus from '../../Components/UserSyncStatus';
import { apiService } from '../../services/api';
import {
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
  Quiz as QuizIcon,
  School as SchoolIcon,
  Timer as TimerIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import '../../styles/DashboardLayout.css';

function StudentDashboard() {
  const { user } = useAuth();
  const { user: auth0User } = useAuth0();
  const { syncStatus } = useUserSyncContext();
  
  // State for dashboard data
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await apiService.studentDashboard.getOverview();
        setDashboardData(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    if (syncStatus === 'synced') {
      fetchDashboardData();
    }
  }, [syncStatus]);

  // Prepare study progress data for chart
  const studyProgressData = dashboardData?.study_progress ? {
    categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    values: dashboardData.study_progress.weekly_breakdown || [0, 0, 0, 0, 0, 0, 0],
    seriesName: 'Study Hours',
    yAxisTitle: 'Hours'
  } : {
    categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    values: [0, 0, 0, 0, 0, 0, 0],
    seriesName: 'Study Hours',
    yAxisTitle: 'Hours'
  };

  // Get user name with multiple fallbacks, prioritizing full name
  const getUserName = () => {
    // Try from our processed user object first (full_name, then name)
    if (user?.full_name && user.full_name.trim()) {
      return user.full_name;
    }
    if (user?.name && user.name !== 'User' && user.name.trim()) {
      return user.name;
    }

    // Try directly from Auth0 user object
    if (auth0User) {
      const name = auth0User.given_name ||
                   auth0User.nickname ||
                   auth0User.name ||
                   auth0User.email?.split('@')[0];
      if (name && name.trim()) return name;
    }

    // Final fallback
    return user?.email?.split('@')[0] || 'Student';
  };

  return (
    <DashboardLayout userRole="student">
      <Box p={3}>
        {/* User Sync Status */}
        <UserSyncStatus showDetails={false} />

        {/* Welcome Section */}
        <Box mb={4}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#333' }}>
            Welcome back, {getUserName()}!
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Track your academic progress and manage your tasks
            {syncStatus === 'synced' && (
              <span style={{ marginLeft: '10px', color: '#4caf50' }}>
                • Database Connected ✓
              </span>
            )}
          </Typography>
        </Box>

        {/* Loading State */}
        {loading && (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
          </Box>
        )}

        {/* Error State */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Statistics Cards */}
        {!loading && !error && dashboardData && (
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Study Hours"
                value={`${dashboardData.study_progress?.weekly_hours || 0}h`}
                icon={<TimerIcon sx={{ fontSize: 40 }} />}
                color="#1976d2"
                trend={dashboardData.study_progress?.daily_average || 0}
                subtitle="This week"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Pending Tasks"
                value={dashboardData.homework?.upcoming || 0}
                icon={<AssignmentIcon sx={{ fontSize: 40 }} />}
                color="#f57c00"
                subtitle="Upcoming"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Completed"
                value={dashboardData.homework?.completed || 0}
                icon={<CheckCircleIcon sx={{ fontSize: 40 }} />}
                color="#4caf50"
                trend={dashboardData.homework?.average_grade || 0}
                subtitle="This month"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Upcoming Exams"
                value={dashboardData.exams?.upcoming || 0}
                icon={<QuizIcon sx={{ fontSize: 40 }} />}
                color="#7b1fa2"
                subtitle="This semester"
              />
            </Grid>
          </Grid>
        )}

        {/* Charts Section */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} md={8}>
            <ProgressChart
              title="Weekly Study Progress"
              data={studyProgressData}
              type="area"
              height={300}
              color="#1976d2"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <div className="dashboard-card" style={{ height: '280px', display: 'flex', flexDirection: 'column' }}>
              <div className="card-header" style={{ paddingBottom: '10px' }}>
                <div className="card-icon primary">
                  <SchoolIcon />
                </div>
                <div>
                  <h3 className="card-title">Courses Info</h3>
                  <p className="card-subtitle">Your enrolled courses</p>
                </div>
              </div>
              <div className="card-content" style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{marginTop: '10px', height: '100%', overflowY: 'auto'}}>
                  {dashboardData?.courses?.list?.length > 0 ? (
                    dashboardData.courses.list.slice(0, 3).map((course, index) => (
                      <div key={course._id} style={{marginBottom: '8px', padding: '8px', background: '#f8f9fa', borderRadius: '6px', fontSize: '0.9em'}}>
                        <strong style={{fontSize: '0.95em'}}>{course.course_name}</strong><br />
                        <small style={{color: '#666', fontSize: '0.8em'}}>
                          {course.lecturer?.name || 'TBA'} - {course.course_code}
                        </small>
                      </div>
                    ))
                  ) : (
                    <div style={{padding: '10px', background: '#f8f9fa', borderRadius: '6px', textAlign: 'center', color: '#666', fontSize: '0.9em'}}>
                      No courses enrolled yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Grid>
        </Grid>

        {/* Dashboard Grid */}
        {!loading && !error && dashboardData && (
          <div className="dashboard-grid">

          {/* Homework Deadlines Card */}
          <div className="dashboard-card">
            <div className="card-header">
              <div className="card-icon secondary">
                <AssignmentIcon />
              </div>
              <div>
                <h3 className="card-title">Homework Deadlines</h3>
                <p className="card-subtitle">Upcoming assignments</p>
              </div>
            </div>
            <div className="card-content">
              <div style={{marginTop: '15px'}}>
                {dashboardData.homework?.upcoming_list?.length > 0 ? (
                  dashboardData.homework.upcoming_list.map((homework, index) => {
                    // Determine background color based on urgency
                    let bgColor = '#d1ecf1'; // Default blue
                    let textColor = '#0c5460';
                    
                    if (homework.days_until_due <= 1) {
                      bgColor = '#f8d7da'; // Red for urgent
                      textColor = '#721c24';
                    } else if (homework.days_until_due <= 3) {
                      bgColor = '#fff3cd'; // Yellow for warning
                      textColor = '#856404';
                    }
                    
                    return (
                      <div key={homework._id} style={{marginBottom: '10px', padding: '10px', background: bgColor, borderRadius: '8px'}}>
                        <strong>{homework.title}</strong><br />
                        <small style={{color: textColor}}>
                          Due: {new Date(homework.due_date).toLocaleDateString()} - {homework.course.name}
                        </small>
                        <br />
                        <small style={{color: textColor}}>
                          {homework.days_until_due === 0 ? 'Due today!' : 
                           homework.days_until_due === 1 ? 'Due tomorrow!' : 
                           `${homework.days_until_due} days left`}
                        </small>
                      </div>
                    );
                  })
                ) : (
                  <div style={{padding: '10px', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center', color: '#666'}}>
                    No upcoming homework
                  </div>
                )}
              </div>
            </div>
          </div>

        {/* Exam Deadlines Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon accent">
              <QuizIcon />
            </div>
            <div>
              <h3 className="card-title">Exam Deadlines</h3>
              <p className="card-subtitle">Upcoming exams</p>
            </div>
          </div>
          <div className="card-content">
            <div style={{marginTop: '15px'}}>
              {dashboardData.exams?.upcoming_list?.length > 0 ? (
                dashboardData.exams.upcoming_list.map((exam, index) => {
                  // Determine background color based on urgency
                  let bgColor = '#d1ecf1'; // Default blue
                  let textColor = '#0c5460';
                  
                  if (exam.days_until_due <= 3) {
                    bgColor = '#f8d7da'; // Red for urgent
                    textColor = '#721c24';
                  } else if (exam.days_until_due <= 7) {
                    bgColor = '#fff3cd'; // Yellow for warning
                    textColor = '#856404';
                  }
                  
                  return (
                    <div key={exam._id} style={{marginBottom: '10px', padding: '10px', background: bgColor, borderRadius: '8px'}}>
                      <strong>{exam.exam_title}</strong><br />
                      <small style={{color: textColor}}>
                        {new Date(exam.due_date).toLocaleDateString()} - {exam.course.name}
                      </small>
                      <br />
                      <small style={{color: textColor}}>
                        {exam.days_until_due > 0 ? `${exam.days_until_due} days remaining` : 
                         exam.days_until_due === 0 ? 'Today' : 
                         `${Math.abs(exam.days_until_due)} days overdue`}
                      </small>
                    </div>
                  );
                })
              ) : (
                <div style={{padding: '10px', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center', color: '#666'}}>
                  No upcoming exams
                </div>
              )}
            </div>
          </div>
        </div>

        </div>
        )}

      </Box>
    </DashboardLayout>
  );
}

export default StudentDashboard;