import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Divider,
  Card,
  CardContent,
  Alert
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  Storage as StorageIcon
} from '@mui/icons-material';
import DashboardLayout from '../../Components/DashboardLayout';

const SystemSettings = () => {
  const [settings, setSettings] = useState({
    siteName: 'EduPlatform',
    siteDescription: 'Educational Management System',
    maxFileSize: '10',
    sessionTimeout: '30',
    enableRegistration: true,
    enableNotifications: true,
    enableMaintenance: false,
    backupFrequency: 'daily',
    emailNotifications: true,
    smsNotifications: false,
    twoFactorAuth: false
  });

  const [saveStatus, setSaveStatus] = useState(null);

  const handleInputChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    // Simulate save operation
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    }, 1000);
  };

  const handleReset = () => {
    setSettings({
      siteName: 'EduPlatform',
      siteDescription: 'Educational Management System',
      maxFileSize: '10',
      sessionTimeout: '30',
      enableRegistration: true,
      enableNotifications: true,
      enableMaintenance: false,
      backupFrequency: 'daily',
      emailNotifications: true,
      smsNotifications: false,
      twoFactorAuth: false
    });
    setSaveStatus('reset');
    setTimeout(() => setSaveStatus(null), 2000);
  };

  return (
    <DashboardLayout userRole="admin">
      <Box p={3}>
        <Box mb={3}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#333' }}>
            System Settings
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Configure system-wide settings and preferences
          </Typography>
        </Box>

        {saveStatus && (
          <Alert 
            severity={saveStatus === 'success' ? 'success' : saveStatus === 'reset' ? 'info' : 'info'} 
            sx={{ mb: 3 }}
          >
            {saveStatus === 'success' && 'Settings saved successfully!'}
            {saveStatus === 'reset' && 'Settings reset to default values!'}
            {saveStatus === 'saving' && 'Saving settings...'}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* General Settings */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <StorageIcon sx={{ mr: 1, color: '#1976d2' }} />
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    General Settings
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Site Name"
                      value={settings.siteName}
                      onChange={(e) => handleInputChange('siteName', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Site Description"
                      multiline
                      rows={3}
                      value={settings.siteDescription}
                      onChange={(e) => handleInputChange('siteDescription', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Max File Size (MB)"
                      type="number"
                      value={settings.maxFileSize}
                      onChange={(e) => handleInputChange('maxFileSize', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Session Timeout (minutes)"
                      type="number"
                      value={settings.sessionTimeout}
                      onChange={(e) => handleInputChange('sessionTimeout', e.target.value)}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Security Settings */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <SecurityIcon sx={{ mr: 1, color: '#f44336' }} />
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Security Settings
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.enableRegistration}
                          onChange={(e) => handleInputChange('enableRegistration', e.target.checked)}
                        />
                      }
                      label="Enable User Registration"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.twoFactorAuth}
                          onChange={(e) => handleInputChange('twoFactorAuth', e.target.checked)}
                        />
                      }
                      label="Enable Two-Factor Authentication"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.enableMaintenance}
                          onChange={(e) => handleInputChange('enableMaintenance', e.target.checked)}
                        />
                      }
                      label="Maintenance Mode"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      select
                      label="Backup Frequency"
                      value={settings.backupFrequency}
                      onChange={(e) => handleInputChange('backupFrequency', e.target.value)}
                      SelectProps={{
                        native: true,
                      }}
                    >
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </TextField>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Notification Settings */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <NotificationsIcon sx={{ mr: 1, color: '#4caf50' }} />
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Notification Settings
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.enableNotifications}
                          onChange={(e) => handleInputChange('enableNotifications', e.target.checked)}
                        />
                      }
                      label="Enable System Notifications"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.emailNotifications}
                          onChange={(e) => handleInputChange('emailNotifications', e.target.checked)}
                        />
                      }
                      label="Email Notifications"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.smsNotifications}
                          onChange={(e) => handleInputChange('smsNotifications', e.target.checked)}
                        />
                      }
                      label="SMS Notifications"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Action Buttons */}
          <Grid item xs={12}>
            <Box display="flex" gap={2} justifyContent="flex-end">
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleReset}
              >
                Reset to Defaults
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={saveStatus === 'saving'}
              >
                {saveStatus === 'saving' ? 'Saving...' : 'Save Settings'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </DashboardLayout>
  );
};

export default SystemSettings;
