import React, { useState, useEffect } from 'react';
import { Grid, Card, CardContent, Typography, Box, Paper, Tabs, Tab } from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import UserManagement from '../../Components/UserManagement';
import UserSyncStatus from '../../Components/UserSyncStatus';
import { useUserStats } from '../../hooks/useApi';
import {
  People as UsersIcon,
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
  BarChart as BarChartIcon
} from '@mui/icons-material';
import DashboardLayout from '../../Components/DashboardLayout';
import '../../styles/AdminDashboard.css';

// Mock data for admin dashboard
const mockData = {
  totalUsers: 1247,
  totalStudents: 892,
  totalLecturers: 45,
  totalCourses: 23,
  totalAssignments: 156,
  systemUptime: '99.8%',
  activeUsers: 234,
  monthlyGrowth: 12.5
};

const StatCard = ({ title, value, icon, color, trend }) => (
  <Card className="stat-card" sx={{ height: '100%', background: `linear-gradient(135deg, ${color}20, ${color}10)` }}>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="h6" color="textSecondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" component="div" sx={{ color: color, fontWeight: 'bold' }}>
            {value}
          </Typography>
          {trend && (
            <Typography variant="body2" sx={{ color: trend > 0 ? '#4caf50' : '#f44336', mt: 1 }}>
              {trend > 0 ? '+' : ''}{trend}% from last month
            </Typography>
          )}
        </Box>
        <Box sx={{ color: color, opacity: 0.7 }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const QuickActionCard = ({ title, description, action, color }) => (
  <Card className="quick-action-card" sx={{ height: '100%', cursor: 'pointer', '&:hover': { transform: 'translateY(-2px)' } }}>
    <CardContent>
      <Typography variant="h6" gutterBottom sx={{ color: color }}>
        {title}
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        {description}
      </Typography>
      <Typography variant="button" sx={{ color: color, fontWeight: 'bold' }}>
        {action}
      </Typography>
    </CardContent>
  </Card>
);

const AdminDashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const { user } = useAuth();
  const { data: userStats, loading: statsLoading } = useUserStats();

  useEffect(() => {
    // Set loading based on stats loading
    setIsLoading(statsLoading);
  }, [statsLoading]);

  if (isLoading) {
    return (
      <DashboardLayout userRole="admin">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <Typography variant="h6">Loading dashboard...</Typography>
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="admin">
      <div className="admin-dashboard">
        {/* User Sync Status */}
        <UserSyncStatus showDetails={false} />

        <Box mb={3}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#333' }}>
            Welcome back, {user?.name || user?.email?.split('@')[0] || 'Admin'}!
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Here's what's happening with your platform today.
            {userStats && (
              <span style={{ marginLeft: '10px', color: '#4caf50' }}>
                • {userStats.total_users} users in database ✓
              </span>
            )}
          </Typography>
        </Box>

        {/* Admin Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="Dashboard Overview" />
            <Tab label="User Management" />
          </Tabs>
        </Box>

        {/* Tab Content */}
        {tabValue === 0 && (
          <>
            {/* Statistics Cards */}
            <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Users"
              value={userStats ? userStats.total_users.toLocaleString() : '0'}
              icon={<UsersIcon sx={{ fontSize: 40 }} />}
              color="#1976d2"
              trend={userStats ? '+' + ((userStats.total_users / 10) * 100).toFixed(1) + '%' : '0%'}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Students"
              value={userStats ? userStats.roles.students.toLocaleString() : '0'}
              icon={<SchoolIcon sx={{ fontSize: 40 }} />}
              color="#388e3c"
              trend={userStats ? ((userStats.roles.students / userStats.total_users) * 100).toFixed(1) + '%' : '0%'}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Lecturers"
              value={userStats ? userStats.roles.lecturers : '0'}
              icon={<UsersIcon sx={{ fontSize: 40 }} />}
              color="#f57c00"
              trend={userStats ? ((userStats.roles.lecturers / userStats.total_users) * 100).toFixed(1) + '%' : '0%'}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Verified Users"
              value={userStats ? userStats.verified_users.toLocaleString() : '0'}
              icon={<TrendingUpIcon sx={{ fontSize: 40 }} />}
              color="#7b1fa2"
              trend={userStats ? ((userStats.verified_users / userStats.total_users) * 100).toFixed(1) + '%' : '0%'}
            />
          </Grid>
        </Grid>

        {/* Quick Actions */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', color: '#333' }}>
              Quick Actions
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <QuickActionCard
              title="User Management"
              description="Add, edit, or remove users from the system"
              action="Manage Users →"
              color="#1976d2"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <QuickActionCard
              title="Course Management"
              description="Create new courses and manage existing ones"
              action="Manage Courses →"
              color="#388e3c"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <QuickActionCard
              title="System Settings"
              description="Configure platform settings and preferences"
              action="Open Settings →"
              color="#f57c00"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <QuickActionCard
              title="Analytics"
              description="View detailed analytics and reports"
              action="View Analytics →"
              color="#7b1fa2"
            />
          </Grid>
        </Grid>

        {/* Recent Activity */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, height: '300px' }}>
              <Typography variant="h6" gutterBottom>
                Recent Activity
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  Activity feed will be implemented here with real-time updates
                </Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, height: '300px' }}>
              <Typography variant="h6" gutterBottom>
                System Status
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  System monitoring dashboard will be implemented here
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
          </>
        )}

        {/* User Management Tab */}
        {tabValue === 1 && (
          <UserManagement />
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
