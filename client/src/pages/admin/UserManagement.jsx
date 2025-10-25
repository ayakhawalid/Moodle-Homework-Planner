import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../Components/DashboardLayout';
import { useUserSyncContext } from '../../contexts/UserSyncContext';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Pagination,
  IconButton,
  Avatar
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import PermissionError from '../../Components/PermissionError';

const UserManagement = () => {
  const { user, isAdmin, refreshUser } = useUserSyncContext();
  const { getAccessTokenSilently } = useAuth0();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({});

  // Check if user has admin access (either real admin or debug mode)
  const hasAdminAccess = isAdmin || localStorage.getItem('adminOverride') === 'true';

  // Helper to always get a fresh token and call the API
  const fetchWithToken = async (url, options = {}) => {
    let token;
    try {
      token = await getAccessTokenSilently({
        authorizationParams: {
          audience: import.meta.env.VITE_AUTH0_AUDIENCE || 'https://moodle-homework-planner.onrender.com/api',
          scope: 'openid profile email offline_access'
        },
        ignoreCache: true
      });
    } catch (err) {
      // If user hasn't consented to these scopes yet, show error instead of redirecting
      const needsConsent = err?.error === 'consent_required' || (err?.message && err.message.includes('consent'));
      const missingRefresh = err?.message && err.message.includes('Missing Refresh Token');
      if (needsConsent || missingRefresh) {
        console.log('Consent issue detected, setting error message');
        setError('Additional permissions required. Please refresh the page to grant permissions.');
        setLoading(false);
        return null;
      }
      throw err;
    }

    const headers = {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`
    };

    return fetch(url, { ...options, headers });
  };

  const fetchUsers = async (pageNum = 1) => {
    try {
      setLoading(true);
      // Don't clear error - let fetchWithToken handle error state

      const base = import.meta.env.VITE_API_BASE_URL || 'https://moodle-homework-planner.onrender.com/api';
      const url = `${base.replace(/\/$/, '')}/users?page=${pageNum}&limit=10`;

      // use fetchWithToken to avoid sending an expired token
      const resp = await fetchWithToken(url);
      console.log('fetchWithToken response:', resp);
      if (!resp) {
        // fetchWithToken returned null due to consent issues
        // Error message should already be set by fetchWithToken
        console.log('fetchWithToken returned null, setting loading to false');
        setLoading(false);
        return;
      }
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Failed to fetch users: ${resp.status} ${text}`);
      }
      const data = await resp.json();

      console.log('API Response:', data);

      if (data && data.users) {
        setUsers(data.users);
        setTotalPages(data.pagination?.total_pages || 1);
      } else {
        console.warn('Unexpected response structure:', data);
        setUsers(Array.isArray(data) ? data : []);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError(err);
      setUsers([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasAdminAccess) {
      // First refresh roles from Auth0, then fetch users
      refreshRolesFromAuth0().then(() => {
        fetchUsers(page);
      });
    }
  }, [hasAdminAccess, page]);

  // Replace role update to use fetchWithToken (avoids expired token errors)
  const handleRoleChange = async () => {
    if (!selectedUser) return;

    try {
      setLoading(true);
      const base = import.meta.env.VITE_API_BASE_URL || 'https://moodle-homework-planner.onrender.com/api';
      const url = `${base.replace(/\/$/, '')}/users/${selectedUser._id}/role`;

      console.log('Updating role for user:', selectedUser);
      console.log('Current logged-in user:', user);
      console.log('Requesting URL:', url);
      console.log('New role:', newRole);

      const resp = await fetchWithToken(url, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole }),
        headers: { 'Content-Type': 'application/json' }
      });

      if (!resp.ok) {
        const text = await resp.text();
        console.error('Server response:', resp.status, text);
        
        if (resp.status === 403) {
          throw new Error(`Access Denied: You don't have admin privileges.\n\nYour current role in MongoDB: ${user?.role}\n\nPlease make sure your user account has role='admin' in the MongoDB database.`);
        }
        
        throw new Error(`Failed to update role: ${resp.status} ${text}`);
      }

      const result = await resp.json();
      console.log('Role update successful:', result);
      alert(`✅ Role updated successfully!\n\nUser: ${selectedUser.email}\nNew Role: ${newRole}\n\nUpdated in:\n- MongoDB: ✅\n- Auth0: ${result.auth0_updated ? '✅' : '⚠️ Not updated'}\n\nThe user needs to log out and log back in to see the new role.`);
      
      await fetchUsers(page);
      setRoleDialogOpen(false);
      setSelectedUser(null);
    } catch (err) {
      console.error('Failed to update role:', err);
      alert(err.message);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // Replace deactivate to use fetchWithToken
  const handleDeactivate = async (userId) => {
    const userToDelete = users.find(u => u._id === userId);
    if (!userToDelete) return;

    let confirmMessage = 'Are you sure you want to delete this user?';
    
    if (userToDelete.role === 'lecturer') {
      confirmMessage = 'WARNING: Deleting this lecturer will permanently delete ALL their courses, homework assignments, exams, and class schedules. Students enrolled in these courses will lose access to all course materials.\n\nAre you sure you want to proceed?';
    } else if (userToDelete.role === 'student') {
      confirmMessage = 'Deleting this student will remove them from all courses they are enrolled in.\n\nAre you sure you want to delete this user?';
    }

    if (window.confirm(confirmMessage)) {
      try {
        setLoading(true);
        const base = import.meta.env.VITE_API_BASE_URL || 'https://moodle-homework-planner.onrender.com/api';
        // Server expects DELETE /api/users/:id
        const url = `${base.replace(/\/$/, '')}/users/${userId}`;

        const resp = await fetchWithToken(url, { method: 'DELETE' });
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(`Failed to delete user: ${resp.status} ${text}`);
        }

        await fetchUsers(page);
      } catch (err) {
        console.error('Failed to delete user:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }
  };

  // Refresh roles from Auth0 when navigating to the page
  const refreshRolesFromAuth0 = async () => {
    try {
      console.log('Refreshing roles from Auth0 on page load...');
      
      const base = import.meta.env.VITE_API_BASE_URL || 'https://moodle-homework-planner.onrender.com/api';
      const url = `${base.replace(/\/$/, '')}/users/refresh-roles`;

      const resp = await fetchWithToken(url, { method: 'POST' });
      if (!resp) {
        // fetchWithToken returned null due to consent issues
        // Error message should already be set by fetchWithToken
        return;
      }
      if (!resp.ok) {
        const text = await resp.text();
        console.error(`Failed to refresh roles: ${resp.status} ${text}`);
        return;
      }

      const data = await resp.json();
      console.log('Roles refreshed from Auth0:', data);
    } catch (err) {
      console.error('Failed to refresh roles:', err);
      // Don't set error state for background refresh
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

  if (!hasAdminAccess) {
    return (
      <DashboardLayout userRole="admin">
        <div className="white-page-background">
          <PermissionError
            error={{ message: 'You need admin privileges to access user management.' }}
            onRetry={refreshUser}
          />
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout userRole="admin">
        <div className="white-page-background">
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="admin">
      <div className="white-page-background">
        <Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {typeof error === 'string' ? error : error.message}
        </Alert>
      )}

      <div className="dashboard-card">
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'rgba(149, 225, 211, 0.2)' }}>
                <TableCell sx={{ fontWeight: 'bold', color: '#333' }}>User</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#333' }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#333' }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#333' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#333' }}>Created</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#333' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
          <TableBody>
            {users && users.length > 0 ? users.map((u) => (
              <TableRow key={u._id}>
                <TableCell>
                  <Box display="flex" alignItems="center">
                    <Avatar 
                      src={u.picture} 
                      alt={u.name}
                      sx={{ mr: 2, width: 40, height: 40 }}
                    />
                    {u.name}
                  </Box>
                </TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Chip 
                    label={u.role || 'Pending'} 
                    color={getRoleColor(u.role)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={u.is_active ? 'Active' : 'Inactive'}
                    color={u.is_active ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setSelectedUser(u);
                      setNewRole(u.role || '');
                      setRoleDialogOpen(true);
                    }}
                    sx={{ color: '#95E1D3', '&:hover': { backgroundColor: 'rgba(149, 225, 211, 0.1)' } }}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDeactivate(u._id)}
                    disabled={u._id === user?._id || u._id === user?.id} // Can't deactivate self (DB _id or auth id)
                    sx={{ color: '#F38181', '&:hover': { backgroundColor: 'rgba(243, 129, 129, 0.1)' } }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="textSecondary">
                    {loading ? 'Loading users...' : 'No users found'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </TableContainer>
      </div>
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination 
            count={totalPages}
            page={page}
            onChange={(e, value) => setPage(value)}
            color="primary"
          />
        </Box>
      </Box>
      {/* Role Change Dialog */}
      <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)}>
        <DialogTitle>Change User Role</DialogTitle>
        <DialogContent>
          <TextField
            select
            label="Role"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            fullWidth
            margin="normal"
          >
            <MenuItem value="student">Student</MenuItem>
            <MenuItem value="lecturer">Lecturer</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setRoleDialogOpen(false)}
            sx={{ 
              borderColor: '#F38181', 
              color: '#F38181',
              '&:hover': { borderColor: '#e85a6b', backgroundColor: 'rgba(243, 129, 129, 0.1)' }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleRoleChange} 
            variant="contained"
            sx={{
              backgroundColor: '#95E1D3',
              color: '#333',
              '&:hover': { backgroundColor: '#7dd3c0' }
            }}
          >
            Update Role
          </Button>
        </DialogActions>
      </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default UserManagement;
