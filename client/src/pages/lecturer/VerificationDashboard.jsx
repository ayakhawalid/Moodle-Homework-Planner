import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Paper,
  Divider,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import DashboardLayout from '../../Components/DashboardLayout';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  ExpandMore as ExpandMoreIcon,
  School as SchoolIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { useAuth0 } from '@auth0/auth0-react';
import { apiService } from '../../services/api';

const VerificationDashboard = () => {
  const { isAuthenticated } = useAuth0();
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Dialog states
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [selectedVerification, setSelectedVerification] = useState(null);
  
  // Form states
  const [verificationData, setVerificationData] = useState({
    verified_deadline: '',
    verification_status: 'verified',
    notes: ''
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (isAuthenticated) {
      fetchVerifications();
    }
  }, [isAuthenticated]);

  const fetchVerifications = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.studentHomework.getVerifications();
      
      if (!response || !response.data) {
        throw new Error('Invalid verifications response');
      }
      
      const verifications = response.data.verifications || [];
      setVerifications(verifications);
      
    } catch (err) {
      console.error('Error fetching verifications:', err);
      setError(`Failed to fetch verifications: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    try {
      setSubmitting(true);
      setError(null);
      
      await apiService.studentHomework.verifyDeadline(selectedVerification._id, verificationData);
      setSuccess('Verification updated successfully!');
      setVerifyDialogOpen(false);
      setSelectedVerification(null);
      setVerificationData({
        verified_deadline: '',
        verification_status: 'verified',
        notes: ''
      });
      fetchVerifications();
    } catch (err) {
      console.error('Error verifying:', err);
      setError(err.response?.data?.error || 'Failed to update verification');
    } finally {
      setSubmitting(false);
    }
  };

  const openVerifyDialog = (verification) => {
    setSelectedVerification(verification);
    setVerificationData({
      verified_deadline: verification.claimed_deadline,
      verification_status: 'verified',
      notes: ''
    });
    setVerifyDialogOpen(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'verified': return 'success';
      case 'rejected': return 'error';
      case 'unverified': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'verified': return <CheckCircleIcon color="success" />;
      case 'rejected': return <CancelIcon color="error" />;
      case 'unverified': return <ScheduleIcon color="warning" />;
      default: return <ScheduleIcon color="disabled" />;
    }
  };

  const deadlineVerifications = verifications.filter(v => 
    v.deadline_verification_status === 'unverified'
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <DashboardLayout userRole="lecturer">
      <Box sx={{ p: 3 }}>
      <Typography variant="h3" component="h1" sx={{ 
        fontWeight: '600',
        fontSize: '2.5rem',
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        letterSpacing: '-0.01em',
        lineHeight: '1.2',
        color: '#2c3e50',
        mb: 1
      }}>
        Verification Dashboard
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
        Review and verify student-submitted homework deadlines and grades
      </Typography>
      

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <div className="dashboard-card" style={{ marginBottom: '24px' }}>
        <div className="card-content">
          <Tabs 
            value={activeTab} 
            onChange={(e, newValue) => setActiveTab(newValue)}
            sx={{
              '& .MuiTabs-indicator': {
                backgroundColor: '#666'
              }
            }}
          >
            <Tab 
              label={`Deadline Verifications (${deadlineVerifications.length})`} 
              icon={<ScheduleIcon sx={{ color: '#666' }} />}
              sx={{ 
                color: '#666',
                '&.Mui-selected': { color: '#666' }
              }}
            />
          </Tabs>
        </div>
      </div>

      {/* Deadline Verifications Tab */}
      {activeTab === 0 && (
        <Box>
          {deadlineVerifications.length === 0 ? (
            <div className="dashboard-card" style={{ textAlign: 'center', padding: '32px' }}>
              <div className="card-content">
                <Typography variant="h6" color="text.secondary">
                  No pending deadline verifications
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  All deadline verifications are up to date
                </Typography>
              </div>
            </div>
          ) : (
            <Grid container spacing={3}>
              {deadlineVerifications.map((verification) => (
                <Grid item xs={12} md={6} lg={4} key={verification._id}>
                  <div className="dashboard-card">
                    <div className="card-content">
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                        <Typography variant="h6" component="h2">
                          {verification.title}
                        </Typography>
                        {getStatusIcon(verification.deadline_verification_status)}
                      </Box>

                      <Box display="flex" alignItems="center" mb={1}>
                        <SchoolIcon sx={{ mr: 1, fontSize: 16, color: '#95E1D3' }} />
                        <Typography variant="body2" color="text.secondary">
                          {verification.course.name} ({verification.course.code})
                        </Typography>
                      </Box>

                      <Box display="flex" alignItems="center" mb={1}>
                        <PersonIcon sx={{ mr: 1, fontSize: 16, color: '#D6F7AD' }} />
                        <Typography variant="body2" color="text.secondary">
                          {verification.uploaded_by.name} ({verification.uploaded_by.role})
                        </Typography>
                      </Box>

                      <Box display="flex" alignItems="center" mb={2}>
                        <ScheduleIcon sx={{ mr: 1, fontSize: 16, color: '#FCE38A' }} />
                        <Typography variant="body2" color="text.secondary">
                          Claimed Deadline: {new Date(verification.claimed_deadline).toLocaleString()}
                        </Typography>
                      </Box>

                      <Divider sx={{ my: 2 }} />

                      <Box display="flex" gap={1}>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<CheckCircleIcon />}
                          onClick={() => openVerifyDialog(verification)}
                          sx={{ 
                            backgroundColor: '#95E1D3',
                            color: '#333',
                            '&:hover': { backgroundColor: '#7dd3c0' }
                          }}
                        >
                          Verify
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<CancelIcon />}
                          onClick={() => openVerifyDialog(verification)}
                          sx={{ 
                            borderColor: '#F38181',
                            color: '#F38181',
                            '&:hover': { borderColor: '#e85a6b', backgroundColor: 'rgba(243, 129, 129, 0.1)' }
                          }}
                        >
                          Reject
                        </Button>
                      </Box>
                    </div>
                  </div>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* Verification Dialog */}
      <Dialog open={verifyDialogOpen} onClose={() => setVerifyDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Verify Deadline
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Review the deadline for "{selectedVerification?.title}"
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Verified Deadline"
                type="datetime-local"
                value={verificationData.verified_deadline}
                onChange={(e) => setVerificationData({ ...verificationData, verified_deadline: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Verification Status</InputLabel>
                <Select
                  value={verificationData.verification_status}
                  onChange={(e) => setVerificationData({ ...verificationData, verification_status: e.target.value })}
                >
                  <MenuItem value="verified">Verified</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={verificationData.notes}
                onChange={(e) => setVerificationData({ ...verificationData, notes: e.target.value })}
                placeholder="Add any notes about this verification..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setVerifyDialogOpen(false)}
            sx={{ 
              color: '#95E1D3',
              '&:hover': { backgroundColor: 'rgba(149, 225, 211, 0.1)' }
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleVerify}
            variant="contained"
            disabled={submitting}
            sx={{ 
              backgroundColor: '#D6F7AD',
              color: '#333',
              '&:hover': { backgroundColor: '#c8f299' }
            }}
          >
            {submitting ? <CircularProgress size={24} /> : 'Update Verification'}
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </DashboardLayout>
  );
};

export default VerificationDashboard;
