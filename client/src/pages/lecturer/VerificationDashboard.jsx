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
  Grade as GradeIcon,
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
  const [verificationType, setVerificationType] = useState('deadline');
  
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
      
      console.log('Fetching verifications...');
      console.log('About to call apiService.studentHomework.getVerifications()');
      
      const response = await apiService.studentHomework.getVerifications();
      console.log('Verifications response:', response);
      console.log('Response status:', response.status);
      console.log('Response data:', response.data);
      
      if (!response || !response.data) {
        throw new Error('Invalid verifications response');
      }
      
      const verifications = response.data.verifications || [];
      console.log('Verifications data:', verifications);
      console.log('Verifications count:', verifications.length);
      setVerifications(verifications);
      
      // Debug: Log summary
      console.log('=== VERIFICATION DASHBOARD SUMMARY ===');
      console.log('Total verifications:', verifications.length);
      console.log('Deadline verifications:', verifications.filter(v => v.deadline_verification_status === 'pending_review' || v.deadline_verification_status === 'unverified').length);
      console.log('Grade verifications:', verifications.filter(v => v.grade_verification_status === 'pending_review' || v.grade_verification_status === 'unverified').length);
      console.log('All verification statuses:', verifications.map(v => ({ 
        id: v._id, 
        title: v.title, 
        course: v.course?.name, 
        deadline_status: v.deadline_verification_status,
        grade_status: v.grade_verification_status,
        completion_status: v.completion_status
      })));
      console.log('Raw response data:', response.data);
      console.log('=====================================');
      
    } catch (err) {
      console.error('Error fetching verifications:', err);
      console.error('Error details:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
        config: err.config?.url
      });
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

  const openVerifyDialog = (verification, type) => {
    setSelectedVerification(verification);
    setVerificationType(type);
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
      case 'pending_review': return 'warning';
      case 'rejected': return 'error';
      case 'unverified': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'verified': return <CheckCircleIcon color="success" />;
      case 'pending_review': return <ScheduleIcon color="warning" />;
      case 'rejected': return <CancelIcon color="error" />;
      default: return <ScheduleIcon color="disabled" />;
    }
  };

  const deadlineVerifications = verifications.filter(v => 
    v.deadline_verification_status === 'pending_review' || v.deadline_verification_status === 'unverified'
  );
  const gradeVerifications = verifications.filter(v => 
    v.grade_verification_status === 'pending_review' || v.grade_verification_status === 'unverified'
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
      <Typography variant="h4" component="h1" gutterBottom>
        Verification Dashboard
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Review and verify student-submitted homework deadlines and grades
      </Typography>
      
      {/* Debug Section */}
      <Box mb={3} p={2} border="1px solid #ccc" borderRadius={1}>
        <Typography variant="h6" gutterBottom>Debug Tools</Typography>
        <Button 
          variant="outlined" 
          onClick={async () => {
            try {
              console.log('Testing verification endpoint...');
              const response = await apiService.studentHomework.getVerifications();
              console.log('Direct verification test:', response);
              console.log('Verification data:', response.data);
            } catch (err) {
              console.error('Verification endpoint test failed:', err);
            }
          }}
          sx={{ mr: 2 }}
        >
          Test Verification Endpoint
        </Button>
        <Button 
          variant="outlined" 
          onClick={fetchVerifications}
        >
          Refresh Verifications
        </Button>
      </Box>

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

      <Paper elevation={1} sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab 
            label={`Deadline Verifications (${deadlineVerifications.length})`} 
            icon={<ScheduleIcon />}
          />
          <Tab 
            label={`Grade Verifications (${gradeVerifications.length})`} 
            icon={<GradeIcon />}
          />
        </Tabs>
      </Paper>

      {/* Deadline Verifications Tab */}
      {activeTab === 0 && (
        <Box>
          {deadlineVerifications.length === 0 ? (
            <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                No pending deadline verifications
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                All deadline verifications are up to date
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {deadlineVerifications.map((verification) => (
                <Grid item xs={12} md={6} lg={4} key={verification._id}>
                  <Card elevation={3}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                        <Typography variant="h6" component="h2">
                          {verification.title}
                        </Typography>
                        {getStatusIcon(verification.deadline_verification_status)}
                      </Box>

                      <Box display="flex" alignItems="center" mb={1}>
                        <SchoolIcon sx={{ mr: 1, fontSize: 16 }} />
                        <Typography variant="body2" color="text.secondary">
                          {verification.course.name} ({verification.course.code})
                        </Typography>
                      </Box>

                      <Box display="flex" alignItems="center" mb={1}>
                        <PersonIcon sx={{ mr: 1, fontSize: 16 }} />
                        <Typography variant="body2" color="text.secondary">
                          {verification.uploaded_by.name} ({verification.uploaded_by.role})
                        </Typography>
                      </Box>

                      <Box display="flex" alignItems="center" mb={2}>
                        <ScheduleIcon sx={{ mr: 1, fontSize: 16 }} />
                        <Typography variant="body2" color="text.secondary">
                          Claimed Deadline: {new Date(verification.claimed_deadline).toLocaleString()}
                        </Typography>
                      </Box>

                      <Divider sx={{ my: 2 }} />

                      <Box display="flex" gap={1}>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<CheckCircleIcon />}
                          onClick={() => openVerifyDialog(verification, 'deadline')}
                        >
                          Verify
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<CancelIcon />}
                          onClick={() => openVerifyDialog(verification, 'deadline')}
                        >
                          Reject
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* Grade Verifications Tab */}
      {activeTab === 1 && (
        <Box>
          {gradeVerifications.length === 0 ? (
            <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                No pending grade verifications
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                All grade verifications are up to date
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {gradeVerifications.map((verification) => (
                <Grid item xs={12} md={6} lg={4} key={verification._id}>
                  <Card elevation={3}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                        <Typography variant="h6" component="h2">
                          {verification.title}
                        </Typography>
                        {getStatusIcon(verification.grade_verification_status)}
                      </Box>

                      <Box display="flex" alignItems="center" mb={1}>
                        <SchoolIcon sx={{ mr: 1, fontSize: 16 }} />
                        <Typography variant="body2" color="text.secondary">
                          {verification.course.name} ({verification.course.code})
                        </Typography>
                      </Box>

                      <Box display="flex" alignItems="center" mb={1}>
                        <PersonIcon sx={{ mr: 1, fontSize: 16 }} />
                        <Typography variant="body2" color="text.secondary">
                          {verification.uploaded_by.name} ({verification.uploaded_by.role})
                        </Typography>
                      </Box>

                      <Box display="flex" alignItems="center" mb={2}>
                        <GradeIcon sx={{ mr: 1, fontSize: 16 }} />
                        <Typography variant="body2" color="text.secondary">
                          Claimed Grade: {verification.claimed_grade}
                        </Typography>
                      </Box>

                      {verification.extracted_grade_data && (
                        <Accordion>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="body2">AI Extraction Details</Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Extracted Grade: {verification.extracted_grade_data.extracted_grade}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Confidence: {Math.round(verification.extracted_grade_data.confidence * 100)}%
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Raw Text: {verification.extracted_grade_data.raw_text?.substring(0, 100)}...
                              </Typography>
                            </Box>
                          </AccordionDetails>
                        </Accordion>
                      )}

                      <Divider sx={{ my: 2 }} />

                      <Box display="flex" gap={1}>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<CheckCircleIcon />}
                          onClick={() => openVerifyDialog(verification, 'grade')}
                        >
                          Verify
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<CancelIcon />}
                          onClick={() => openVerifyDialog(verification, 'grade')}
                        >
                          Reject
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* Verification Dialog */}
      <Dialog open={verifyDialogOpen} onClose={() => setVerifyDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {verificationType === 'deadline' ? 'Verify Deadline' : 'Verify Grade'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {verificationType === 'deadline' 
              ? `Review the deadline for "${selectedVerification?.title}"`
              : `Review the grade for "${selectedVerification?.title}"`
            }
          </Typography>

          {verificationType === 'deadline' && (
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
          )}

          {verificationType === 'grade' && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Claimed Grade"
                  value={selectedVerification?.claimed_grade}
                  disabled
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Extracted Grade"
                  value={selectedVerification?.extracted_grade_data?.extracted_grade}
                  disabled
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
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVerifyDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleVerify}
            variant="contained"
            disabled={submitting}
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
