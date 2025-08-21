import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../Components/DashboardLayout';
import { apiService } from '../../services/api';
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
  Delete as DeleteIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import PermissionError from '../../Components/PermissionError';

const UserManagement = () => {
  const { user, isAdmin, refreshUser } = useUserSyncContext();
  const { getAccessTokenSilently, loginWithRedirect } = useAuth0();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [refreshingRoles, setRefreshingRoles] = useState(false);
  const [refreshResults, setRefreshResults] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({});

  // Check if user has admin access (either real admin or debug mode)
  const hasAdminAccess = isAdmin || localStorage.getItem('adminOverride') === 'true';

  // Helper to always get a fresh token and call the API
  const fetchWithToken = async (url, options = {}) => {
    const token = await getAccessTokenSilently({
      authorizationParams: {
        audience: import.meta.env.VITE_AUTH0_AUDIENCE || 'http://localhost:5000'
      },
      ignoreCache: true // forces a fresh token when needed
    });

    const headers = {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`
    };

    return fetch(url, { ...options, headers });
  };

  const fetchUsers = async (pageNum = 1) => {
    try {
      setLoading(true);
      setError(null);

      const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const url = `${base.replace(/\/$/, '')}/users?page=${pageNum}&limit=10`;

      // use fetchWithToken to avoid sending an expired token
      const resp = await fetchWithToken(url);
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
      fetchUsers(page);
    }
  }, [hasAdminAccess, page]);

  // Replace role update to use fetchWithToken (avoids expired token errors)
  const handleRoleChange = async () => {
    if (!selectedUser) return;

    try {
      setLoading(true);
      const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const url = `${base.replace(/\/$/, '')}/users/${selectedUser._id}/role`;

      const resp = await fetchWithToken(url, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole }),
        headers: { 'Content-Type': 'application/json' }
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Failed to update role: ${resp.status} ${text}`);
      }

      await fetchUsers(page);
      setRoleDialogOpen(false);
      setSelectedUser(null);
    } catch (err) {
      console.error('Failed to update role:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // Replace deactivate to use fetchWithToken
  const handleDeactivate = async (userId) => {
    if (window.confirm('Are you sure you want to deactivate this user?')) {
      try {
        setLoading(true);
        const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
        // Server expects DELETE /api/users/:id
        const url = `${base.replace(/\/$/, '')}/users/${userId}`;

        const resp = await fetchWithToken(url, { method: 'DELETE' });
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(`Failed to deactivate user: ${resp.status} ${text}`);
        }

        await fetchUsers(page);
      } catch (err) {
        console.error('Failed to deactivate user:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }
  };

  // Refresh roles from Auth0
  const handleRefreshRoles = async () => {
    try {
      setRefreshingRoles(true);
      setRefreshResults(null);
      setError(null);

      const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const url = `${base.replace(/\/$/, '')}/users/refresh-roles`;

      const resp = await fetchWithToken(url, { method: 'POST' });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Failed to refresh roles: ${resp.status} ${text}`);
      }

      const data = await resp.json();
      setRefreshResults(data);

      // Refresh the users list to show updated roles
      await fetchUsers(page);
    } catch (err) {
      console.error('Failed to refresh roles:', err);
      setError(err);
    } finally {
      setRefreshingRoles(false);
    }
  };

  const handleSyncRoles = async () => {
    if (!window.confirm('This will sync all user roles from Auth0. Continue?')) return;
    try {
      setLoading(true);

      // Try to get a token that includes offline_access (refresh token) and read:roles
      let token;
      try {
        token = await getAccessTokenSilently({
          authorizationParams: {
            audience: import.meta.env.VITE_AUTH0_AUDIENCE || 'http://localhost:5000',
            scope: 'openid profile email offline_access read:roles'
          },
          ignoreCache: true
        });
      } catch (err) {
        console.warn('Silent token acquisition failed for sync:', err);

        // If missing refresh token / consent is required, do an interactive login so user can grant offline_access
        const needsInteractive = err?.error === 'consent_required' || (err?.message && err.message.includes('Missing Refresh Token'));
        if (needsInteractive) {
          // This will redirect the admin to Auth0 to grant consent / get refresh token.
          await loginWithRedirect({
            authorizationParams: {
              audience: import.meta.env.VITE_AUTH0_AUDIENCE || 'http://localhost:5000',
              scope: 'openid profile email offline_access read:roles'
            }
          });
          return; // redirecting — sync will be started again by the admin after they return
        }

        // Fallback: obtain an access token without offline_access (no refresh token) to attempt the sync
        token = await getAccessTokenSilently({
          authorizationParams: {
            audience: import.meta.env.VITE_AUTH0_AUDIENCE || 'http://localhost:5000',
            scope: 'openid profile email read:roles'
          },
          ignoreCache: true
        });
      }

      const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const url = `${base.replace(/\/$/, '')}/users/refresh-roles`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Sync failed: ${response.status} ${text}`);
      }

      const result = await response.json();
      console.log('Role sync result:', result);
      await fetchUsers(page);
    } catch (err) {
      console.error('Failed to sync roles:', err);
      setError(err);
      alert('Failed to sync roles — check console and Auth0 logs.');
    } finally {
      setLoading(false);
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
        <PermissionError
          error={{ message: 'You need admin privileges to access user management.' }}
          onRetry={refreshUser}
        />
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

  return (
    <DashboardLayout userRole="admin">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">User Management</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={refreshingRoles ? <CircularProgress size={20} /> : <RefreshIcon />}
          onClick={handleRefreshRoles}
          disabled={refreshingRoles}
        >
          {refreshingRoles ? 'Refreshing...' : 'Refresh Roles from Auth0'}
        </Button>
      </Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.message}
        </Alert>
      )}

      {refreshResults && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <Typography variant="subtitle2">{refreshResults.message}</Typography>
          {refreshResults.summary && (
            <Typography variant="body2">
              Total: {refreshResults.summary.total},
              Updated: {refreshResults.summary.updated},
              Errors: {refreshResults.summary.errors}
            </Typography>
          )}
        </Alert>
      )}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Actions</TableCell>
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
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDeactivate(u._id)}
                    disabled={u._id === user?._id || u._id === user?.id} // Can't deactivate self (DB _id or auth id)
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
      <Box display="flex" justifyContent="center" mt={3}>
        <Pagination 
          count={totalPages}
          page={page}
          onChange={(e, value) => setPage(value)}
          color="primary"
        />
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
          <Button onClick={() => setRoleDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRoleChange} variant="contained">
            Update Role
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
};

export default UserManagement;
