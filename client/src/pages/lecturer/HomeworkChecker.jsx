import React from 'react';
import DashboardLayout from '../../Components/DashboardLayout';
import { Grade as GradingIcon, Assignment as AssignmentIcon, Comment as CommentIcon, Assessment as AssessmentIcon } from '@mui/icons-material';
import '../../styles/DashboardLayout.css';

function HomeworkChecker() {
  return (
    <DashboardLayout userRole="lecturer">
      <div className="welcome-section">
        <h1 className="welcome-title">Homework Checker ✅</h1>
        <p className="welcome-subtitle">Review, grade, and provide feedback on student homework submissions</p>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon primary">
              <AssignmentIcon />
            </div>
            <div>
              <h3 className="card-title">Pending Submissions</h3>
              <p className="card-subtitle">Assignments to review</p>
            </div>
          </div>
          <div className="card-content">
            <p>View and grade recently submitted assignments from your students.</p>
            <div style={{marginTop: '15px'}}>
              <div style={{marginBottom: '10px', padding: '10px', background: '#fff3cd', borderRadius: '8px'}}>
                <strong>Math Assignment #5</strong><br />
                <small style={{color: '#856404'}}>12 submissions - Due: Yesterday</small>
              </div>
              <div style={{marginBottom: '10px', padding: '10px', background: '#f8f9fa', borderRadius: '8px'}}>
                <strong>Physics Lab Report</strong><br />
                <small style={{color: '#666'}}>8 submissions - Due: Today</small>
              </div>
              <div style={{padding: '10px', background: '#d1ecf1', borderRadius: '8px'}}>
                <strong>History Essay</strong><br />
                <small style={{color: '#0c5460'}}>15 submissions - Due: Tomorrow</small>
              </div>
            </div>
          </div>
          <div className="card-stats">
            <div className="stat-item">
              <span className="stat-value">35</span>
              <span className="stat-label">To Grade</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">3</span>
              <span className="stat-label">Overdue</span>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon secondary">
              <GradingIcon />
            </div>
            <div>
              <h3 className="card-title">Grading Progress</h3>
              <p className="card-subtitle">Track your grading</p>
            </div>
          </div>
          <div className="card-content">
            <p>Monitor your grading progress and maintain consistent feedback quality.</p>
            <div className="progress-container">
              <div className="progress-label">
                <span>This Week's Grading</span>
                <span>68%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{width: '68%'}}></div>
              </div>
            </div>
            <div className="progress-container">
              <div className="progress-label">
                <span>Average Grading Time</span>
                <span>8 min/assignment</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{width: '75%'}}></div>
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
              <span className="stat-label">Remaining</span>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon accent">
              <CommentIcon />
            </div>
            <div>
              <h3 className="card-title">Feedback Tools</h3>
              <p className="card-subtitle">Provide quality feedback</p>
            </div>
          </div>
          <div className="card-content">
            <p>Use advanced tools to provide comprehensive feedback to your students.</p>
            <h4 style={{marginTop: '15px', marginBottom: '10px'}}>Available Tools:</h4>
            <ul style={{paddingLeft: '20px', lineHeight: '1.6'}}>
              <li>Rubric-based grading</li>
              <li>Audio feedback recording</li>
              <li>Inline comments and annotations</li>
              <li>Grade distribution analysis</li>
              <li>Plagiarism detection</li>
            </ul>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon primary">
              <AssessmentIcon />
            </div>
            <div>
              <h3 className="card-title">Grade Analytics</h3>
              <p className="card-subtitle">Performance insights</p>
            </div>
          </div>
          <div className="card-content">
            <p>Analyze grade distributions and student performance trends.</p>
            <div style={{marginTop: '15px'}}>
              <div style={{marginBottom: '10px', padding: '10px', background: '#d4edda', borderRadius: '8px'}}>
                <strong>Class Average</strong><br />
                <small style={{color: '#155724'}}>B+ (87%)</small>
              </div>
              <div style={{marginBottom: '10px', padding: '10px', background: '#f8f9fa', borderRadius: '8px'}}>
                <strong>Highest Score</strong><br />
                <small style={{color: '#666'}}>98% - Excellent work!</small>
              </div>
              <div style={{padding: '10px', background: '#fff3cd', borderRadius: '8px'}}>
                <strong>Students Needing Help</strong><br />
                <small style={{color: '#856404'}}>3 students below 70%</small>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon secondary">
              <AssignmentIcon />
            </div>
            <div>
              <h3 className="card-title">Recent Activity</h3>
              <p className="card-subtitle">Latest submissions</p>
            </div>
          </div>
          <div className="card-content">
            <p>Stay updated with the most recent homework submissions.</p>
            <div style={{marginTop: '15px'}}>
              <div style={{marginBottom: '8px', fontSize: '14px', color: '#666', borderBottom: '1px solid #eee', paddingBottom: '5px'}}>
                <strong>Sarah Johnson</strong> - Math Assignment #5<br />
                <small>Submitted 2 hours ago</small>
              </div>
              <div style={{marginBottom: '8px', fontSize: '14px', color: '#666', borderBottom: '1px solid #eee', paddingBottom: '5px'}}>
                <strong>Mike Chen</strong> - Physics Lab Report<br />
                <small>Submitted 4 hours ago</small>
              </div>
              <div style={{fontSize: '14px', color: '#666'}}>
                <strong>Emma Davis</strong> - History Essay<br />
                <small>Submitted 6 hours ago</small>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon accent">
              <AssessmentIcon />
            </div>
            <div>
              <h3 className="card-title">Quick Actions</h3>
              <p className="card-subtitle">Common tasks</p>
            </div>
          </div>
          <div className="card-content">
            <p>Access frequently used grading and feedback tools.</p>
            <div style={{marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px'}}>
              <button style={{
                background: '#F38181',
                border: 'none',
                padding: '12px',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                fontWeight: '500'
              }}>
                Grade Next Assignment
              </button>
              <button style={{
                background: '#95E1D3',
                border: 'none',
                padding: '12px',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                fontWeight: '500'
              }}>
                Export Grade Report
              </button>
              <button style={{
                background: '#FCE38A',
                border: 'none',
                padding: '12px',
                borderRadius: '8px',
                color: '#333',
                cursor: 'pointer',
                fontWeight: '500'
              }}>
                Send Feedback Reminders
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default HomeworkChecker;
