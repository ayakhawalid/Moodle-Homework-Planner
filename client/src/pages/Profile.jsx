import React, { useEffect, useState } from 'react';
import { Box, Typography, TextField, Button, Grid, Avatar, CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import DashboardLayout from '../Components/DashboardLayout';
import { useUserSyncContext } from '../contexts/UserSyncContext';
import { apiService } from '../services/api';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';

function Profile() {
  const { user, refreshUser } = useUserSyncContext();
  const { logout } = useAuth0();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [data, setData] = useState({ name: '', full_name: '', username: '', picture: '' });
  const [usernameCheck, setUsernameCheck] = useState({ checking: false, available: null, message: '' });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  let usernameTimeout;
  const isValidUsername = (val) => /^[a-z0-9_.]{3,30}$/.test(val || '');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const profile = await apiService.user.getProfile();
      setData({
        name: profile.name || '',
        full_name: profile.full_name || '',
        username: profile.username || '',
        picture: profile.picture || ''
      });
    } catch (e) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const checkUsernameAvailability = (val) => {
    if (!val || !isValidUsername(val)) {
      setUsernameCheck({ checking: false, available: null, message: '' });
      return;
    }
    if (usernameTimeout) clearTimeout(usernameTimeout);
    setUsernameCheck((s) => ({ ...s, checking: true }));
    usernameTimeout = setTimeout(async () => {
      try {
        const res = await apiService.user.checkUsername(val);
        setUsernameCheck({ checking: false, available: !!res.available, message: '' });
      } catch (e) {
        setUsernameCheck({ checking: false, available: null, message: 'Check failed' });
      }
    }, 400);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await apiService.user.updateProfile({
        name: data.name,
        full_name: data.full_name,
        username: data.username,
        picture: data.picture
      });
      setSuccess('Profile updated successfully! Your changes have been saved to both the database and Auth0.');
      
      // Refresh the user data to show updated information
      await refreshUser();
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      setError('Please type "DELETE" to confirm account deletion');
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      await apiService.user.deleteAccount();
      
      // Clear local storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Logout from Auth0 and redirect to home
      await logout({
        logoutParams: {
          returnTo: window.location.origin
        }
      });
      
      navigate('/');
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to delete account');
      setDeleting(false);
    }
  };

  const openDeleteDialog = () => {
    setDeleteDialogOpen(true);
    setDeleteConfirmation('');
    setError(null);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeleteConfirmation('');
    setError(null);
  };

  const content = (
    <Box sx={{ p: 2 }}>
      <div className="dashboard-card" style={{ maxWidth: 800, margin: '0 auto' }}>
        <div className="card-content">
          <Typography variant="h3" component="h1" sx={{ 
            fontWeight: '600',
            fontSize: '2.5rem',
            fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
            letterSpacing: '-0.01em',
            lineHeight: '1.2',
            color: '#2c3e50',
            mb: 1
          }}>
            Edit Profile
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
            Manage your personal information and account settings
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          <Grid container spacing={2}>
            <Grid item xs={12} sm={3}>
              <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
                <Avatar src={data.picture} sx={{ width: 96, height: 96 }} />
                <TextField
                  label="Image URL"
                  value={data.picture}
                  onChange={(e) => setData({ ...data, picture: e.target.value })}
                  fullWidth
                />
              </Box>
            </Grid>
            <Grid item xs={12} sm={9}>
              <TextField
                label="Display Name"
                value={data.name}
                onChange={(e) => setData({ ...data, name: e.target.value })}
                fullWidth
                sx={{ mb: 2 }}
              />
              <TextField
                label="Full Name"
                value={data.full_name}
                onChange={(e) => setData({ ...data, full_name: e.target.value })}
                fullWidth
                sx={{ mb: 2 }}
              />
              <TextField
                label="Username"
                value={data.username}
                onChange={(e) => {
                  const v = e.target.value.toLowerCase();
                  setData({ ...data, username: v });
                  checkUsernameAvailability(v);
                }}
                helperText={
                  data.username && !isValidUsername(data.username)
                    ? 'Use 3-30 chars: a-z, 0-9, underscore, dot'
                    : usernameCheck.checking
                      ? 'Checking availability...'
                      : usernameCheck.available === true
                        ? 'Username available'
                        : usernameCheck.available === false
                          ? 'Username taken'
                          : ''
                }
                error={(data.username && !isValidUsername(data.username)) || usernameCheck.available === false}
                fullWidth
              />
            </Grid>
          </Grid>

          <Box mt={3} display="flex" gap={2}>
            <Button
              variant="contained"
              onClick={save}
              disabled={saving || (data.username && !isValidUsername(data.username)) || usernameCheck.available === false}
              sx={{ 
                backgroundColor: '#95E1D3', 
                color: '#333',
                '&:hover': { backgroundColor: '#7dd3c0' }
              }}
            >
              {saving ? <CircularProgress size={20} /> : 'Save Changes'}
            </Button>
            <Button 
              variant="contained" 
              onClick={load} 
              disabled={loading}
              sx={{ 
                backgroundColor: '#FCE38A',
                color: '#333',
                '&:hover': { backgroundColor: '#fbd65e' }
              }}
            >
              Reset
            </Button>
          </Box>

          {/* Danger Zone */}
          <Box mt={4} pt={3} borderTop="1px solid #e0e0e0">
            <Typography variant="h6" sx={{ color: '#F38181' }} gutterBottom>
              Danger Zone
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Once you delete your account, there is no going back. Please be certain.
            </Typography>
            <Button
              variant="outlined"
              onClick={openDeleteDialog}
              disabled={deleting}
              sx={{ 
                borderColor: '#F38181', 
                color: '#F38181',
                '&:hover': { borderColor: '#e85a6b', backgroundColor: 'rgba(243, 129, 129, 0.1)' }
              }}
            >
              Delete Account
            </Button>
          </Box>
        </div>
      </div>

      {/* Delete Account Dialog */}
      <Dialog open={deleteDialogOpen} onClose={closeDeleteDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#F38181' }}>Delete Account</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
          </Typography>
          
          {user?.role === 'lecturer' && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Warning:</strong> As a lecturer, deleting your account will also permanently delete all your courses, homework assignments, exams, and class schedules. Students enrolled in your courses will lose access to all course materials.
              </Typography>
            </Alert>
          )}
          
          {user?.role === 'student' && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                As a student, you will be removed from all courses you're enrolled in.
              </Typography>
            </Alert>
          )}

          <TextField
            label="Type DELETE to confirm"
            value={deleteConfirmation}
            onChange={(e) => setDeleteConfirmation(e.target.value)}
            fullWidth
            margin="normal"
            helperText="This action is irreversible"
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={closeDeleteDialog} 
            disabled={deleting}
            sx={{ 
              color: '#95E1D3',
              '&:hover': { backgroundColor: 'rgba(149, 225, 211, 0.1)' }
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteAccount}
            variant="contained"
            disabled={deleting || deleteConfirmation !== 'DELETE'}
            sx={{ 
              backgroundColor: '#F38181', 
              color: 'white',
              '&:hover': { backgroundColor: '#e85a6b' }
            }}
          >
            {deleting ? <CircularProgress size={20} /> : 'Delete Account'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  // Wait for user context to be loaded before determining role
  if (!user) {
    return (
      <DashboardLayout userRole="student">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh"><CircularProgress /></Box>
      </DashboardLayout>
    );
  }

  // Debug: Log the user role to see what's happening
  console.log('Profile component - user:', user);
  console.log('Profile component - user.role:', user.role);

  // Ensure we have a valid role, default to student if not
  const userRole = user?.role || 'student';
  console.log('Profile component - final userRole:', userRole);

  return (
    <DashboardLayout userRole={userRole}>
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      ) : (
        content
      )}
    </DashboardLayout>
  );
}

export default Profile;


