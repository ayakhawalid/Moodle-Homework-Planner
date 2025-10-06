import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useLocation } from 'react-router-dom';
import DashboardLayout from '../Components/DashboardLayout';
import { apiService } from '../services/api';
import { useUserSyncContext } from '../contexts/UserSyncContext';
import {
  Box,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  Divider
} from '@mui/material';
import { 
  School as SchoolIcon,
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon
  
} from '@mui/icons-material';

const RoleRequests = () => {
  const { user, isAdmin, isLecturer, isStudent } = useUserSyncContext();
  const { getAccessTokenSilently } = useAuth0();
  const location = useLocation();
  const [selectedRole, setSelectedRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [myRequests, setMyRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  // Determine navbar context based on referrer or current context
  const getNavbarContext = () => {
    // Check if we came from a specific dashboard
    const referrer = document.referrer;
    console.log('Referrer:', referrer);
    
    if (referrer && referrer.includes('/lecturer/')) {
      console.log('Detected lecturer context from referrer');
      return 'lecturer';
    } else if (referrer && referrer.includes('/student/')) {
      console.log('Detected student context from referrer');
      return 'student';
    } else if (referrer && referrer.includes('/admin/')) {
      console.log('Detected admin context from referrer');
      return 'admin';
    }
    
    // Check session storage for context
    const dashboardContext = sessionStorage.getItem('dashboardContext');
    if (dashboardContext) {
      console.log('Using context from session storage:', dashboardContext);
      return dashboardContext;
    }
    
    // Fallback: use user's current role from context
    console.log('User context:', { isLecturer, isStudent, isAdmin, role: user?.role });
    
    // If user has multiple roles, prioritize based on current context
    if (isLecturer && !isStudent && !isAdmin) return 'lecturer';
    if (isStudent && !isLecturer && !isAdmin) return 'student';
    if (isAdmin && !isLecturer && !isStudent) return 'admin';
    
    // If user has multiple roles, use the primary role
    if (isLecturer) return 'lecturer';
    if (isStudent) return 'student';
    if (isAdmin) return 'admin';
    
    return user?.role || 'student';
  };

  // Load user's existing role requests
  useEffect(() => {
    loadMyRequests();
  }, []);

  const loadMyRequests = async () => {
    try {
      setLoadingRequests(true);
      const requests = await apiService.roleRequests.getMyRequests();
      setMyRequests(requests);
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleSubmitRequest = async () => {
    if (!selectedRole) {
      setError('Please select a role');
      return;
    }

    if (selectedRole === user?.role) {
      setError('You are already a ' + selectedRole);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await apiService.roleRequests.submit(selectedRole);
      setSuccess('Role request submitted successfully! Admin will review your request.');
      setSelectedRole('');
      loadMyRequests(); // Reload requests to show the new one
    } catch (err) {
      console.error('Failed to submit role request:', err);
      setError(err.response?.data?.error || 'Failed to submit role request');
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'lecturer':
        return <SchoolIcon />;
      case 'admin':
        return <AdminIcon />;
      case 'student':
        return <PersonIcon />;
      default:
        return <PersonIcon />;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircleIcon color="success" />;
      case 'rejected':
        return <CancelIcon color="error" />;
      case 'pending':
        return <ScheduleIcon color="warning" />;
      default:
        return <ScheduleIcon />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return {
          backgroundColor: 'rgba(149, 225, 211, 0.3)',
          color: '#333',
          border: '1px solid #95E1D3'
        };
      case 'rejected':
        return {
          backgroundColor: 'rgba(243, 129, 129, 0.3)',
          color: '#333',
          border: '1px solid #F38181'
        };
      case 'pending':
        return {
          backgroundColor: 'rgba(252, 227, 138, 0.3)',
          color: '#333',
          border: '1px solid #FCE38A'
        };
      default:
        return {
          backgroundColor: 'rgba(149, 225, 211, 0.2)',
          color: '#333',
          border: '1px solid #95E1D3'
        };
    }
  };

  const getCurrentRoleIcon = () => {
    if (isAdmin) return <AdminIcon />;
    if (isLecturer) return <SchoolIcon />;
    if (isStudent) return <PersonIcon />;
    return <PersonIcon />;
  };

  return (
    <DashboardLayout userRole={getNavbarContext()}>
      <Box p={3}>
        <Typography variant="h3" component="h1" sx={{ 
          fontWeight: '600',
          fontSize: '2.5rem',
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
          letterSpacing: '-0.01em',
          lineHeight: '1.2',
          color: '#2c3e50',
          mb: 1
        }}>
          Role Requests
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
          Request to change your role or view your existing requests
        </Typography>

        {/* Current Role Card */}
        <div className="dashboard-card" style={{ marginBottom: '24px' }}>
          <div className="card-content">
            <Box display="flex" alignItems="center" gap={2}>
              {getCurrentRoleIcon()}
              <Typography variant="h6">
                Current Role: {user?.role || 'Student'}
              </Typography>
            </Box>
          </div>
        </div>

        {/* New Request Card */}
        <div className="dashboard-card" style={{ marginBottom: '24px' }}>
          <div className="card-content">
            <Typography variant="h6" gutterBottom>
              Request Role Change
            </Typography>
            
            <Box display="flex" gap={2} alignItems="flex-end" sx={{ mb: 2 }}>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Request to become</InputLabel>
                <Select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  label="Request to become"
                  disabled={loading}
                >
                  <MenuItem value="student">
                    <Box display="flex" alignItems="center" gap={1}>
                      <PersonIcon />
                      Student
                    </Box>
                  </MenuItem>
                  <MenuItem value="lecturer">
                    <Box display="flex" alignItems="center" gap={1}>
                      <SchoolIcon />
                      Lecturer
                    </Box>
                  </MenuItem>
                  <MenuItem value="admin">
                    <Box display="flex" alignItems="center" gap={1}>
                      <AdminIcon />
                      Admin
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
              
              <Button
                variant="contained"
                onClick={handleSubmitRequest}
                disabled={loading || !selectedRole || selectedRole === user?.role}
                startIcon={loading ? <CircularProgress size={20} /> : null}
                sx={{ 
                  backgroundColor: '#95E1D3', 
                  color: '#333',
                  '&:hover': { backgroundColor: '#7dd3c0' }
                }}
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </Button>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {success}
              </Alert>
            )}
          </div>
        </div>

        {/* My Requests Card */}
        <div className="dashboard-card">
          <div className="card-content">
            <Typography variant="h6" gutterBottom>
              My Role Requests
            </Typography>
            
            {loadingRequests ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : myRequests.length === 0 ? (
              <Typography color="textSecondary">
                No role requests found. Submit a request above to get started.
              </Typography>
            ) : (
              <Box>
                {myRequests.map((request, index) => (
                  <Box key={request._id || index}>
                    <Box display="flex" alignItems="center" gap={2} p={2}>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getStatusIcon(request.status)}
                        <Typography variant="body1">
                          Request to become: <strong>{request.desired_role}</strong>
                        </Typography>
                      </Box>
                      
                      <Chip
                        label={request.status}
                        sx={getStatusColor(request.status)}
                        size="small"
                      />
                    </Box>
                    
                    <Box px={2} pb={2}>
                      <Typography variant="caption" color="textSecondary">
                        Submitted: {new Date(request.created_at).toLocaleDateString()}
                      </Typography>
                      
                      {request.note && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          <strong>Note:</strong> {request.note}
                        </Typography>
                      )}
                    </Box>
                    
                    {index < myRequests.length - 1 && <Divider />}
                  </Box>
                ))}
              </Box>
            )}
          </div>
        </div>
      </Box>
    </DashboardLayout>
  );
};

export default RoleRequests;
