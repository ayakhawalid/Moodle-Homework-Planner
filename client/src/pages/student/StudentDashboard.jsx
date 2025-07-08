import React from 'react';
import DashboardLayout from '../../Components/DashboardLayout';
import {
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
  Quiz as QuizIcon,
  School as SchoolIcon
} from '@mui/icons-material';
import '../../styles/DashboardLayout.css';

function StudentDashboard() {
  return (
    <DashboardLayout userRole="student">
      {/* Welcome Section */}
      <div className="welcome-section">
        <h1 className="welcome-title">My Dashboard</h1>
        <p className="welcome-subtitle">Track your academic progress and manage your tasks</p>
      </div>

      {/* Time Tracker Section */}
      <div className="time-tracker-section">
        <div className="time-card">
          <div className="time-circle purple">
            <div className="time-value">10h</div>
          </div>
          <div className="time-label">Time Spent</div>
        </div>
        <div className="time-card">
          <div className="time-circle green">
            <div className="time-value">30+</div>
          </div>
          <div className="time-label">Projects Pending</div>
        </div>
        <div className="time-card">
          <div className="time-circle orange">
            <div className="time-value">12</div>
          </div>
          <div className="time-label">Finished Tasks</div>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="dashboard-grid">
        {/* Courses Info Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon primary">
              <SchoolIcon />
            </div>
            <div>
              <h3 className="card-title">Courses Info</h3>
              <p className="card-subtitle">Your enrolled courses</p>
            </div>
          </div>
          <div className="card-content">
            <div style={{marginTop: '15px'}}>
              <div style={{marginBottom: '10px', padding: '10px', background: '#f8f9fa', borderRadius: '8px'}}>
                <strong>Mathematics 101</strong><br />
                <small style={{color: '#666'}}>Prof. Johnson - Room 204</small>
              </div>
              <div style={{marginBottom: '10px', padding: '10px', background: '#f8f9fa', borderRadius: '8px'}}>
                <strong>Physics Advanced</strong><br />
                <small style={{color: '#666'}}>Prof. Smith - Room 301</small>
              </div>
              <div style={{padding: '10px', background: '#f8f9fa', borderRadius: '8px'}}>
                <strong>Computer Science</strong><br />
                <small style={{color: '#666'}}>Prof. Davis - Lab 102</small>
              </div>
            </div>
          </div>
        </div>

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
              <div style={{marginBottom: '10px', padding: '10px', background: '#fff3cd', borderRadius: '8px'}}>
                <strong>Math Assignment #5</strong><br />
                <small style={{color: '#856404'}}>Due: Tomorrow</small>
              </div>
              <div style={{marginBottom: '10px', padding: '10px', background: '#f8f9fa', borderRadius: '8px'}}>
                <strong>Physics Lab Report</strong><br />
                <small style={{color: '#666'}}>Due: In 3 days</small>
              </div>
              <div style={{padding: '10px', background: '#d1ecf1', borderRadius: '8px'}}>
                <strong>CS Project</strong><br />
                <small style={{color: '#0c5460'}}>Due: Next week</small>
              </div>
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
              <div style={{marginBottom: '10px', padding: '10px', background: '#f8d7da', borderRadius: '8px'}}>
                <strong>Mathematics Final</strong><br />
                <small style={{color: '#721c24'}}>December 15, 2024</small>
              </div>
              <div style={{marginBottom: '10px', padding: '10px', background: '#fff3cd', borderRadius: '8px'}}>
                <strong>Physics Midterm</strong><br />
                <small style={{color: '#856404'}}>December 20, 2024</small>
              </div>
              <div style={{padding: '10px', background: '#d1ecf1', borderRadius: '8px'}}>
                <strong>CS Final Project</strong><br />
                <small style={{color: '#0c5460'}}>January 5, 2025</small>
              </div>
            </div>
          </div>
        </div>

        {/* Study Graph Card */}
        <div className="dashboard-card study-graph-card">
          <div className="card-header">
            <div className="card-icon study-activity">
              <TrendingUpIcon />
            </div>
            <div>
              <h3 className="card-title">Study Activity</h3>
              <p className="card-subtitle">Last 7 days</p>
            </div>
          </div>
          <div className="card-content">
            <div className="study-graph">
              <div className="graph-bars">
                <div className="bar" style={{height: '20%'}}><span>Mon</span></div>
                <div className="bar" style={{height: '45%'}}><span>Tue</span></div>
                <div className="bar" style={{height: '30%'}}><span>Wed</span></div>
                <div className="bar" style={{height: '70%'}}><span>Thu</span></div>
                <div className="bar" style={{height: '85%'}}><span>Fri</span></div>
                <div className="bar" style={{height: '60%'}}><span>Sat</span></div>
                <div className="bar" style={{height: '40%'}}><span>Sun</span></div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}

export default StudentDashboard;
