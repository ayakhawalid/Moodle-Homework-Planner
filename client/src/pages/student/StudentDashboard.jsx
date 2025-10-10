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
  CheckCircle as CheckCircleIcon,
  Event as EventIcon
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

  // Format study time - show minutes if less than 1 hour, otherwise show hours
  const formatStudyTime = (hours) => {
    if (!hours || hours === 0) return '0 min';
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `${minutes} min`;
    }
    return `${hours.toFixed(1)}h`;
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
      <Box p={0}>
        {/* User Sync Status */}
        <UserSyncStatus showDetails={false} />

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
                value={formatStudyTime(dashboardData.study_progress?.weekly_hours || 0)}
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

        {/* All Dashboard Cards - 4 Cards Per Row */}
        {!loading && !error && dashboardData && (
          <Grid container spacing={0} mb={4}>
            {/* Chart Card */}
            <Grid item xs={12} md={3} sx={{ padding: '8px' }}>
              <div className="dashboard-card" style={{ height: '400px' }}>
                <ProgressChart
                  title="Weekly Study Progress"
                  data={studyProgressData}
                  type="area"
                  height={300}
                  color="#1976d2"
                />
              </div>
            </Grid>
            
            {/* Today's Classes Card */}
            <Grid item xs={12} md={3} sx={{ padding: '8px' }}>
              <div className="dashboard-card" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
                <div className="card-header">
                  <div className="card-icon study-activity">
                    <EventIcon />
                  </div>
                  <div>
                    <h3 className="card-title">Today's Classes</h3>
                    <p className="card-subtitle">Your schedule for today</p>
                  </div>
                </div>
                <div className="card-content" style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{marginTop: '15px', height: '100%', overflowY: 'auto', paddingRight: '8px'}}>
                    {dashboardData.todays_classes?.length > 0 ? (
                      dashboardData.todays_classes.map((classItem) => {
                        // Get class type color
                        let borderColor = '#2196f3';
                        
                        switch(classItem.class_type) {
                          case 'lecture':
                            borderColor = '#2196f3';
                            break;
                          case 'lab':
                            borderColor = '#9c27b0';
                            break;
                          case 'seminar':
                            borderColor = '#4caf50';
                            break;
                          case 'workshop':
                            borderColor = '#ff9800';
                            break;
                          default:
                            borderColor = '#9e9e9e';
                        }
                        
                        return (
                          <div 
                            key={classItem._id} 
                            style={{
                              marginBottom: '15px',
                              padding: '12px', 
                              background: '#f8f9fa', 
                              borderRadius: '8px',
                              borderLeft: `4px solid ${borderColor}`
                            }}
                          >
                            <strong style={{fontSize: '1em', color: '#333', display: 'block', marginBottom: '4px'}}>
                              {classItem.class_title || classItem.course.name}
                            </strong>
                            
                            <small style={{color: '#666', fontSize: '0.85em', display: 'block', marginBottom: '6px'}}>
                              {classItem.course.code}
                            </small>
                            
                            <small style={{color: '#333', fontSize: '0.9em', fontWeight: '600', display: 'block'}}>
                              {classItem.start_time} - {classItem.end_time}
                            </small>
                            
                            <small style={{color: '#666', fontSize: '0.85em'}}>
                              {classItem.is_online ? '🌐 Online' : `📍 ${classItem.room}`}
                            </small>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{padding: '20px', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center', color: '#666', fontSize: '1.1em'}}>
                        No classes today
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Grid>

            {/* Homework Deadlines Card */}
            <Grid item xs={12} md={3} sx={{ padding: '8px' }}>
              <div className="dashboard-card" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
                <div className="card-header">
                  <div className="card-icon secondary">
                    <AssignmentIcon />
                  </div>
                  <div>
                    <h3 className="card-title">Homework Deadlines</h3>
                    <p className="card-subtitle">Upcoming assignments</p>
                  </div>
                </div>
                <div className="card-content" style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{marginTop: '15px', height: '100%', overflowY: 'auto', paddingRight: '8px'}}>
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
                          <div key={homework._id} style={{marginBottom: '15px', padding: '15px', background: bgColor, borderRadius: '8px'}}>
                            <strong style={{fontSize: '1.1em'}}>{homework.title}</strong><br />
                            <small style={{color: textColor, fontSize: '0.95em'}}>
                              Due: {new Date(homework.due_date).toLocaleDateString()} - {homework.course.name}
                            </small>
                            <br />
                            <small style={{color: textColor, fontSize: '0.9em'}}>
                              {homework.days_until_due === 0 ? 'Due today!' : 
                               homework.days_until_due === 1 ? 'Due tomorrow!' : 
                               `${homework.days_until_due} days left`}
                            </small>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{padding: '20px', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center', color: '#666', fontSize: '1.1em'}}>
                        No upcoming homework
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Grid>

            {/* Exam Deadlines Card */}
            <Grid item xs={12} md={3} sx={{ padding: '8px' }}>
              <div className="dashboard-card" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
                <div className="card-header">
                  <div className="card-icon accent">
                    <QuizIcon />
                  </div>
                  <div>
                    <h3 className="card-title">Exam Deadlines</h3>
                    <p className="card-subtitle">Upcoming exams</p>
                  </div>
                </div>
                <div className="card-content" style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{marginTop: '15px', height: '100%', overflowY: 'auto', paddingRight: '8px'}}>
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
                          <div key={exam._id} style={{marginBottom: '15px', padding: '15px', background: bgColor, borderRadius: '8px'}}>
                            <strong style={{fontSize: '1.1em'}}>{exam.exam_title}</strong><br />
                            <small style={{color: textColor, fontSize: '0.95em'}}>
                              {new Date(exam.due_date).toLocaleDateString()} - {exam.course.name}
                            </small>
                            <br />
                            <small style={{color: textColor, fontSize: '0.9em'}}>
                              {exam.days_until_due > 0 ? `${exam.days_until_due} days remaining` : 
                               exam.days_until_due === 0 ? 'Today' : 
                               `${Math.abs(exam.days_until_due)} days overdue`}
                            </small>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{padding: '20px', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center', color: '#666', fontSize: '1.1em'}}>
                        No upcoming exams
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Grid>
          </Grid>
        )}

        {/* Courses Info Section */}
        {!loading && !error && dashboardData && (
          <Grid container spacing={0} mb={4}>
            <Grid item xs={12}>
              <div className="dashboard-card" style={{ minHeight: '250px', display: 'flex', flexDirection: 'column' }}>
                <div className="card-header">
                  <div className="card-icon primary">
                    <SchoolIcon />
                  </div>
                  <div>
                    <h3 className="card-title">Courses Info</h3>
                    <p className="card-subtitle">Your enrolled courses</p>
                  </div>
                </div>
                <div className="card-content" style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{marginTop: '15px', height: '100%', overflowY: 'auto', paddingRight: '8px'}}>
                    {dashboardData?.courses?.list?.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
                        {dashboardData.courses.list.map((course, index) => (
                          <div key={course._id} style={{marginBottom: '10px', padding: '15px', background: '#f8f9fa', borderRadius: '8px'}}>
                            <strong style={{fontSize: '1.1em'}}>{course.course_name}</strong><br />
                            <small style={{color: '#666', fontSize: '0.95em'}}>
                              {course.lecturer?.name || 'TBA'} - {course.course_code}
                            </small>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{
                        padding: '40px 20px', 
                        background: '#f8f9fa', 
                        borderRadius: '8px', 
                        textAlign: 'center', 
                        color: '#666', 
                        fontSize: '1.1em'
                      }}>
                        No courses enrolled yet
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Grid>
          </Grid>
        )}

      </Box>
    </DashboardLayout>
  );
}

export default StudentDashboard;