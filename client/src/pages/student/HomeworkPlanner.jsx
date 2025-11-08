import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../Components/DashboardLayout';
import { Assignment as AssignmentIcon, Add as AddIcon, CalendarToday as CalendarTodayIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { Alert, CircularProgress, Typography, Box } from '@mui/material';
import { apiService } from '../../services/api';
import { useUserSyncContext } from '../../contexts/UserSyncContext';
import '../../styles/DashboardLayout.css';
import '../../styles/HomeworkCard.css';

function HomeworkPlanner() {
  const { syncStatus } = useUserSyncContext();
  const [homeworkData, setHomeworkData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch homework data
  useEffect(() => {
    const fetchHomeworkData = async () => {
      try {
        setLoading(true);
        const response = await apiService.studentDashboard.getHomeworkPlanner();
        setHomeworkData(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching homework data:', err);
        setError('Failed to load homework data');
      } finally {
        setLoading(false);
      }
    };

    if (syncStatus === 'synced') {
      fetchHomeworkData();
    }
  }, [syncStatus]);

  // Refresh data when window regains focus (e.g., returning from homework management)
  useEffect(() => {
    const handleFocus = () => {
      if (syncStatus === 'synced') {
        const fetchHomeworkData = async () => {
          try {
            const response = await apiService.studentDashboard.getHomeworkPlanner();
            setHomeworkData(response.data);
          } catch (err) {
            console.error('Error refreshing homework data:', err);
          }
        };
        fetchHomeworkData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [syncStatus]);

  if (loading) {
    return (
      <DashboardLayout userRole="student">
        <div className="white-page-background">
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="student">
      <div className="white-page-background">
        {/* Error State */}
        {error && (
          <Alert severity="error" sx={{ mb: 2, mx: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {!loading && !error && homeworkData && (
        <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon primary">
              <AssignmentIcon />
            </div>
            <div>
              <h3 className="card-title">Assignment Management</h3>
              <p className="card-subtitle">Organize your homework</p>
            </div>
          </div>
          <div className="card-content">
            <h4>Key Features:</h4>
            <ul style={{paddingLeft: '20px', lineHeight: '1.8'}}>
              <li>Create and edit homework assignments</li>
              <li>Filter homework by course</li>
              <li>Set deadlines and track due dates</li>
              <li>Mark homework as completed</li>
              <li>Form study partnerships with classmates</li>
              <li>Collaborate with course mates on homework management</li>
              <li>Track completion status and progress</li>
            </ul>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon secondary">
              <CalendarTodayIcon />
            </div>
            <div>
              <h3 className="card-title">Upcoming Deadlines</h3>
              <p className="card-subtitle">Stay on track</p>
            </div>
          </div>
                      <div className="card-content">
              <p>View your upcoming assignment deadlines to prioritize your work effectively.</p>
              <div style={{marginTop: '15px'}}>
                {(() => {
                  // Filter for upcoming homework (not completed)
                  const upcomingHomework = homeworkData.homework?.filter(hw => {
                    const dueDate = new Date(hw.due_date);
                    const today = new Date();
                    // Normalize dates to midnight for accurate calendar day comparison
                    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                    const dueDateMidnight = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
                    const daysUntilDue = Math.round((dueDateMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
                    
                    // Show all homework that is not completed (regardless of due date)
                    return hw.status !== 'graded';
                  }).sort((a, b) => new Date(a.due_date) - new Date(b.due_date)) || [];
                  
                  return upcomingHomework.length > 0 ? (
                    upcomingHomework.slice(0, 3).map((hw, index) => {
                      const dueDate = new Date(hw.due_date);
                      const today = new Date();
                      // Normalize dates to midnight for accurate calendar day comparison
                      const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                      const dueDateMidnight = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
                      const daysUntilDue = Math.round((dueDateMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
                      
                      // Determine background color based on urgency
                      let bgColor = 'rgba(149, 225, 211, 0.3)'; // Default teal
                      let textColor = '#333';
                      
                      if (daysUntilDue <= 1) {
                        bgColor = 'rgba(243, 129, 129, 0.3)'; // Red for urgent
                        textColor = '#333';
                      } else if (daysUntilDue <= 3) {
                        bgColor = 'rgba(252, 227, 138, 0.3)'; // Yellow for warning
                        textColor = '#333';
                      }
                      
                      return (
                        <div key={hw._id} style={{marginBottom: '10px', padding: '10px', background: bgColor, borderRadius: '8px'}}>
                          <strong>{hw.title}</strong>
                          {hw.deadline_verification_status === 'unverified' && (
                            <span style={{
                              marginLeft: '8px',
                              padding: '2px 6px',
                              backgroundColor: 'rgba(255, 193, 7, 0.3)',
                              color: '#333',
                              border: '1px solid #FFC107',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}>
                              DEADLINE NOT VERIFIED
                            </span>
                          )}
                          <br />
                          <small style={{color: textColor}}>
                            Due: {dueDate.toLocaleDateString()} - {hw.course.name}
                          </small>
                          <br />
                          <small style={{color: textColor}}>
                            {daysUntilDue === 0 ? 'Due today!' : 
                             daysUntilDue === 1 ? 'Due tomorrow!' : 
                             `${daysUntilDue} days left`}
                          </small>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{padding: '10px', background: 'rgba(214, 247, 173, 0.3)', borderRadius: '8px', textAlign: 'center', color: '#666'}}>
                      No upcoming homework
                    </div>
                  );
                })()}
              </div>
            </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon accent">
              <CheckCircleIcon />
            </div>
            <div>
              <h3 className="card-title">Progress Tracking</h3>
              <p className="card-subtitle">Monitor completion</p>
            </div>
          </div>
          <div className="card-content">
            <p>Track your overall homework completion rate and academic progress across all assignments.</p>
            <div className="progress-container">
              <div className="progress-label">
                <span>Overall Completion Rate</span>
                <span>{homeworkData.summary?.completion_rate || 0}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{width: `${homeworkData.summary?.completion_rate || 0}%`}}></div>
              </div>
            </div>
          </div>
          <div className="card-stats">
            <div className="stat-item">
              <span className="stat-value">{homeworkData.summary?.completed || 0}</span>
              <span className="stat-label">Completed</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{homeworkData.summary?.pending || 0}</span>
              <span className="stat-label">Remaining</span>
            </div>
          </div>
        </div>
        </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default HomeworkPlanner;
