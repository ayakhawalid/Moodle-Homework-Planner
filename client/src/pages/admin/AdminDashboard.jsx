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
  const { user, isAdmin, refreshUser, syncStatus, error: syncError } = useUserSyncContext();
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

  // Wait for sync to complete before checking access
  // Check if user has admin access (either real admin or debug mode)
  const hasAdminAccess = (syncStatus === 'synced' && isAdmin) || debugMode;
  const isStillSyncing = syncStatus === 'syncing' || syncStatus === 'idle';

  // Log user data for debugging
  useEffect(() => {
    console.log('AdminDashboard - User sync status:', syncStatus);
    console.log('AdminDashboard - User data:', user);
    console.log('AdminDashboard - Is Admin:', isAdmin);
    console.log('AdminDashboard - Has Admin Access:', hasAdminAccess);
    if (syncError) {
      console.error('AdminDashboard - Sync error:', syncError);
    }
  }, [user, syncStatus, isAdmin, hasAdminAccess, syncError]);

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
      // Auth0 identifier does NOT include /api
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const baseUrlWithoutApi = apiBaseUrl.replace(/\/api$/, '');
      const audience = import.meta.env.VITE_AUTH0_AUDIENCE || baseUrlWithoutApi;
      
      const token = await getAccessTokenSilently({
        audience: audience,
        scope: 'read:users read:stats'
      });
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://moodle-homework-planner.onrender.com'}/api/users/profile`, {
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

  // Show loading state while syncing
  if (isStillSyncing) {
    return (
      <DashboardLayout userRole="admin">
        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="body1">Syncing user profile...</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Please wait while we verify your permissions.
          </Typography>
        </Box>
      </DashboardLayout>
    );
  }

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
                Sync Status: <strong>{syncStatus || 'unknown'}</strong>
              </Typography>
              <Typography variant="body2" paragraph>
                Current user role: <strong>{user?.role || 'null'}</strong>
              </Typography>
              <Typography variant="body2" paragraph>
                Is Admin: <strong>{isAdmin ? 'true' : 'false'}</strong>
              </Typography>
              <Typography variant="body2" paragraph>
                Auth0 ID: <strong>{user?.auth0_id || user?.auth0User?.sub || 'N/A'}</strong>
              </Typography>
              <Typography variant="body2" paragraph>
                User Email: <strong>{user?.email || user?.auth0User?.email || 'N/A'}</strong>
              </Typography>
              {syncError && (
                <Typography variant="body2" paragraph color="error">
                  Sync Error: <strong>{syncError.message || JSON.stringify(syncError)}</strong>
                </Typography>
              )}
              <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 1 }}>
                <Typography variant="body2" paragraph sx={{ mb: 1 }}>
                  <strong>Full User Object:</strong>
                </Typography>
                <Box
                  component="pre"
                  sx={{
                    fontSize: '0.75rem',
                    overflow: 'auto',
                    maxHeight: '200px',
                    m: 0,
                    p: 1,
                    bgcolor: 'rgba(0,0,0,0.02)',
                    borderRadius: 0.5,
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                >
                  {JSON.stringify(user, null, 2)}
                </Box>
              </Box>

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
          <Grid item xs={12}>
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
                              await apiService.roleRequests.approve(rr._id);
                              loadRoleRequests();
                              fetchStats();
                            } catch (error) {
                              console.error('Failed to approve role request:', error);
                              alert(`❌ Failed to approve role request:\n${error.response?.data?.error || error.message}`);
                            }
                          }}
                          sx={{ 
                            backgroundColor: '#D6F7AD', 
                            color: '#333',
                            '&:hover': { backgroundColor: '#c8f299', color: '#333' }
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
                            borderColor: 'rgba(0,0,0,0.2)', 
                            color: '#333',
                            '&:hover': { 
                              borderColor: 'rgba(0,0,0,0.3)', 
                              backgroundColor: 'rgba(0,0,0,0.04)', 
                              color: '#333' 
                            }
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
