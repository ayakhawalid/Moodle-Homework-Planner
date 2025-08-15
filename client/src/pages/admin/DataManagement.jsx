import React from 'react';
import { Box, Typography, Grid, Card, CardContent, Alert } from '@mui/material';
import DashboardLayout from '../../Components/DashboardLayout';
import BudibaseEmbed from '../../Components/BudibaseEmbed';
import { 
  Storage as StorageIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

const DataManagement = () => {
  return (
    <DashboardLayout userRole="admin">
      <Box p={3}>
        {/* Header */}
        <Box mb={3}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#333' }}>
            Data Management
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Manage your application data using the integrated Budibase platform
          </Typography>
        </Box>

        {/* Info Alert */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>Integrated Data Platform:</strong> This embedded Budibase app allows you to manage all your application data including users, courses, assignments, and more.
        </Alert>

        <Grid container spacing={3}>
          {/* Quick Stats */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <StorageIcon sx={{ mr: 1, color: '#1976d2' }} />
                  <Typography variant="h6">Data Tables</Typography>
                </Box>
                <Typography variant="body2" color="textSecondary">
                  Manage all your database tables including users, courses, assignments, and inventory data.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <DashboardIcon sx={{ mr: 1, color: '#4caf50' }} />
                  <Typography variant="h6">Reports</Typography>
                </Box>
                <Typography variant="body2" color="textSecondary">
                  Generate reports and analytics from your data to track performance and usage.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <SettingsIcon sx={{ mr: 1, color: '#ff9800' }} />
                  <Typography variant="h6">Configuration</Typography>
                </Box>
                <Typography variant="body2" color="textSecondary">
                  Configure data relationships, permissions, and automated workflows.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Embedded Budibase App */}
          <Grid item xs={12}>
            <BudibaseEmbed 
              title="Moodle Planner Data Management"
              height="700px"
              embedUrl="https://moodleplanner.budibase.app/embed/moodle-planner"
            />
          </Grid>
        </Grid>

        {/* Help Section */}
        <Card sx={{ mt: 3, bgcolor: '#f8f9fa' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              How to Use Data Management
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Managing Data:
                </Typography>
                <ul style={{ fontSize: '0.9rem', paddingLeft: '20px' }}>
                  <li>Use the embedded interface to add, edit, or delete records</li>
                  <li>Navigate between different data tables using the sidebar</li>
                  <li>Use filters and search to find specific records</li>
                  <li>Export data for backup or analysis</li>
                </ul>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Best Practices:
                </Typography>
                <ul style={{ fontSize: '0.9rem', paddingLeft: '20px' }}>
                  <li>Regularly backup your data</li>
                  <li>Use consistent naming conventions</li>
                  <li>Validate data before importing large datasets</li>
                  <li>Monitor data relationships and dependencies</li>
                </ul>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
    </DashboardLayout>
  );
};

export default DataManagement;
