import React, { useEffect, useState } from 'react';
import { Box, Typography, TextField, Button, Grid, Avatar, CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import DashboardLayout from '../Components/DashboardLayout';
import { useUserSyncContext } from '../contexts/UserSyncContext';
import { apiService } from '../services/api';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import '../styles/HomeworkCard.css';

function Profile() {
  const { user, refreshUser } = useUserSyncContext();
  const { logout, user: auth0User } = useAuth0();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [data, setData] = useState({ name: '', full_name: '', username: '', picture: '', student_id: '' });
  const [usernameCheck, setUsernameCheck] = useState({ checking: false, available: null, message: '' });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [profileDebug, setProfileDebug] = useState(null);

  let usernameTimeout;
  const isValidUsername = (val) => /^[a-z0-9_.]{3,30}$/.test(val || '');
  const isValidId = (val) => !val || /^\d{9}$/.test(val);

  const load = async () => {
    setLoading(true);
    setError(null);
    setProfileDebug(null);
    try {
      const profile = await apiService.user.getProfile();
      const dataFromApi = profile?.data ?? profile;
      const emailLocal = (dataFromApi?.email || '').split('@')[0];
      const rawUsername = dataFromApi?.username ?? '';
      const isUsernameEmailPrefix = !!rawUsername && rawUsername === emailLocal;

      if (typeof window !== 'undefined' && window.location.search.includes('profile_debug=1')) {
        const debug = {
          rawProfileKeys: profile ? Object.keys(profile) : [],
          usedDataFromApi: !!profile?.data,
          apiUsername: rawUsername,
          apiEmail: dataFromApi?.email ?? '',
          emailLocalPart: emailLocal,
          isUsernameSameAsEmailStart: isUsernameEmailPrefix,
          fullProfile: profile
        };
        setProfileDebug(debug);
        console.log('[Profile debug]', debug);
      }

      setData({
        name: dataFromApi.name || '',
        full_name: dataFromApi.full_name || '',
        username: dataFromApi.username ?? '',
        picture: dataFromApi.picture || '',
        student_id: dataFromApi.student_id || ''
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
        picture: data.picture,
        student_id: data.student_id || null
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
    <div className="white-page-background">
      <Box sx={{ p: 2 }}>
        <div className="dashboard-card profile-page-container" style={{ maxWidth: 'none', margin: '0 auto', background: 'transparent', boxShadow: 'none', border: 'none' }}>
          <div className="card-content">
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          {profileDebug && (
            <Alert severity="info" sx={{ mb: 2, fontFamily: 'monospace', fontSize: '0.85rem' }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}><strong>Profile debug</strong> (add ?profile_debug=1 to URL)</Typography>
              <Box component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', m: 0 }}>
                API username: {JSON.stringify(profileDebug.apiUsername)}{"\n"}
                API email: {JSON.stringify(profileDebug.apiEmail)}{"\n"}
                Email local part: {JSON.stringify(profileDebug.emailLocalPart)}{"\n"}
                Username same as email start? {String(profileDebug.isUsernameSameAsEmailStart)}{"\n"}
                Response shape: used profile.data? {String(profileDebug.usedDataFromApi)}, top-level keys: {profileDebug.rawProfileKeys?.join(', ') || '—'}
              </Box>
            </Alert>
          )}

          <Box display="flex" justifyContent="flex-start" sx={{ mb: 3 }}>
            <Avatar src={data.picture} sx={{ width: 96, height: 96 }} />
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12}>
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
                sx={{ mb: 2 }}
              />
              <TextField
                label="Your ID"
                value={data.student_id}
                onChange={(e) => setData({ ...data, student_id: e.target.value.replace(/\D/g, '').slice(0, 9) })}
                placeholder="9 digits"
                helperText={data.student_id && !isValidId(data.student_id) ? 'Must be exactly 9 digits' : 'Used to identify you in course lists and reports'}
                error={!!data.student_id && !isValidId(data.student_id)}
                fullWidth
                inputProps={{ maxLength: 9, inputMode: 'numeric', pattern: '[0-9]*' }}
              />
            </Grid>
          </Grid>

          {/* Password: only admin can change it — user sends admin a message */}
          <Box mt={3} pt={2} borderTop="1px solid #e0e0e0">
            <Typography variant="subtitle1" sx={{ color: '#000000', mb: 1 }}>
              Password
            </Typography>
            <Typography variant="body2" color="textSecondary">
              To change your password, contact an administrator at{' '}
              <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>
                {import.meta.env.VITE_ADMIN_EMAIL || 'aia.khaw110@gmail.com'}
              </Typography>
              . They can set a new password for your account from User Management.
            </Typography>
          </Box>

          <Box mt={3} display="flex" gap={2}>
            <Button
              variant="outlined"
              onClick={save}
              disabled={saving || (data.username && !isValidUsername(data.username)) || usernameCheck.available === false || (data.student_id && !isValidId(data.student_id))}
              sx={{
                borderColor: '#333',
                color: '#333',
                '&:hover': { borderColor: '#000', backgroundColor: 'transparent' }
              }}
            >
              {saving ? <CircularProgress size={20} /> : 'Save Changes'}
            </Button>
            <Button
              variant="outlined"
              onClick={load}
              disabled={loading}
              sx={{
                borderColor: '#333',
                color: '#333',
                '&:hover': { borderColor: '#000', backgroundColor: 'transparent' }
              }}
            >
              Reset
            </Button>
          </Box>

          {/* Danger Zone */}
          <Box mt={4} pt={3} borderTop="1px solid #e0e0e0">
            <Typography variant="h6" sx={{ color: '#000000' }} gutterBottom>
              Danger Zone
            </Typography>
            <Typography variant="body2" sx={{ color: '#000000', mb: 2 }}>
              Once you delete your account, there is no going back. Please be certain.
            </Typography>
            <Button
              variant="outlined"
              onClick={openDeleteDialog}
              disabled={deleting}
              sx={{
                borderColor: '#333',
                color: '#333',
                '&:hover': { borderColor: '#000', backgroundColor: 'transparent' }
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
            variant="outlined"
            disabled={deleting}
            sx={{
              borderColor: '#333',
              color: '#333',
              '&:hover': { borderColor: '#000', backgroundColor: 'transparent' }
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteAccount}
            variant="outlined"
            disabled={deleting || deleteConfirmation !== 'DELETE'}
            sx={{
              borderColor: '#333',
              color: '#333',
              '&:hover': { borderColor: '#000', backgroundColor: 'transparent' }
            }}
          >
            {deleting ? <CircularProgress size={20} /> : 'Delete Account'}
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </div>
  );

  // Wait for user context to be loaded before determining role
  if (!user) {
    return (
      <DashboardLayout userRole="student">
        <div className="white-page-background">
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh"><CircularProgress /></Box>
        </div>
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
        <div className="white-page-background">
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <CircularProgress />
          </Box>
        </div>
      ) : (
        content
      )}
    </DashboardLayout>
  );
}

export default Profile;


