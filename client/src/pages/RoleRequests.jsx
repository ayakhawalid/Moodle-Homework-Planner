import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import DashboardLayout from '../Components/DashboardLayout';
import { apiService } from '../services/api';
import { useUserSyncContext } from '../contexts/UserSyncContext';
import {
  Box,
  Card,
  CardContent,
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
  const [selectedRole, setSelectedRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [myRequests, setMyRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

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
        return 'success';
      case 'rejected':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getCurrentRoleIcon = () => {
    if (isAdmin) return <AdminIcon />;
    if (isLecturer) return <SchoolIcon />;
    if (isStudent) return <PersonIcon />;
    return <PersonIcon />;
  };

  return (
    <DashboardLayout userRole={user?.role}>
      <Box p={3}>
        <Typography variant="h4" gutterBottom>
          Role Requests
        </Typography>
        
        <Typography variant="body1" color="textSecondary" gutterBottom>
          Request to change your role or view your existing requests
        </Typography>

        {/* Current Role Card */}
        <Card sx={{ mb: 3, bgcolor: '#f8f9fa' }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              {getCurrentRoleIcon()}
              <Typography variant="h6">
                Current Role: {user?.role || 'Student'}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* New Request Card */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* My Requests Card */}
        <Card>
          <CardContent>
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
                        color={getStatusColor(request.status)}
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
          </CardContent>
        </Card>
      </Box>
    </DashboardLayout>
  );
};

export default RoleRequests;
