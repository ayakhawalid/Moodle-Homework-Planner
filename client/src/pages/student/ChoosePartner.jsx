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
  Divider
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
  Edit as EditIcon
} from '@mui/icons-material';
import { apiService } from '../../services/api';
import { useUserSyncContext } from '../../contexts/UserSyncContext';
import '../../styles/student/ChoosePartner.css';

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
    if (!selectedPartner || !selectedHomework) return;
    
    try {
      setSendingRequest(true);
      await apiService.studentSubmission.selectPartner(selectedHomework, selectedPartner._id, partnerMessage);
      
      // Refresh data
      await fetchPartnerData();
      setOpenPartnerDialog(false);
      setSelectedPartner(null);
      setPartnerMessage('');
      setSuccess('Partnership request sent successfully! Wait for the other student to accept.');
    } catch (err) {
      setError('Failed to send partnership request. Please try again.');
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

  // Get unique partners (remove duplicates)
  const getUniquePartners = () => {
    if (!partnerData?.potential_partners) return [];
    
    const seen = new Set();
    return partnerData.potential_partners.filter(partner => {
      const key = partner._id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  if (loading) {
    return (
      <DashboardLayout userRole="student">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" className="partner-title">
          <GroupIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Choose Study Partner
        </Typography>
          <Button
            variant="outlined"
            startIcon={<GroupIcon />}
            onClick={() => setShowRequests(!showRequests)}
            color="secondary"
          >
            {showRequests ? 'Hide Requests' : 'View Requests'}
          </Button>
        </Box>

        <Typography variant="body1" color="text.secondary" paragraph>
          Find and connect with study partners for collaborative learning and homework assignments.
        </Typography>
          
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
                      <Typography variant="h6" color="primary" gutterBottom>
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
                              <div className="card-actions" style={{ justifyContent: 'space-between', padding: '16px' }}>
                                <Button
                                  size="small"
                                  color="success"
                                  variant="contained"
                                  startIcon={<CheckCircleIcon />}
                                  onClick={() => handleRespondToRequest(request._id, 'accept')}
                                >
                                  Accept
                                </Button>
                                <Button
                                  size="small"
                                  color="error"
                                  variant="outlined"
                                  startIcon={<CancelIcon />}
                                  onClick={() => handleRespondToRequest(request._id, 'decline')}
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
                      <Typography variant="h6" color="secondary" gutterBottom>
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
                                    borderColor: '#95E1D3', 
                                    color: '#95E1D3',
                                    '&:hover': { borderColor: '#7dd3c0', backgroundColor: 'rgba(149, 225, 211, 0.1)' }
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
                      <Typography variant="h6" color="success.main" gutterBottom>
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
                              <div className="card-actions" style={{ justifyContent: 'space-between', padding: '16px' }}>
                                <Button
                                  size="small"
                                  color="info"
                                  variant="outlined"
                                  startIcon={<GroupIcon />}
                                  onClick={() => {
                                    setSuccess('Partnership is active. You can collaborate on homework together!');
                                  }}
                                >
                                  View Details
                                </Button>
                                <Button
                                  size="small"
                                  color="warning"
                                  variant="outlined"
                                  startIcon={<EditIcon />}
                                  onClick={() => handleUpdatePartnership(partnership._id, 'completed')}
                                >
                                  Mark Complete
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
                    <Box mb={3}>
                      <Typography variant="h6" color="info.main" gutterBottom>
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
                    <Alert severity="info">
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
              <Alert severity="info" sx={{ mt: 2 }}>
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
                <Alert severity="info" sx={{ mb: 3 }}>
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
                        
                        <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
                          <Chip 
                            icon={<GroupIcon />} 
                            label={course.partner_enabled ? 'Partners Enabled' : 'Partners Disabled'} 
                            size="small" 
                            color={course.partner_enabled ? 'success' : 'error'} 
                            variant="outlined" 
                          />
                          <Chip 
                            icon={<PersonIcon />} 
                            label={`Max: ${course.max_partners}`} 
                            size="small" 
                            color="info" 
                            variant="outlined" 
                          />
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
                      <Typography variant="body2">
                        {partnerData.current_partners.length >= (partnerData.selected_course?.max_partners || 1)
                          ? 'You have reached the maximum number of partners for this course.'
                          : 'You can add more partners for this course.'
                        }
                      </Typography>
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
                                color="error"
                                onClick={() => handleChangePartner(partnership)}
                              >
                                Change Partner
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
              <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
                Available Study Partners
              </Typography>

              {getUniquePartners().length === 0 ? (
                <Alert severity="info">
                  {partnerData?.current_partners && partnerData.current_partners.length >= (partnerData.selected_course?.max_partners || 1) 
                    ? 'You have reached the maximum number of partners for this course.'
                    : 'No potential study partners found for the selected criteria.'
                  }
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
                            <Chip 
                              icon={<SchoolIcon />} 
                              label="Student" 
                              size="small" 
                              color="primary" 
                              variant="outlined" 
                            />
                            <Chip 
                              icon={<GroupIcon />} 
                              label="Available" 
                              size="small" 
                              color="success" 
                              variant="outlined" 
                            />
                          </Box>
                        </div>
                        <div className="card-actions" style={{ marginTop: '24px' }}>
                          <Button
                            size="small"
                            startIcon={<SendIcon />}
                            onClick={() => handleSelectPartner(partner)}
                            disabled={!selectedHomework || (partnerData?.current_partners && partnerData.current_partners.length >= (partnerData.selected_course?.max_partners || 1))}
                            fullWidth
                            variant="contained"
                            color="primary"
                          >
                            {!selectedHomework 
                              ? 'Select Homework First' 
                              : (partnerData?.current_partners && partnerData.current_partners.length >= (partnerData.selected_course?.max_partners || 1))
                                ? 'Max Partners Reached'
                                : 'Choose Partner'
                            }
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
                  <Typography variant="h4" color="primary">
                    {getUniquePartners().length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Available Partners
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box textAlign="center">
                  <Typography variant="h4" color="secondary">
                    {partnerData?.courses?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Enrolled Courses
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box textAlign="center">
                  <Typography variant="h4" color="success.main">
                    {selectedCourse ? '1' : '0'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
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
            >
              {sendingRequest ? 'Sending...' : 'Send Request'}
            </Button>
          </DialogActions>
        </Dialog>
    </DashboardLayout>
  );
}

export default ChoosePartner;
