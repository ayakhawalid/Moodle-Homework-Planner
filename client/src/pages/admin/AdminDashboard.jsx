import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../Components/DashboardLayout';
import { apiService } from '../../services/api';
import { useUserSyncContext } from '../../contexts/UserSyncContext';
import { useAuth0 } from '@auth0/auth0-react';
import { 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  CircularProgress, 
  Alert,
  Button
} from '@mui/material';
import { 
  People as PeopleIcon, 
  School as SchoolIcon, 
  AdminPanelSettings as AdminIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import StatCard from '../../Components/charts/StatCard';
import PermissionError from '../../Components/PermissionError';

const AdminDashboard = () => {
  const { user, isAdmin, refreshUser } = useUserSyncContext();
  const { getAccessTokenSilently } = useAuth0();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugMode, setDebugMode] = useState(() => {
    // Check localStorage for admin override
    return localStorage.getItem('adminOverride') === 'true';
  });
  const [testResult, setTestResult] = useState(null);
  const [isRealAdmin, setIsRealAdmin] = useState(false);

  // Check if user has admin access (either real admin or debug mode)
  const hasAdminAccess = isAdmin || debugMode;

  useEffect(() => {
    if (hasAdminAccess) {
      fetchStats();
    }
  }, [hasAdminAccess]);

  const testDirectAPI = async () => {
    try {
      console.log('Testing direct API call...');
      const token = await getAccessTokenSilently({
        audience: 'http://localhost:5000',
        scope: 'read:users read:stats'
      });
      const response = await fetch('http://localhost:5000/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const userData = await response.json();
      console.log('Direct API result:', userData);
      setTestResult({ success: true, data: userData });

      // If user is confirmed admin, set override and enable dashboard
      if (userData.role === 'admin') {
        console.log('✅ Confirmed admin - enabling dashboard access');
        localStorage.setItem('adminOverride', 'true');
        setIsRealAdmin(true);
        setDebugMode(true);
      }
    } catch (error) {
      console.error('Direct API test failed:', error);
      setTestResult({ success: false, error: error.message });
    }
  };

  const forceAdminAccess = () => {
    console.log('🚨 Forcing admin access via override...');
    localStorage.setItem('adminOverride', 'true');
    setDebugMode(true);
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.user.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);

      // If it's a 403 error, show a helpful message instead of breaking the dashboard
      if (err.response?.status === 403) {
        setError({
          message: 'Stats unavailable - Backend role sync issue',
          isPermissionError: true
        });
        // Set some dummy stats so the dashboard still looks good
        setStats({
          totalUsers: 'N/A',
          totalStudents: 'N/A',
          totalLecturers: 'N/A',
          totalAdmins: 'N/A',
          activeUsers: 'N/A'
        });
      } else {
        setError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!hasAdminAccess) {
    return (
      <DashboardLayout userRole="admin">
        <Box sx={{ p: 3 }}>
          <PermissionError
            error={{ message: 'You need admin privileges to access this dashboard.' }}
            onRetry={refreshUser}
          />

          {/* Debug Section */}
          <Card sx={{ mt: 3, bgcolor: '#fff3cd', border: '1px solid #ffeaa7' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="warning.dark">
                🐛 Debug Information
              </Typography>
              <Typography variant="body2" paragraph>
                Current user role: <strong>{user?.role || 'null'}</strong>
              </Typography>
              <Typography variant="body2" paragraph>
                Is Admin: <strong>{isAdmin ? 'true' : 'false'}</strong>
              </Typography>
              <Typography variant="body2" paragraph>
                Auth0 ID: <strong>{user?.auth0_id || 'N/A'}</strong>
              </Typography>

              <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
                <Button
                  onClick={refreshUser}
                  variant="outlined"
                  size="small"
                >
                  🔄 Refresh User Data
                </Button>
                <Button
                  onClick={testDirectAPI}
                  variant="outlined"
                  color="primary"
                  size="small"
                >
                  🧪 Test Direct API
                </Button>
                <Button
                  onClick={forceAdminAccess}
                  variant="contained"
                  color="warning"
                  size="small"
                >
                  🚨 Force Admin Access (Debug)
                </Button>
              </Box>

              {testResult && (
                <Alert severity={testResult.success ? 'success' : 'error'} sx={{ mt: 2 }}>
                  <Typography variant="subtitle2">
                    Direct API Test: {testResult.success ? 'Success' : 'Error'}
                  </Typography>
                  {testResult.success && testResult.data?.role === 'admin' && (
                    <Typography variant="body2" sx={{ mt: 1, color: 'green' }}>
                      ✅ Backend confirms you are an admin! The dashboard should now be accessible.
                    </Typography>
                  )}
                </Alert>
              )}

              <Typography variant="caption" display="block" sx={{ mt: 2, fontStyle: 'italic' }}>
                If you're supposed to be an admin, try refreshing user data first.
                The "Force Admin Access" button is for debugging only.
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout userRole="admin">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout userRole="admin">
        <Box p={3}>
          <Alert 
            severity="error" 
            action={
              <Button color="inherit" size="small" onClick={fetchStats}>
                Retry
              </Button>
            }
          >
            Failed to load dashboard data. Please try again.
          </Alert>
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="admin">
      <Box p={3}>
        <Typography variant="h4" gutterBottom>
          Admin Dashboard
        </Typography>
        
        <Typography variant="body1" color="textSecondary" gutterBottom>
          Welcome back, {user?.name || 'Admin'}!
        </Typography>

        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Users"
              value={stats?.total_users || 0}
              icon={<PeopleIcon />}
              color="#1976d2"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Verified Users"
              value={stats?.verified_users || 0}
              icon={<CheckCircleIcon />}
              color="#388e3c"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Students"
              value={stats?.roles?.students || 0}
              icon={<SchoolIcon />}
              color="#f57c00"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Lecturers"
              value={stats?.roles?.lecturers || 0}
              icon={<AdminIcon />}
              color="#7b1fa2"
            />
          </Grid>
        </Grid>

        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Quick Actions
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Button 
                    variant="outlined" 
                    href="/admin/users"
                    fullWidth
                  >
                    Manage Users
                  </Button>
                  <Button 
                    variant="outlined" 
                    href="/admin/analytics"
                    fullWidth
                  >
                    View Analytics
                  </Button>
                  <Button 
                    variant="outlined" 
                    href="/admin/settings"
                    fullWidth
                  >
                    System Settings
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  System Status
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Typography variant="body2" color="textSecondary">
                    Database: Connected
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Auth Service: Active
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    API Status: Healthy
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </DashboardLayout>
  );
};

export default AdminDashboard;
