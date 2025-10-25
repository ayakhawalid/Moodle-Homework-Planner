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
  const [roleRequests, setRoleRequests] = useState([]);

  // Check if user has admin access (either real admin or debug mode)
  const hasAdminAccess = isAdmin || debugMode;

  useEffect(() => {
    if (hasAdminAccess) {
      fetchStats();
      loadRoleRequests();
    }
  }, [hasAdminAccess]);

  const loadRoleRequests = async () => {
    try {
      const items = await apiService.roleRequests.list('pending');
      setRoleRequests(items);
    } catch (e) {
      console.error('Failed to load role requests', e);
      setRoleRequests([]);
    }
  };

  const testDirectAPI = async () => {
    try {
      console.log('Testing direct API call...');
      const token = await getAccessTokenSilently({
        audience: import.meta.env.VITE_AUTH0_AUDIENCE || 'https://moodle-homework-planner.onrender.com/api',
        scope: 'read:users read:stats'
      });
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://moodle-homework-planner.onrender.com/api'}/users/profile`, {
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
      console.log('Fetching admin dashboard stats...');
      const data = await apiService.user.getStats();
      console.log('Stats fetched successfully:', data);
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      console.error('Error response:', err.response);
      console.error('Error status:', err.response?.status);
      console.error('Error data:', err.response?.data);

      // If it's a 403 error, show a helpful message instead of breaking the dashboard
      if (err.response?.status === 403) {
        console.error('403 Forbidden - User lacks read:stats permission or admin role');
        setError({
          message: 'Stats unavailable - Backend role sync issue',
          isPermissionError: true
        });
        // Set some dummy stats so the dashboard still looks good
        setStats({
          total_users: 'N/A',
          verified_users: 'N/A',
          roles: {
            students: 'N/A',
            lecturers: 'N/A',
            admins: 'N/A'
          }
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
          <div className="dashboard-card" style={{ marginTop: '24px' }}>
            <div className="card-header">
              <div className="card-icon accent">
                <AdminIcon />
              </div>
              <div>
                <h3 className="card-title">🐛 Debug Information</h3>
                <p className="card-subtitle">System diagnostics</p>
              </div>
            </div>
            <div className="card-content">
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
                  variant="contained"
                  size="small"
                  sx={{ 
                    backgroundColor: '#95E1D3', 
                    color: '#333',
                    '&:hover': { backgroundColor: '#7dd3c0' }
                  }}
                >
                  🔄 Refresh User Data
                </Button>
                <Button
                  onClick={testDirectAPI}
                  variant="contained"
                  size="small"
                  sx={{ 
                    backgroundColor: '#D6F7AD', 
                    color: '#333',
                    '&:hover': { backgroundColor: '#c8f299' }
                  }}
                >
                  🧪 Test Direct API
                </Button>
                <Button
                  onClick={forceAdminAccess}
                  variant="contained"
                  size="small"
                  sx={{ 
                    backgroundColor: '#F38181', 
                    color: 'white',
                    '&:hover': { backgroundColor: '#e85a6b' }
                  }}
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
            </div>
          </div>
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
      <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Users"
              value={stats?.total_users || 0}
              icon={<PeopleIcon />}
              color="#95E1D3"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Verified Users"
              value={stats?.verified_users || 0}
              icon={<CheckCircleIcon />}
              color="#D6F7AD"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Students"
              value={stats?.roles?.students || 0}
              icon={<SchoolIcon />}
              color="#FCE38A"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Lecturers"
              value={stats?.roles?.lecturers || 0}
              icon={<AdminIcon />}
              color="#F38181"
            />
          </Grid>
        </Grid>

        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} md={6}>
            <div className="dashboard-card">
              <div className="card-header">
                <div className="card-icon primary">
                  <PeopleIcon />
                </div>
                <div>
                  <h3 className="card-title">Quick Actions</h3>
                  <p className="card-subtitle">Manage your system</p>
                </div>
              </div>
              <div className="card-content">
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Button 
                    variant="contained" 
                    href="/admin/users"
                    fullWidth
                    sx={{ 
                      backgroundColor: '#95E1D3', 
                      color: '#333',
                      '&:hover': { backgroundColor: '#7dd3c0' }
                    }}
                  >
                    Manage Users
                  </Button>
                  <Button 
                    variant="contained" 
                    href="/admin/analytics"
                    fullWidth
                    sx={{ 
                      backgroundColor: '#D6F7AD', 
                      color: '#333',
                      '&:hover': { backgroundColor: '#c8f299' }
                    }}
                  >
                    View Analytics
                  </Button>
                  <Button 
                    variant="contained" 
                    href="/admin/settings"
                    fullWidth
                    sx={{ 
                      backgroundColor: '#FCE38A', 
                      color: '#333',
                      '&:hover': { backgroundColor: '#fbd65e' }
                    }}
                  >
                    System Settings
                  </Button>
                </Box>
              </div>
            </div>
          </Grid>

          <Grid item xs={12} md={6}>
            <div className="dashboard-card" style={{ minHeight: '400px' }}>
              <div className="card-header">
                <div className="card-icon accent">
                  <CheckCircleIcon />
                </div>
                <div>
                  <h3 className="card-title">Pending Role Requests</h3>
                  <p className="card-subtitle">Manage user permissions</p>
                </div>
              </div>
              <div className="card-content" style={{ padding: '20px' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Button 
                    size="small" 
                    onClick={loadRoleRequests}
                    sx={{ 
                      backgroundColor: '#F38181', 
                      color: 'white',
                      '&:hover': { backgroundColor: '#e85a6b' }
                    }}
                  >
                    Refresh
                  </Button>
                </Box>

                {roleRequests && roleRequests.length > 0 ? (
                  roleRequests.map((rr) => (
                    <Box key={rr._id} sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start', 
                      py: 2, 
                      px: 2,
                      borderBottom: '1px solid #eee', 
                      mb: 2,
                      backgroundColor: 'rgba(255, 255, 255, 0.5)',
                      borderRadius: '8px'
                    }}>
                      <Box sx={{ flex: 1, mr: 2 }}>
                        <Typography variant="body1" sx={{ fontWeight: 'medium', mb: 0.5 }}>
                          {rr.user?.name || rr.user?.email}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Requested Role: <strong>{rr.desired_role}</strong>
                        </Typography>
                        {rr.user?.email && (
                          <Typography variant="caption" color="textSecondary" display="block">
                            Email: {rr.user.email}
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                        <Button 
                          size="small" 
                          variant="contained" 
                          onClick={async () => {
                            try {
                              const result = await apiService.roleRequests.approve(rr._id);
                              console.log('Role request approved:', result);
                              alert(`✅ Role updated successfully!\n\nUser: ${rr.user?.email}\nOld Role: ${result.data?.oldRole}\nNew Role: ${result.data?.newRole}\n\nThe user needs to log out and log back in to see the new role.`);
                              loadRoleRequests();
                              fetchStats();
                            } catch (error) {
                              console.error('Failed to approve role request:', error);
                              alert(`❌ Failed to approve role request:\n${error.response?.data?.error || error.message}`);
                            }
                          }}
                          sx={{ 
                            backgroundColor: '#95E1D3', 
                            color: 'white',
                            '&:hover': { backgroundColor: '#7dd3c0' }
                          }}
                        >
                          Approve
                        </Button>
                        <Button 
                          size="small" 
                          variant="outlined" 
                          onClick={async () => {
                            try {
                              await apiService.roleRequests.reject(rr._id);
                              loadRoleRequests();
                            } catch (error) {
                              console.error('Failed to reject role request:', error);
                              alert('Failed to reject role request. Please try again.');
                            }
                          }}
                          sx={{ 
                            borderColor: '#F38181', 
                            color: '#F38181',
                            '&:hover': { borderColor: '#e85a6b', backgroundColor: 'rgba(243, 129, 129, 0.1)' }
                          }}
                        >
                          Reject
                        </Button>
                      </Box>
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="textSecondary">No pending requests.</Typography>
                )}
              </div>
            </div>
          </Grid>
        </Grid>
        </Box>
    </DashboardLayout>
  );
};

export default AdminDashboard;
