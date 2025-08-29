import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, TextField, Button, Grid, Avatar, CircularProgress, Alert } from '@mui/material';
import DashboardLayout from '../Components/DashboardLayout';
import { useUserSyncContext } from '../contexts/UserSyncContext';
import { apiService } from '../services/api';

function Profile() {
  const { user, refreshUser } = useUserSyncContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [data, setData] = useState({ name: '', full_name: '', username: '', picture: '' });
  const [usernameCheck, setUsernameCheck] = useState({ checking: false, available: null, message: '' });

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

  const content = (
    <Box sx={{ p: 2 }}>
      <Card sx={{ maxWidth: 800, mx: 'auto' }}>
        <CardContent>
          <Typography variant="h5" sx={{ mb: 2 }}>Edit Profile</Typography>
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
            >
              {saving ? <CircularProgress size={20} /> : 'Save Changes'}
            </Button>
            <Button variant="text" onClick={load} disabled={loading}>Reset</Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

  if (loading) {
    return (
      <DashboardLayout userRole={user?.role || 'student'}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh"><CircularProgress /></Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole={user?.role || 'student'}>
      {content}
    </DashboardLayout>
  );
}

export default Profile;


