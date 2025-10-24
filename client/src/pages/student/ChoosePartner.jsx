import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../Components/DashboardLayout';
import { 
  Grid, 
  Box, 
  Typography, 
  Button, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Chip, 
  Avatar, 
  Alert, 
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Paper
} from '@mui/material';
import {
  Person as PersonIcon,
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  Group as GroupIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  FilterList as FilterListIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { apiService } from '../../services/api';
import { useUserSyncContext } from '../../contexts/UserSyncContext';
import '../../styles/student/ChoosePartner.css';
import '../../styles/HomeworkCard.css';

function ChoosePartner() {
  const { syncStatus, user } = useUserSyncContext();
  const [partnerData, setPartnerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedHomework, setSelectedHomework] = useState('');
  const [openPartnerDialog, setOpenPartnerDialog] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [partnerMessage, setPartnerMessage] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);
  const [partnerDisabled, setPartnerDisabled] = useState(false);
  const [partnerRequests, setPartnerRequests] = useState(null);
  const [showRequests, setShowRequests] = useState(false);
  const [detailsDialog, setDetailsDialog] = useState({ open: false, partnership: null });

  // Fetch partner data
  const fetchPartnerData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (selectedCourse) params.append('course_id', selectedCourse);
      if (selectedHomework) params.append('homework_id', selectedHomework);
      
      const response = await apiService.studentDashboard.getChoosePartner(
        selectedCourse || null, 
        selectedHomework || null
      );
      setPartnerData(response.data);
    } catch (err) {
      setError('Failed to load partner data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartnerData();
  }, [selectedCourse, selectedHomework]);

  // Fetch partner requests
  const fetchPartnerRequests = async () => {
    try {
      const response = await apiService.studentDashboard.getPartnerRequests();
      setPartnerRequests(response.data);
    } catch (err) {
      setError('Failed to load partner requests. Please try again.');
    }
  };

  useEffect(() => {
    if (showRequests) {
      fetchPartnerRequests();
    }
  }, [showRequests]);

  // Handle partner selection
  const handleSelectPartner = (partner) => {
    setSelectedPartner(partner);
    setOpenPartnerDialog(true);
  };

  // Send partnership request
  const handleSendRequest = async () => {
    console.log('=== SENDING PARTNER REQUEST ===');
    console.log('selectedPartner:', selectedPartner);
    console.log('selectedHomework:', selectedHomework);
    console.log('selectedCourse:', selectedCourse);
    console.log('partnerMessage:', partnerMessage);
    
    if (!selectedPartner || !selectedHomework) {
      console.error('Missing required fields:', { selectedPartner, selectedHomework });
      setError('Please select both a homework assignment and a partner.');
      return;
    }
    
    try {
      setSendingRequest(true);
      
      console.log('Calling API with:', {
        homeworkId: selectedHomework,
        partnerId: selectedPartner._id,
        notes: partnerMessage,
        url: `/student-submission/homework/${selectedHomework}/partner`
      });
      
      const response = await apiService.studentSubmission.selectPartner(selectedHomework, selectedPartner._id, partnerMessage);
      
      console.log('Partnership request response:', response);
      
      // Refresh data
      await fetchPartnerData();
      setOpenPartnerDialog(false);
      setSelectedPartner(null);
      setPartnerMessage('');
      setSuccess('Partnership request sent successfully! Wait for the other student to accept.');
    } catch (err) {
      console.error('=== PARTNERSHIP REQUEST ERROR ===');
      console.error('Full error:', err);
      console.error('Error response:', err.response);
      console.error('Error response data:', err.response?.data);
      console.error('Error status:', err.response?.status);
      console.error('Error config:', err.config);
      
      const errorData = err.response?.data;
      let errorMsg = err.response?.data?.error || err.message || 'Failed to send partnership request. Please try again.';
      
      // Add suggestion if provided
      if (errorData?.suggestion) {
        errorMsg += `. ${errorData.suggestion}`;
      }
      
      // If partnership already exists, show helpful message
      if (errorData?.partnership_id && errorData?.partnership_status) {
        const status = errorData.partnership_status;
        if (status === 'pending') {
          errorMsg = '⚠️ You already sent a partnership request to this student. Click "View Requests" → "Sent Requests" to see it. The request is waiting for their response.';
        } else if (status === 'accepted' || status === 'active') {
          errorMsg = '✅ You already have an active partnership with this student for this homework! Click "View Requests" to see it.';
        }
      }
      
      setError(errorMsg);
      setOpenPartnerDialog(false); // Close dialog on error
      
      // Refresh data to show current partnerships
      await fetchPartnerData();
      if (errorData?.partnership_id) {
        setShowRequests(true); // Automatically show requests section
      }
    } finally {
      setSendingRequest(false);
    }
  };

  // Respond to partnership request
  const handleRespondToRequest = async (requestId, action) => {
    try {
      const response = await apiService.studentDashboard.respondToPartnerRequest(requestId, action);
      await fetchPartnerRequests(); // Refresh requests
      setSuccess(`Partnership request ${action}ed successfully`);
    } catch (err) {
      // More specific error messages
      if (err.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else if (err.response?.status === 403) {
        setError('You can only respond to requests sent to you.');
      } else if (err.response?.status === 404) {
        setError('Partnership request not found.');
      } else if (err.response?.status === 400) {
        setError(err.response?.data?.error || 'Invalid request.');
      } else {
        setError(`Failed to ${action} partnership request: ${err.response?.data?.error || err.message}`);
      }
    }
  };

  // Update partnership status
  const handleUpdatePartnership = async (partnershipId, newStatus) => {
    try {
      const response = await apiService.studentDashboard.respondToPartnerRequest(partnershipId, newStatus);
      await fetchPartnerRequests(); // Refresh requests
      setSuccess(`Partnership ${newStatus} successfully`);
    } catch (err) {
      // More specific error messages
      if (err.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else if (err.response?.status === 403) {
        setError('You can only update partnerships you are part of.');
      } else if (err.response?.status === 404) {
        setError('Partnership not found.');
      } else if (err.response?.status === 400) {
        setError(err.response?.data?.error || 'Invalid request.');
      } else {
        setError(`Failed to update partnership: ${err.response?.data?.error || err.message}`);
      }
    }
  };

  const handleChangePartner = async (partnership) => {
    try {
      setSendingRequest(true);
      
      // First, decline/delete the current partnership
      await apiService.studentDashboard.respondToPartnerRequest(partnership._id, 'decline');
      
      // Refresh data to update the UI
      await fetchPartnerData();
      await fetchPartnerRequests();
      
      setSuccess('Partnership ended successfully! You can now choose a new partner.');
    } catch (err) {
      setError('Failed to change partner. Please try again.');
    } finally {
      setSendingRequest(false);
    }
  };

  const handleDeletePartnership = async (partnership) => {
    if (!window.confirm(`Are you sure you want to delete this partnership? This action cannot be undone.`)) {
      return;
    }

    try {
      setSendingRequest(true);
      setError(null);
      
      // Delete the partnership
      await apiService.studentDashboard.respondToPartnerRequest(partnership._id, 'decline');
      
      // Refresh data to update the UI
      await fetchPartnerData();
      await fetchPartnerRequests();
      
      setSuccess('Partnership deleted successfully!');
    } catch (err) {
      setError('Failed to delete partnership. Please try again.');
    } finally {
      setSendingRequest(false);
    }
  };

  // Get unique partners (remove duplicates and students you already have partnerships with for the specific homework)
  const getUniquePartners = () => {
    if (!partnerData?.potential_partners) return [];
    
    // Get IDs of students you already have partnerships with for the specific homework
    const partneredStudentIds = new Set();
    
    // Add students from current partners (for the selected homework only)
    partnerData?.current_partners?.forEach(partnership => {
      // Only exclude if this partnership is for the selected homework
      if (selectedHomework && partnership.homework_id?._id === selectedHomework) {
        if (partnership.student1_id?._id) partneredStudentIds.add(partnership.student1_id._id.toString());
        if (partnership.student2_id?._id) partneredStudentIds.add(partnership.student2_id._id.toString());
      }
    });
    
    // Also exclude students from sent requests for the specific homework (if View Requests is loaded)
    if (partnerRequests?.sent_requests && selectedHomework) {
      partnerRequests.sent_requests.forEach(request => {
        if (request.homework?._id === selectedHomework && request.partner?._id) {
          partneredStudentIds.add(request.partner._id.toString());
        }
      });
    }
    
    // Also exclude students from pending requests received for the specific homework
    if (partnerRequests?.pending_requests && selectedHomework) {
      partnerRequests.pending_requests.forEach(request => {
        if (request.homework?._id === selectedHomework && request.partner?._id) {
          partneredStudentIds.add(request.partner._id.toString());
        }
      });
    }
    
    // Also exclude students from active partnerships for the specific homework
    if (partnerRequests?.active_partnerships && selectedHomework) {
      partnerRequests.active_partnerships.forEach(partnership => {
        if (partnership.homework?._id === selectedHomework && partnership.partner?._id) {
          partneredStudentIds.add(partnership.partner._id.toString());
        }
      });
    }
    
    // Remove duplicates and exclude students with existing partnerships for this homework
    const seen = new Set();
    return partnerData.potential_partners.filter(partner => {
      const key = partner._id;
      if (seen.has(key)) return false;
      if (partneredStudentIds.has(key)) return false; // Exclude students with existing partnerships for this homework
      seen.add(key);
      return true;
    });
  };

  if (loading) {
    return (
      <DashboardLayout userRole="student">
        <div className="white-page-background">
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout userRole="student">
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </DashboardLayout>
    );
  }


  return (
    <DashboardLayout userRole="student">
      <div className="white-page-background">
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Button
            variant="outlined"
            startIcon={<GroupIcon />}
            onClick={() => setShowRequests(!showRequests)}
            sx={{
              borderColor: '#D6F7AD',
              color: '#333',
              '&:hover': { borderColor: '#c8f299', backgroundColor: 'rgba(214, 247, 173, 0.1)' }
            }}
          >
            {showRequests ? 'Hide Requests' : 'View Requests'}
          </Button>
        </Box>
          
          {/* Success Message */}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          )}
          
          {/* Error Message */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          

          {/* Partner Requests Section */}
          {showRequests && (
            <div className="dashboard-card" style={{ marginBottom: '24px' }}>
              <div className="card-content">
                <Typography variant="h6" gutterBottom>
                  <GroupIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#95E1D3' }} />
                  Partnership Requests
                </Typography>
              
              {partnerRequests ? (
                <Box>
                  {/* Pending Requests (received) */}
                  {partnerRequests.pending_requests?.length > 0 && (
                    <Box mb={3}>
                      <Typography variant="h6" color="primary" sx={{ mb: 1 }}>
                        Pending Requests ({partnerRequests.pending_requests.length})
                      </Typography>
                      <Grid container spacing={2}>
                        {partnerRequests.pending_requests.map((request) => (
                          <Grid item xs={12} md={6} key={request._id}>
                            <div className="dashboard-card" style={{ height: '100%' }}>
                              <div className="card-content">
                                {/* Partner Information Header */}
                                <Box display="flex" alignItems="center" mb={3}>
                                  <Avatar sx={{ bgcolor: '#95E1D3', mr: 2, width: 56, height: 56 }}>
                                    {request.partner.picture ? (
                                      <img 
                                        src={request.partner.picture} 
                                        alt="Partner" 
                                        style={{ 
                                          width: '100%', 
                                          height: '100%', 
                                          borderRadius: '50%',
                                          objectFit: 'cover'
                                        }} 
                                      />
                                    ) : (
                                      <PersonIcon fontSize="large" />
                                    )}
                                  </Avatar>
                                  <Box flex={1}>
                                    <Typography variant="h6" fontWeight="bold">
                                      {request.partner.name}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      {request.partner.email}
                                    </Typography>
                                    <Chip 
                                      label="Wants to Partner" 
                                      color="primary" 
                                      size="small" 
                                      sx={{ mt: 1 }}
                                    />
                                  </Box>
                                </Box>
                                
                                {/* Course & Homework Details */}
                                <Box sx={{ mb: 2 }}>
                                  <Typography variant="subtitle2" color="primary" gutterBottom>
                                    <SchoolIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 20 }} />
                                    Course Details
                                  </Typography>
                                  <Typography variant="body2" gutterBottom>
                                    <strong>Course:</strong> {request.homework.course.code} - {request.homework.course.name}
                                  </Typography>
                                  <Typography variant="body2" gutterBottom>
                                    <strong>Homework:</strong> {request.homework.title}
                                  </Typography>
                                  <Typography variant="body2" gutterBottom>
                                    <strong>Due Date:</strong> {new Date(request.homework.due_date).toLocaleDateString()}
                                  </Typography>
                                </Box>
                                
                                {/* Request Information */}
                                <Box sx={{ mb: 2 }}>
                                  <Typography variant="subtitle2" color="secondary" gutterBottom>
                                    <GroupIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 20 }} />
                                    Request Information
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    <strong>Requested:</strong> {new Date(request.initiated_at).toLocaleDateString()} at {new Date(request.initiated_at).toLocaleTimeString()}
                                  </Typography>
                                  
                                  {request.notes && request.notes.trim() && (
                                    <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                                      <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                                        <strong>Message:</strong> "{request.notes}"
                                      </Typography>
                                    </Box>
                                  )}
                                </Box>
                              </div>
                              <div className="card-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', padding: '16px' }}>
                                <Button
                                  size="small"
                                  variant="contained"
                                  startIcon={<CheckCircleIcon />}
                                  onClick={() => handleRespondToRequest(request._id, 'accept')}
                                  sx={{
                                    backgroundColor: '#D6F7AD',
                                    color: '#333',
                                    '&:hover': { backgroundColor: '#c8f299' }
                                  }}
                                >
                                  Accept
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<CancelIcon />}
                                  onClick={() => handleRespondToRequest(request._id, 'decline')}
                                  sx={{
                                    borderColor: '#F38181',
                                    color: '#F38181',
                                    '&:hover': { borderColor: '#e85a6b', backgroundColor: 'rgba(243, 129, 129, 0.1)' }
                                  }}
                                >
                                  Decline
                                </Button>
                              </div>
                            </div>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}

                  {/* Sent Requests */}
                  {partnerRequests.sent_requests?.length > 0 && (
                    <Box mb={3}>
                      <Typography variant="h6" color="secondary" sx={{ mb: 1 }}>
                        Sent Requests ({partnerRequests.sent_requests.length})
                      </Typography>
                      <Grid container spacing={2}>
                        {partnerRequests.sent_requests.map((request) => (
                          <Grid item xs={12} md={6} key={request._id}>
                            <div className="dashboard-card" style={{ height: '100%' }}>
                              <div className="card-content">
                                {/* Partner Information Header */}
                                <Box display="flex" alignItems="center" mb={3}>
                                  <Avatar sx={{ bgcolor: '#95E1D3', mr: 2 }}>
                                    {request.partner.picture ? (
                                      <img 
                                        src={request.partner.picture} 
                                        alt="Partner" 
                                        style={{ 
                                          width: '100%', 
                                          height: '100%', 
                                          borderRadius: '50%',
                                          objectFit: 'cover'
                                        }} 
                                      />
                                    ) : (
                                      <PersonIcon fontSize="large" />
                                    )}
                                  </Avatar>
                                  <Box flex={1}>
                                    <Typography variant="h6" fontWeight="bold">
                                      {request.partner.name}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      {request.partner.email}
                                    </Typography>
                                    <Chip 
                                      label="Waiting for Response" 
                                      color="warning" 
                                      size="small" 
                                      sx={{ mt: 1 }}
                                    />
                                  </Box>
                                </Box>
                                
                                {/* Course & Homework Details */}
                                <Box sx={{ mb: 2 }}>
                                  <Typography variant="subtitle2" color="secondary" gutterBottom>
                                    <SchoolIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 20 }} />
                                    Course Details
                                  </Typography>
                                  <Typography variant="body2" gutterBottom>
                                    <strong>Course:</strong> {request.homework.course.code} - {request.homework.course.name}
                                  </Typography>
                                  <Typography variant="body2" gutterBottom>
                                    <strong>Homework:</strong> {request.homework.title}
                                  </Typography>
                                  <Typography variant="body2" gutterBottom>
                                    <strong>Due Date:</strong> {new Date(request.homework.due_date).toLocaleDateString()}
                                  </Typography>
                                </Box>
                                
                                {/* Request Information */}
                                <Box sx={{ mb: 2 }}>
                                  <Typography variant="subtitle2" color="secondary" gutterBottom>
                                    <GroupIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 20 }} />
                                    Request Information
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    <strong>Sent:</strong> {new Date(request.initiated_at).toLocaleDateString()} at {new Date(request.initiated_at).toLocaleTimeString()}
                                  </Typography>
                                  
                                  {request.notes && request.notes.trim() && (
                                    <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                                      <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                                        <strong>Your Message:</strong> "{request.notes}"
                                      </Typography>
                                    </Box>
                                  )}
                                </Box>
                              </div>
                              <div className="card-actions" style={{ justifyContent: 'center', padding: '16px' }}>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<SendIcon />}
                                  onClick={() => {
                                    // Could add functionality to resend or modify request
                                    setSuccess('Request is pending. You can send a follow-up message if needed.');
                                  }}
                                  sx={{ 
                                    borderColor: '#D6F7AD', 
                                    color: '#333',
                                    '&:hover': { borderColor: '#c8f299', backgroundColor: 'rgba(214, 247, 173, 0.1)' }
                                  }}
                                >
                                  Follow Up
                                </Button>
                              </div>
                            </div>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}

                  {/* Active Partnerships */}
                  {partnerRequests.active_partnerships?.length > 0 && (
                    <Box mb={3}>
                      <Typography variant="h6" color="success.main" sx={{ mb: 1 }}>
                        Active Partnerships ({partnerRequests.active_partnerships.length})
                      </Typography>
                      <Grid container spacing={2}>
                        {partnerRequests.active_partnerships.map((partnership) => (
                          <Grid item xs={12} md={6} key={partnership._id}>
                            <div className="dashboard-card" style={{ height: '100%' }}>
                              <div className="card-content">
                                {/* Partner Information Header */}
                                <Box display="flex" alignItems="center" mb={3}>
                                  <Avatar sx={{ bgcolor: 'success.main', mr: 2, width: 56, height: 56 }}>
                                    {partnership.partner.picture ? (
                                      <img 
                                        src={partnership.partner.picture} 
                                        alt="Partner" 
                                        style={{ 
                                          width: '100%', 
                                          height: '100%', 
                                          borderRadius: '50%',
                                          objectFit: 'cover'
                                        }} 
                                      />
                                    ) : (
                                      <PersonIcon fontSize="large" />
                                    )}
                                  </Avatar>
                                  <Box flex={1}>
                                    <Typography variant="h6" fontWeight="bold">
                                      {partnership.partner.name}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      {partnership.partner.email}
                                    </Typography>
                                    <Chip 
                                      label="Active Partner" 
                                      color="success" 
                                      size="small" 
                                      sx={{ mt: 1 }}
                                    />
                                  </Box>
                                </Box>
                                
                                {/* Course & Homework Details */}
                                <Box sx={{ mb: 2 }}>
                                  <Typography variant="subtitle2" color="success.main" gutterBottom>
                                    <SchoolIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 20 }} />
                                    Course Details
                                  </Typography>
                                  <Typography variant="body2" gutterBottom>
                                    <strong>Course:</strong> {partnership.homework.course.code} - {partnership.homework.course.name}
                                  </Typography>
                                  <Typography variant="body2" gutterBottom>
                                    <strong>Homework:</strong> {partnership.homework.title}
                                  </Typography>
                                  <Typography variant="body2" gutterBottom>
                                    <strong>Due Date:</strong> {new Date(partnership.homework.due_date).toLocaleDateString()}
                                  </Typography>
                                </Box>
                                
                                {/* Partnership Information */}
                                <Box sx={{ mb: 2 }}>
                                  <Typography variant="subtitle2" color="success.main" gutterBottom>
                                    <GroupIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 20 }} />
                                    Partnership Information
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    <strong>Status:</strong> {partnership.status.charAt(0).toUpperCase() + partnership.status.slice(1)}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    <strong>Accepted:</strong> {new Date(partnership.accepted_at).toLocaleDateString()} at {new Date(partnership.accepted_at).toLocaleTimeString()}
                                  </Typography>
                                </Box>
                              </div>
                              <div className="card-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', padding: '16px' }}>
                                <Button
                                  size="small"
                                  color="info"
                                  variant="outlined"
                                  startIcon={<GroupIcon />}
                                  onClick={() => setDetailsDialog({ open: true, partnership })}
                                  sx={{
                                    borderColor: '#95E1D3',
                                    color: '#333',
                                    '&:hover': { borderColor: '#7dd3c0', backgroundColor: 'rgba(149, 225, 211, 0.1)' }
                                  }}
                                >
                                  View Details
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<EditIcon />}
                                  onClick={() => handleUpdatePartnership(partnership._id, 'completed')}
                                  sx={{
                                    borderColor: '#D6F7AD',
                                    color: '#333',
                                    '&:hover': { borderColor: '#c8f299', backgroundColor: 'rgba(214, 247, 173, 0.1)' }
                                  }}
                                >
                                  Mark Complete
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<DeleteIcon />}
                                  onClick={() => handleDeletePartnership(partnership)}
                                  disabled={sendingRequest}
                                  sx={{
                                    borderColor: '#F38181',
                                    color: '#F38181',
                                    '&:hover': { borderColor: '#e85a6b', backgroundColor: 'rgba(243, 129, 129, 0.1)' }
                                  }}
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}

                  {/* Completed Partnerships */}
                  {partnerRequests.completed_partnerships?.length > 0 && (
                    <Box mb={3} mt={4}>
                      <Typography variant="h6" color="info.main" sx={{ mb: 1 }}>
                        Completed Partnerships ({partnerRequests.completed_partnerships.length})
                      </Typography>
                      <Grid container spacing={2}>
                        {partnerRequests.completed_partnerships.map((partnership) => (
                          <Grid item xs={12} md={6} key={partnership._id}>
                            <div className="dashboard-card" style={{ height: '100%' }}>
                              <div className="card-content">
                                {/* Partner Information Header */}
                                <Box display="flex" alignItems="center" mb={3}>
                                  <Avatar sx={{ bgcolor: '#F38181', mr: 2 }}>
                                    {partnership.partner.picture ? (
                                      <img 
                                        src={partnership.partner.picture} 
                                        alt="Partner" 
                                        style={{ 
                                          width: '100%', 
                                          height: '100%', 
                                          borderRadius: '50%',
                                          objectFit: 'cover'
                                        }} 
                                      />
                                    ) : (
                                      partnership.partner.name.charAt(0).toUpperCase()
                                    )}
                                  </Avatar>
                                  <Box>
                                    <Typography variant="h6" component="div">
                                      {partnership.partner.name}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      {partnership.partner.email}
                                    </Typography>
                                  </Box>
                                </Box>

                                {/* Course and Homework Info */}
                                <Box mb={2}>
                                  <Typography variant="subtitle2" color="text.secondary">
                                    Course: {partnership.homework.course.name} ({partnership.homework.course.code})
                                  </Typography>
                                  <Typography variant="subtitle2" color="text.secondary">
                                    Homework: {partnership.homework.title}
                                  </Typography>
                                </Box>

                                {/* Status and Dates */}
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                  <Chip 
                                    label="Completed" 
                                    color="info" 
                                    variant="outlined"
                                    size="small"
                                  />
                                  <Typography variant="caption" color="text.secondary">
                                    Completed: {new Date(partnership.completed_at).toLocaleDateString()}
                                  </Typography>
                                </Box>
                              </div>
                            </div>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}

                  {/* No requests message */}
                  {(!partnerRequests.pending_requests?.length && 
                    !partnerRequests.sent_requests?.length && 
                    !partnerRequests.active_partnerships?.length &&
                    !partnerRequests.completed_partnerships?.length) && (
                    <Alert 
                      severity="info"
                      sx={{
                        backgroundColor: 'rgba(149, 225, 211, 0.2)',
                        border: '1px solid #95E1D3',
                        color: '#333',
                        '& .MuiAlert-icon': {
                          color: '#333'
                        }
                      }}
                    >
                      No partnership requests found. Send requests to other students to start collaborating!
                    </Alert>
                  )}
                </Box>
              ) : (
                <Box display="flex" justifyContent="center" py={3}>
                  <CircularProgress />
                </Box>
              )}
            </div>
          </div>
        )}

        {/* Filters */}
          <div className="dashboard-card" style={{ marginBottom: '24px' }}>
            <div className="card-content">
              <Typography variant="h6" gutterBottom>
                <FilterListIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#FCE38A' }} />
                Filter Partners
              </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Course</InputLabel>
                  <Select
                    value={selectedCourse}
                    onChange={(e) => {
                      setSelectedCourse(e.target.value);
                      setSelectedHomework(''); // Reset homework when course changes
                    }}
                    label="Course"
                    sx={{ minWidth: '300px' }}
                  >
                    <MenuItem value="">
                      <em>All Courses</em>
                    </MenuItem>
                    {partnerData?.courses?.map((course) => (
                      <MenuItem key={course._id} value={course._id}>
                        {course.course_code} - {course.course_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth disabled={!selectedCourse}>
                  <InputLabel>Homework Assignment</InputLabel>
                  <Select
                    value={selectedHomework}
                    onChange={(e) => setSelectedHomework(e.target.value)}
                    label="Homework Assignment"
                    sx={{ minWidth: '300px' }}
                  >
                    <MenuItem value="">
                      <em>All Homework</em>
                    </MenuItem>
                    {partnerData?.homework_assignments?.map((homework) => (
                      <MenuItem key={homework._id} value={homework._id}>
                        {homework.title} - Due: {new Date(homework.due_date).toLocaleDateString()}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            
            {/* No homework available message */}
            {selectedCourse && partnerData?.homework_assignments?.length === 0 && (
              <Alert 
                severity="info" 
                sx={{ 
                  mt: 2,
                  backgroundColor: 'rgba(252, 227, 138, 0.2)',
                  border: '1px solid #FCE38A',
                  color: '#333',
                  '& .MuiAlert-icon': {
                    color: '#333'
                  }
                }}
              >
                No available homework assignments found for this course. All homework may be completed or not yet available.
              </Alert>
            )}
            </div>
          </div>

          {/* Selected Course/Homework Info */}
          {partnerData?.selected_course && (
            <div className="dashboard-card" style={{ marginBottom: '24px' }}>
              <div className="card-content">
                <Typography variant="h6" gutterBottom>
                  <SchoolIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#95E1D3' }} />
                  {partnerData.selected_course.course_code} - {partnerData.selected_course.course_name}
                </Typography>
                {partnerData.selected_course.lecturer && (
                  <Typography variant="body2">
                    Lecturer: {partnerData.selected_course.lecturer.name}
                  </Typography>
                )}
              </div>
            </div>
          )}


          {/* Course-based Partner Management */}
          {selectedCourse === '' ? (
            <Box>
              <Typography variant="h5" gutterBottom>
                Select a Course to Manage Partners
              </Typography>
              
              {partnerData?.courses?.filter(course => course.partner_enabled).length === 0 ? (
                <Alert 
                  severity="info" 
                  sx={{ 
                    mb: 3,
                    backgroundColor: 'rgba(149, 225, 211, 0.2)',
                    border: '1px solid #95E1D3',
                    color: '#333',
                    '& .MuiAlert-icon': {
                      color: '#333'
                    }
                  }}
                >
                  <Typography variant="h6" gutterBottom>
                    Partner Functionality Disabled
                  </Typography>
                  <Typography variant="body2">
                    None of your enrolled courses currently have partner functionality enabled. 
                    Contact your lecturers if you'd like to enable study partnerships for your courses.
                  </Typography>
                </Alert>
              ) : null}
              
              <Grid container spacing={2}>
                {partnerData?.courses?.map((course) => (
                  <Grid item xs={12} sm={6} md={4} key={course._id}>
                    <div className="dashboard-card" style={{ height: '100%' }}>
                      <div className="card-content">
                        <Box display="flex" alignItems="center" mb={2}>
                                  <Avatar sx={{ bgcolor: '#D6F7AD', mr: 2 }}>
                            <SchoolIcon />
                          </Avatar>
                          <Box>
                            <Typography variant="h6">
                              {course.course_code}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {course.course_name}
                            </Typography>
                          </Box>
                        </Box>
                        
                        
                        {course.partner_enabled ? (
                          <Typography variant="body2" color="text.secondary">
                            Click to manage partners for this course
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="error">
                            Partner functionality is disabled by lecturer
                          </Typography>
                        )}
                      </div>
                      <div className="card-actions">
                        <Button
                          size="small"
                          startIcon={<GroupIcon />}
                          onClick={() => setSelectedCourse(course._id)}
                          disabled={!course.partner_enabled}
                          fullWidth
                          variant={course.partner_enabled ? 'contained' : 'outlined'}
                          sx={course.partner_enabled ? {
                            backgroundColor: '#D6F7AD',
                            color: '#333',
                            '&:hover': { backgroundColor: '#c8f299' }
                          } : {
                            borderColor: '#F38181',
                            color: '#F38181',
                            '&:hover': { borderColor: '#e85a6b', backgroundColor: 'rgba(243, 129, 129, 0.1)' }
                          }}
                        >
                          {!course.partner_enabled 
                            ? 'Partners Disabled' 
                            : (partnerData?.current_partners && partnerData.current_partners.some(p => p.homework_id?.course_id === course._id))
                              ? 'Manage Partners'
                              : 'Choose Partner'
                          }
                        </Button>
                      </div>
                    </div>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ) : (
            <Box>
              {/* Current Partners for Selected Course */}
              {partnerData?.current_partners && partnerData.current_partners.length > 0 && (
                <Box mb={3}>
                  <div className="dashboard-card" style={{ marginBottom: '16px' }}>
                    <div className="card-content">
                      <Typography variant="h6" gutterBottom>
                        <CheckCircleIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#95E1D3' }} />
                        Current Partners ({partnerData.current_partners.length}/{partnerData.selected_course?.max_partners || 1})
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        You can manage your partnerships for this course.
                      </Typography>
                      <Alert 
                        severity="info" 
                        sx={{ 
                          mt: 1,
                          backgroundColor: 'rgba(149, 225, 211, 0.2)',
                          border: '1px solid #95E1D3',
                          color: '#333',
                          '& .MuiAlert-icon': {
                            color: '#333'
                          }
                        }}
                      >
                        <Typography variant="body2">
                          <strong>Note:</strong> Partners shown here include pending, accepted, and active partnerships. 
                          Students already listed here won't appear in "Available Study Partners" below for the same homework assignment.
                        </Typography>
                      </Alert>
                    </div>
                  </div>
                  
                  {/* Display Current Partners */}
                  <Grid container spacing={2}>
                    {partnerData.current_partners.map((partnership) => (
                      <Grid item xs={12} md={6} key={partnership._id}>
                        <div className="dashboard-card" style={{ height: '100%' }}>
                          <div className="card-content">
                            {/* Partner Information Header */}
                            <Box display="flex" alignItems="center" mb={3}>
                              <Avatar sx={{ bgcolor: '#FCE38A', mr: 2 }}>
                                {(partnership.student1_id?._id === partnerData?.user_id 
                                  ? partnership.student2_id?.picture 
                                  : partnership.student1_id?.picture
                                ) ? (
                                  <img 
                                    src={(partnership.student1_id?._id === partnerData?.user_id 
                                      ? partnership.student2_id?.picture 
                                      : partnership.student1_id?.picture
                                    )} 
                                    alt="Partner" 
                                    style={{ 
                                      width: '100%', 
                                      height: '100%', 
                                      borderRadius: '50%',
                                      objectFit: 'cover'
                                    }} 
                                  />
                                ) : (
                                  (partnership.student1_id?._id === partnerData?.user_id 
                                    ? (partnership.student2_id?.name || partnership.student2_id?.full_name || 'P')
                                    : (partnership.student1_id?.name || partnership.student1_id?.full_name || 'P')
                                  )?.charAt(0)?.toUpperCase()
                                )}
                              </Avatar>
                              <Box>
                                <Typography variant="h6" component="div">
                                  {partnership.student1_id?._id === partnerData?.user_id 
                                    ? (partnership.student2_id?.name || partnership.student2_id?.full_name || 'Unknown Partner')
                                    : (partnership.student1_id?.name || partnership.student1_id?.full_name || 'Unknown Partner')
                                  }
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {partnership.student1_id?._id === partnerData?.user_id 
                                    ? (partnership.student2_id?.email || 'No email available')
                                    : (partnership.student1_id?.email || 'No email available')
                                  }
                                </Typography>
                              </Box>
                            </Box>

                            {/* Course and Homework Info */}
                            <Box mb={2}>
                              <Typography variant="subtitle2" color="text.secondary">
                                Course: {partnership.homework_id?.course_id?.course_name || 'Unknown Course'}
                              </Typography>
                              <Typography variant="subtitle2" color="text.secondary">
                                Homework: {partnership.homework_id?.title || 'Unknown Homework'}
                              </Typography>
                            </Box>

                            {/* Status and Dates */}
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                              <Chip 
                                label={partnership.partnership_status === 'pending' ? 'Pending' : 
                                       partnership.partnership_status === 'accepted' ? 'Active' : 
                                       partnership.partnership_status === 'completed' ? 'Completed' : 
                                       partnership.partnership_status} 
                                color={partnership.partnership_status === 'pending' ? 'warning' : 
                                       partnership.partnership_status === 'accepted' ? 'success' : 
                                       partnership.partnership_status === 'completed' ? 'info' : 'default'} 
                                variant="outlined"
                                size="small"
                              />
                              <Typography variant="caption" color="text.secondary">
                                {partnership.partnership_status === 'pending' ? `Requested: ${new Date(partnership.createdAt).toLocaleDateString()}` :
                                 partnership.partnership_status === 'accepted' ? `Accepted: ${new Date(partnership.accepted_at).toLocaleDateString()}` :
                                 partnership.partnership_status === 'completed' ? `Completed: ${new Date(partnership.completed_at).toLocaleDateString()}` :
                                 `Created: ${new Date(partnership.createdAt).toLocaleDateString()}`}
                              </Typography>
                            </Box>

                            {/* Action Buttons */}
                            <Box display="flex" justifyContent="flex-end" gap={1}>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => handleChangePartner(partnership)}
                                sx={{
                                  borderColor: '#FCE38A',
                                  color: '#333',
                                  '&:hover': { borderColor: '#fbd65e', backgroundColor: 'rgba(252, 227, 138, 0.1)' }
                                }}
                              >
                                Change Partner
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<DeleteIcon />}
                                onClick={() => handleDeletePartnership(partnership)}
                                disabled={sendingRequest}
                                sx={{
                                  borderColor: '#F38181',
                                  color: '#F38181',
                                  '&:hover': { borderColor: '#e85a6b', backgroundColor: 'rgba(243, 129, 129, 0.1)' }
                                }}
                              >
                                Delete
                              </Button>
                            </Box>
                          </div>
                        </div>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}


              {/* Available Partners */}
              <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mt: 4, mb: 2 }}>
                <Typography variant="h5">
                  Available Study Partners
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={fetchPartnerData}
                  sx={{ 
                    borderColor: '#D6F7AD', 
                    color: '#333',
                    '&:hover': { borderColor: '#c8f299', backgroundColor: 'rgba(214, 247, 173, 0.1)' }
                  }}
                >
                  Refresh
                </Button>
              </Box>

              {getUniquePartners().length === 0 ? (
                <Alert 
                  severity="info"
                  sx={{
                    backgroundColor: 'rgba(214, 247, 173, 0.2)',
                    border: '1px solid #D6F7AD',
                    color: '#333',
                    '& .MuiAlert-icon': {
                      color: '#333'
                    }
                  }}
                >
                  {selectedHomework 
                    ? 'No potential study partners found for this homework. All students may already have partnerships for this specific homework assignment.'
                    : 'No potential study partners found. Please select a homework assignment first.'
                  }
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    💡 Tip: Click "View Requests" at the top to see your pending, sent, and active partnerships.
                  </Typography>
                </Alert>
              ) : (
                <Grid container spacing={2}>
                  {getUniquePartners().map((partner) => (
                    <Grid item xs={12} sm={6} md={4} key={partner._id}>
                      <div className="dashboard-card" style={{ height: '100%' }}>
                        <div className="card-content">
                          <Box display="flex" alignItems="center" mb={2}>
                            <Avatar sx={{ bgcolor: '#D6F7AD', mr: 2 }}>
                              {partner.picture ? (
                                <img 
                                  src={partner.picture} 
                                  alt="Partner" 
                                  style={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    borderRadius: '50%',
                                    objectFit: 'cover'
                                  }} 
                                />
                              ) : (
                                <PersonIcon />
                              )}
                            </Avatar>
                            <Box>
                              <Typography variant="h6">
                                {partner.name || partner.full_name || 'Unknown Student'}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {partner.email}
                              </Typography>
                            </Box>
                          </Box>
                          
                          <Box display="flex" flexWrap="wrap" gap={1}>
                            {/* Tags removed */}
                          </Box>
                        </div>
                        <div className="card-actions" style={{ marginTop: '24px' }}>
                          <Button
                            size="small"
                            startIcon={<SendIcon />}
                            onClick={() => handleSelectPartner(partner)}
                            disabled={!selectedHomework}
                            fullWidth
                            variant="contained"
                            sx={{
                              backgroundColor: '#D6F7AD',
                              color: '#333',
                              '&:hover': { backgroundColor: '#c8f299' },
                              '&:disabled': { backgroundColor: '#e0e0e0', color: '#999' }
                            }}
                          >
                            {!selectedHomework ? 'Select Homework First' : 'Choose Partner'}
                          </Button>
                        </div>
                      </div>
                    </Grid>
                  ))}
                </Grid>
              )}

              {/* Back to Course Selection */}
              <Box mt={6}>
                <Button
                  variant="outlined"
                  startIcon={<SchoolIcon />}
                  onClick={() => {
                    setSelectedCourse('');
                    setSelectedHomework('');
                  }}
                  sx={{
                    borderColor: '#95E1D3',
                    color: '#333',
                    '&:hover': { borderColor: '#7dd3c0', backgroundColor: 'rgba(149, 225, 211, 0.1)' }
                  }}
                >
                  Back to Course Selection
                </Button>
              </Box>
            </Box>
          )}

        {/* Partner Statistics */}
        <div className="dashboard-card" style={{ marginTop: '48px' }}>
            <div className="card-content">
              <Typography variant="h6" gutterBottom>
                Partner Statistics
              </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Box textAlign="center">
                  <Typography variant="h4" sx={{ color: '#333' }}>
                    {getUniquePartners().length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    Available Partners
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box textAlign="center">
                  <Typography variant="h4" sx={{ color: '#333' }}>
                    {partnerData?.courses?.length || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    Enrolled Courses
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box textAlign="center">
                  <Typography variant="h4" sx={{ color: '#333' }}>
                    {selectedCourse ? '1' : '0'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    Selected Course
                  </Typography>
                </Box>
              </Grid>
            </Grid>
            </div>
          </div>

        {/* Partner Request Dialog */}
        <Dialog 
          open={openPartnerDialog} 
          onClose={() => setOpenPartnerDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Send Partnership Request
          </DialogTitle>
          <DialogContent>
            {selectedPartner && (
              <Box mb={2}>
                <Typography variant="h6" gutterBottom>
                  Partner: {selectedPartner.name || selectedPartner.full_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Email: {selectedPartner.email}
                </Typography>
              </Box>
            )}
            
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Message (Optional)"
              value={partnerMessage}
              onChange={(e) => setPartnerMessage(e.target.value)}
              placeholder="Add a personal message to your partnership request..."
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setOpenPartnerDialog(false)}
              disabled={sendingRequest}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSendRequest}
              variant="contained"
              startIcon={sendingRequest ? <CircularProgress size={20} /> : <SendIcon />}
              disabled={sendingRequest}
              sx={{
                backgroundColor: '#D6F7AD',
                color: '#333',
                '&:hover': { backgroundColor: '#c8f299' }
              }}
            >
              {sendingRequest ? 'Sending...' : 'Send Request'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Partnership Details Dialog */}
        <Dialog 
          open={detailsDialog.open} 
          onClose={() => setDetailsDialog({ open: false, partnership: null })}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" alignItems="center">
              <GroupIcon sx={{ mr: 1 }} />
              Partnership Details
            </Box>
          </DialogTitle>
          <DialogContent>
            {detailsDialog.partnership && (
              <Box>
                {/* Partner Information */}
                <Box mb={3}>
                  <Typography variant="h6" gutterBottom>
                    Partner Information
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar sx={{ bgcolor: '#95E1D3', width: 56, height: 56 }}>
                          {detailsDialog.partnership.partner?.picture ? (
                            <img 
                              src={detailsDialog.partnership.partner.picture} 
                              alt="Partner" 
                              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
                            />
                          ) : (
                            <PersonIcon fontSize="large" />
                          )}
                        </Avatar>
                        <Box>
                          <Typography variant="h6">
                            {detailsDialog.partnership.partner?.name || 'Unknown'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {detailsDialog.partnership.partner?.email || 'No email'}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Partnership Status
                        </Typography>
                        <Chip 
                          label={detailsDialog.partnership.status?.charAt(0).toUpperCase() + detailsDialog.partnership.status?.slice(1) || 'Unknown'}
                          color={
                            detailsDialog.partnership.status === 'pending' ? 'warning' :
                            detailsDialog.partnership.status === 'accepted' || detailsDialog.partnership.status === 'active' ? 'success' :
                            detailsDialog.partnership.status === 'completed' ? 'info' : 'default'
                          }
                          sx={{ mt: 1 }}
                        />
                      </Box>
                    </Grid>
                  </Grid>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Course and Homework Information */}
                <Box mb={3}>
                  <Typography variant="h6" gutterBottom>
                    Course & Homework Details
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Box mb={2}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Course
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                          {detailsDialog.partnership.homework?.course?.code} - {detailsDialog.partnership.homework?.course?.name}
                        </Typography>
                      </Box>
                      <Box mb={2}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Homework Assignment
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                          {detailsDialog.partnership.homework?.title || 'Unknown'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Due Date
                        </Typography>
                        <Typography variant="body1">
                          {detailsDialog.partnership.homework?.due_date 
                            ? new Date(detailsDialog.partnership.homework.due_date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })
                            : 'Not specified'}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Timeline Information */}
                <Box mb={3}>
                  <Typography variant="h6" gutterBottom>
                    Timeline
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Request Sent
                      </Typography>
                      <Typography variant="body2">
                        {detailsDialog.partnership.initiated_at 
                          ? new Date(detailsDialog.partnership.initiated_at).toLocaleDateString() + ' at ' + 
                            new Date(detailsDialog.partnership.initiated_at).toLocaleTimeString()
                          : 'Unknown'}
                      </Typography>
                    </Grid>
                    {detailsDialog.partnership.accepted_at && (
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Accepted On
                        </Typography>
                        <Typography variant="body2">
                          {new Date(detailsDialog.partnership.accepted_at).toLocaleDateString()} at {' '}
                          {new Date(detailsDialog.partnership.accepted_at).toLocaleTimeString()}
                        </Typography>
                      </Grid>
                    )}
                    {detailsDialog.partnership.completed_at && (
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Completed On
                        </Typography>
                        <Typography variant="body2">
                          {new Date(detailsDialog.partnership.completed_at).toLocaleDateString()} at {' '}
                          {new Date(detailsDialog.partnership.completed_at).toLocaleTimeString()}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </Box>

                {/* Notes Section */}
                {detailsDialog.partnership.notes && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        Message
                      </Typography>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                        <Typography variant="body1" sx={{ fontStyle: 'italic' }}>
                          "{detailsDialog.partnership.notes}"
                        </Typography>
                      </Paper>
                    </Box>
                  </>
                )}

                {/* Status Information */}
                <Divider sx={{ my: 2 }} />
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Status Information
                  </Typography>
                  <Alert 
                    severity={
                      detailsDialog.partnership.status === 'pending' ? 'warning' :
                      detailsDialog.partnership.status === 'accepted' || detailsDialog.partnership.status === 'active' ? 'success' :
                      detailsDialog.partnership.status === 'completed' ? 'info' : 'default'
                    }
                  >
                    <Typography variant="body2">
                      {detailsDialog.partnership.status === 'pending' && 
                        'This partnership request is pending. Waiting for the other student to accept.'}
                      {(detailsDialog.partnership.status === 'accepted' || detailsDialog.partnership.status === 'active') && 
                        'This partnership is active! You can collaborate on this homework together.'}
                      {detailsDialog.partnership.status === 'completed' && 
                        'This partnership has been completed. Great work!'}
                    </Typography>
                  </Alert>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setDetailsDialog({ open: false, partnership: null })}
              variant="contained"
              sx={{ 
                backgroundColor: '#D6F7AD',
                color: '#333',
                '&:hover': { backgroundColor: '#c8f299' }
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

export default ChoosePartner;
