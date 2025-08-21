import React from 'react';
import { Grid, Box, Typography, Alert } from '@mui/material';
import DashboardLayout from '../../Components/DashboardLayout';
import StatCard from '../../Components/charts/StatCard';
import ProgressChart from '../../Components/charts/ProgressChart';
import { useAuth } from '../../hooks/useAuth';
import { useAuth0 } from '@auth0/auth0-react';

import { useUserSyncContext } from '../../contexts/UserSyncContext';
import UserSyncStatus from '../../Components/UserSyncStatus';
import {
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
  Quiz as QuizIcon,
  School as SchoolIcon,
  Timer as TimerIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import '../../styles/DashboardLayout.css';

// Mock data for charts
const studyProgressData = {
  categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  values: [2, 3, 1, 4, 2, 5, 3],
  seriesName: 'Study Hours',
  yAxisTitle: 'Hours'
};

function StudentDashboard() {
  const { user } = useAuth();
  const { user: auth0User } = useAuth0();
  const { syncStatus } = useUserSyncContext();

  // Get user name with multiple fallbacks
  const getUserName = () => {
    // Try from our processed user object first
    if (user?.name && user.name !== 'User') {
      return user.name;
    }

    // Try directly from Auth0 user object
    if (auth0User) {
      const name = auth0User.name ||
                   auth0User.nickname ||
                   auth0User.given_name ||
                   auth0User.email?.split('@')[0];
      if (name) return name;
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

        {/* Statistics Cards */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Study Hours"
              value="24h"
              icon={<TimerIcon sx={{ fontSize: 40 }} />}
              color="#1976d2"
              trend={12.5}
              subtitle="This week"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Pending Tasks"
              value="8"
              icon={<AssignmentIcon sx={{ fontSize: 40 }} />}
              color="#f57c00"
              subtitle="Due this week"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Completed"
              value="15"
              icon={<CheckCircleIcon sx={{ fontSize: 40 }} />}
              color="#4caf50"
              trend={8.2}
              subtitle="This month"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Courses"
              value="6"
              icon={<SchoolIcon sx={{ fontSize: 40 }} />}
              color="#7b1fa2"
              subtitle="Active"
            />
          </Grid>
        </Grid>

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
            <div className="dashboard-card" style={{ height: '100%' }}>
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
          </Grid>
        </Grid>

        {/* Dashboard Grid */}
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



        </div>
      </Box>
    </DashboardLayout>
  );
}

export default StudentDashboard;