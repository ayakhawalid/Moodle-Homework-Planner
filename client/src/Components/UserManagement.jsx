import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem
} from '@mui/material';
import {
  Person as PersonIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useUsers, useUserStats, useApiMutation } from '../hooks/useApi';

const UserManagement = () => {
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  const [editDialog, setEditDialog] = useState({ open: false, user: null });
  
  // Fetch data using our API hooks
  const { data: users, loading: usersLoading, error: usersError, refetch: refetchUsers } = useUsers({
    page,
    role: roleFilter,
    limit: 10
  });
  
  const { data: stats, loading: statsLoading, error: statsError, refetch: refetchStats } = useUserStats();
  
  const { mutate, loading: mutating } = useApiMutation();

  const handleRoleUpdate = async (userId, newRole) => {
    try {
      const result = await mutate((api) => api.user.updateRole(userId, newRole));
      console.log('Role update result:', result);
      alert(`✅ Role updated successfully!\n\nThe user needs to log out and log back in to see the new role in Auth0.`);
      await refetchUsers();
      await refetchStats();
      setEditDialog({ open: false, user: null });
    } catch (error) {
      console.error('Failed to update user role:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      alert(`❌ Failed to update role:\n\n${errorMessage}\n\nPlease make sure:\n1. You are logged in as an admin\n2. The user exists in the database\n3. The backend server is running`);
    }
  };

  const handleUserDeactivate = async (userId) => {
    if (window.confirm('Are you sure you want to deactivate this user?')) {
      try {
        await mutate((api) => api.user.deactivate(userId));
        await refetchUsers();
        await refetchStats();
      } catch (error) {
        console.error('Failed to deactivate user:', error);
      }
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'error';
      case 'lecturer': return 'warning';
      case 'student': return 'success';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        User Management
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        Manage users in your MongoDB database. Users are automatically synced from Auth0.
      </Typography>

      {/* User Statistics */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={2}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <PersonIcon sx={{ fontSize: 40, color: '#1976d2', mb: 1 }} />
                <Typography variant="h4">{stats.total_users}</Typography>
                <Typography variant="body2" color="textSecondary">Total Users</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={2}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">{stats.roles.students}</Typography>
                <Typography variant="body2" color="textSecondary">Students</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={2}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main">{stats.roles.lecturers}</Typography>
                <Typography variant="body2" color="textSecondary">Lecturers</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={2}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="error.main">{stats.roles.admins}</Typography>
                <Typography variant="body2" color="textSecondary">Admins</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={2}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="info.main">{stats.verified_users}</Typography>
                <Typography variant="body2" color="textSecondary">Verified</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={2}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={() => {
                    refetchUsers();
                    refetchStats();
                  }}
                  disabled={usersLoading || statsLoading}
                >
                  Refresh
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Error Display */}
      {(usersError || statsError) && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Error loading data: {usersError?.message || statsError?.message}
        </Alert>
      )}

      {/* Users Table */}
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Users {users?.pagination && `(${users.pagination.total_users} total)`}
            </Typography>
            
            <TextField
              select
              label="Filter by Role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              size="small"
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="">All Roles</MenuItem>
              <MenuItem value="student">Students</MenuItem>
              <MenuItem value="lecturer">Lecturers</MenuItem>
              <MenuItem value="admin">Admins</MenuItem>
            </TextField>
          </Box>

          {usersLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : users?.users ? (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Last Login</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.users.map((user) => (
                    <TableRow key={user._id}>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip 
                          label={user.role} 
                          color={getRoleColor(user.role)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={user.email_verified ? 'Verified' : 'Unverified'}
                          color={user.email_verified ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Edit Role">
                          <IconButton 
                            size="small"
                            onClick={() => setEditDialog({ open: true, user })}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Deactivate">
                          <IconButton 
                            size="small"
                            onClick={() => handleUserDeactivate(user._id)}
                            disabled={mutating}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography>No users found</Typography>
          )}
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, user: null })}>
        <DialogTitle>Edit User Role</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Update role for: <strong>{editDialog.user?.name}</strong>
          </Typography>
          <TextField
            select
            fullWidth
            label="Role"
            defaultValue={editDialog.user?.role}
            id="role-select"
          >
            <MenuItem value="student">Student</MenuItem>
            <MenuItem value="lecturer">Lecturer</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, user: null })}>
            Cancel
          </Button>
          <Button 
            onClick={() => {
              const newRole = document.getElementById('role-select').value;
              handleRoleUpdate(editDialog.user._id, newRole);
            }}
            disabled={mutating}
          >
            {mutating ? <CircularProgress size={20} /> : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Instructions */}
      <Card sx={{ mt: 3, bgcolor: '#f8f9fa' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            How User Management Works
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Automatic Sync:</strong> Users are automatically created in MongoDB when they first log in with Auth0.
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Role Management:</strong> You can update user roles here, which will be reflected throughout the application.
          </Typography>
          <Typography variant="body2">
            <strong>Data Source:</strong> All user data comes from your MongoDB database, synced from Auth0 authentication.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default UserManagement;
