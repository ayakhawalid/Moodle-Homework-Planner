import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../Components/DashboardLayout';
import { Assignment as AssignmentIcon, Add as AddIcon, CalendarToday as CalendarTodayIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { Alert, CircularProgress, Typography, Box } from '@mui/material';
import { apiService } from '../../services/api';
import { useUserSyncContext } from '../../contexts/UserSyncContext';
import '../../styles/DashboardLayout.css';

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

  return (
    <DashboardLayout userRole="student">
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
          Homework Planner
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
          Organize and track your homework assignments efficiently
        </Typography>
      </Box>

      {/* Loading State */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
          <CircularProgress />
        </div>
      )}

      {/* Error State */}
      {error && (
        <Alert severity="error" style={{ marginBottom: '20px' }}>
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
                  // Filter for upcoming homework (not overdue, not completed)
                  const upcomingHomework = homeworkData.homework?.filter(hw => {
                    const dueDate = new Date(hw.due_date);
                    const today = new Date();
                    const daysUntilDue = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));
                    
                    // Show all upcoming homework (not overdue, not completed)
                    return daysUntilDue >= 0 && hw.status !== 'graded';
                  }).sort((a, b) => new Date(a.due_date) - new Date(b.due_date)) || [];
                  
                  return upcomingHomework.length > 0 ? (
                    upcomingHomework.slice(0, 3).map((hw, index) => {
                      const dueDate = new Date(hw.due_date);
                      const today = new Date();
                      const daysUntilDue = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));
                      
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
                          <strong>{hw.title}</strong><br />
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

    </DashboardLayout>
  );
}

export default HomeworkPlanner;
