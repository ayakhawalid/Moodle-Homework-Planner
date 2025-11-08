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
  Alert,
  CircularProgress,
  Paper,
  IconButton,
  Divider,
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
import '../../styles/HomeworkCard.css';
import { CheckCircle as PhCheckCircle, XCircle as PhXCircle } from 'phosphor-react';

const formatDateTimeForInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
};

const formatDateTimeForDisplay = (value) => {
  if (!value) return 'No deadline provided';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid date';
  const formatted = new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
  return formatted.replace(',', '');
};

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
    verified_deadline: ''
  });
  
  const [submitting, setSubmitting] = useState(false);

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
      
      const payload = {
        verified_deadline: verificationData.verified_deadline
          ? new Date(verificationData.verified_deadline).toISOString()
          : null
      };

      await apiService.studentHomework.verifyDeadline(selectedVerification._id, payload);
      setSuccess('Verification updated successfully!');
      setVerifyDialogOpen(false);
      setSelectedVerification(null);
      setVerificationData({
        verified_deadline: ''
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
      verified_deadline: formatDateTimeForInput(verification.verified_deadline || verification.claimed_deadline)
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
      <div className="page-background">
      <Box sx={{ p: 3 }}>
      

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

      {/* Deadline Verifications */}
        <Box>
          <div className="homework-grid">
            {deadlineVerifications.map((verification) => (
                <div className="homework-item" key={verification._id}>
                  <div className="homework-card student-homework">
                    {/* Notebook Edge - Simple line for verification */}
                    <div className="notebook-edge student-edge">
                      <div className="student-indicator"></div>
                    </div>

                    {/* Verification Content */}
                    <div className="homework-content">
                      {/* Action Icons - Top Right Corner */}
                      <div className="homework-actions-top">
                        <IconButton 
                          className="action-button edit"
                          onClick={() => openVerifyDialog(verification)}
                          aria-label="Verify"
                          title="Verify"
                          sx={{
                            backgroundColor: 'transparent !important',
                            color: '#555',
                            border: 'none !important',
                            padding: '8px',
                            margin: '0 2px',
                            minWidth: '40px',
                            width: '40px',
                            height: '40px',
                            '&:hover': {
                              backgroundColor: 'rgba(0, 0, 0, 0.1) !important',
                              transform: 'scale(1.05)'
                            }
                          }}
                        >
                          <PhCheckCircle size={24} weight="thin" />
                        </IconButton>
                      </div>
                      <div className="homework-title">{verification.title}</div>
                      
                      {/* Student Info */}
                      <div className="homework-course">
                        <PersonIcon sx={{ mr: 1, fontSize: 16, color: '#FCE38A' }} />
                        {verification.uploaded_by.name} ({verification.uploaded_by.role})
                      </div>

                      {/* Course Info */}
                      <div className="homework-course">
                        <SchoolIcon sx={{ mr: 1, fontSize: 16, color: '#D6F7AD' }} />
                        {verification.course.name} ({verification.course.code})
                      </div>

                      <div className="homework-description">{verification.description || 'No description provided'}</div>
                      
                      {/* Deadline and Status - Left aligned */}
                      <div className="homework-meta">
                        {/* Deadline Box - Always show */}
                        <div className="deadline-box">
                          <span className="deadline-text">
                            {formatDateTimeForDisplay(verification.claimed_deadline)}
                          </span>
                          {verification.verified_deadline && (
                            <span className="deadline-text verified">
                              {`Verified: ${formatDateTimeForDisplay(verification.verified_deadline)}`}
                            </span>
                          )}
                          {/* Verification Status */}
                          <div 
                            className={`verification-indicator ${verification.deadline_verification_status === 'verified' ? 'verified' : 'unverified'}`}
                            title={verification.deadline_verification_status === 'verified' ? 'Verified Deadline' : 'Unverified Deadline - Needs Verification'}
                          >
                            {verification.deadline_verification_status === 'verified' ? 'Verified' : 'Not Verified'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  
                </div>
            ))}
          </div>
        </Box>

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
                label="Student Claimed Deadline"
                value={formatDateTimeForDisplay(selectedVerification?.claimed_deadline)}
                InputProps={{ readOnly: true }}
              />
            </Grid>
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
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setVerifyDialogOpen(false)}
            sx={{ 
              color: '#000',
              '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)', color: '#000' }
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
              color: '#000',
              '&:hover': { backgroundColor: '#c8f299', color: '#000' }
            }}
          >
            {submitting ? <CircularProgress size={24} /> : 'Update Verification'}
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
      </div>
    </DashboardLayout>
  );
};

export default VerificationDashboard;
