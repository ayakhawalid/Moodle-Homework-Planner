import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../Components/DashboardLayout';
import { Assignment as AssignmentIcon, Add as AddIcon, CalendarToday as CalendarTodayIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { Alert, CircularProgress } from '@mui/material';
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
      <div className="welcome-section">
        <h1 className="welcome-title">Homework Planner 📚</h1>
        <p className="welcome-subtitle">Organize and track your homework assignments efficiently</p>
      </div>

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
              <li>Add new assignments with detailed descriptions</li>
              <li>Set due dates and track deadlines</li>
              <li>Track completion status and progress</li>
              <li>View upcoming deadlines and overdue items</li>
              <li>Organize by subject or course</li>
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
                    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                    
                    // Show all upcoming homework (not overdue, not completed)
                    return daysUntilDue >= 0 && hw.status !== 'graded';
                  }).sort((a, b) => new Date(a.due_date) - new Date(b.due_date)) || [];
                  
                  return upcomingHomework.length > 0 ? (
                    upcomingHomework.slice(0, 3).map((hw, index) => {
                      const dueDate = new Date(hw.due_date);
                      const today = new Date();
                      const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                      
                      // Determine background color based on urgency
                      let bgColor = '#d1ecf1'; // Default blue
                      let textColor = '#0c5460';
                      
                      if (daysUntilDue <= 1) {
                        bgColor = '#f8d7da'; // Red for urgent
                        textColor = '#721c24';
                      } else if (daysUntilDue <= 3) {
                        bgColor = '#fff3cd'; // Yellow for warning
                        textColor = '#856404';
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
                    <div style={{padding: '10px', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center', color: '#666'}}>
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
