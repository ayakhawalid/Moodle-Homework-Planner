import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../Components/DashboardLayout';
import { 
  Grid, 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  CardActions, 
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
  FilterList as FilterListIcon
} from '@mui/icons-material';
import { apiService } from '../../services/api';
import { useUserSyncContext } from '../../contexts/UserSyncContext';
import '../../styles/student/ChoosePartner.css';

function ChoosePartner() {
  const { syncStatus } = useUserSyncContext();
  const [partnerData, setPartnerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedHomework, setSelectedHomework] = useState('');
  const [openPartnerDialog, setOpenPartnerDialog] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [partnerMessage, setPartnerMessage] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);

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
      console.error('Error fetching partner data:', err);
      setError('Failed to load partner data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartnerData();
  }, [selectedCourse, selectedHomework]);

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
      await apiService.studentSubmission.selectPartner(selectedHomework, selectedPartner._id);
      
      // Refresh data
      await fetchPartnerData();
      setOpenPartnerDialog(false);
      setSelectedPartner(null);
      setPartnerMessage('');
    } catch (err) {
      console.error('Error sending partner request:', err);
      setError('Failed to send partnership request. Please try again.');
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
      <div className="choose-partner">
        <Typography variant="h4" className="partner-title" gutterBottom>
          <GroupIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Choose Study Partner
        </Typography>

        <div className="partner-content">
          <Typography variant="body1" color="text.secondary" paragraph>
            Find and connect with study partners for collaborative learning and homework assignments.
          </Typography>

          {/* Filters */}
          <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              <FilterListIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
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
                    {/* Add homework options here when available */}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>

          {/* Selected Course/Homework Info */}
          {partnerData?.selected_course && (
            <Paper elevation={1} sx={{ p: 2, mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
              <Typography variant="h6" gutterBottom>
                <SchoolIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                {partnerData.selected_course.course_code} - {partnerData.selected_course.course_name}
              </Typography>
              {partnerData.selected_course.lecturer && (
                <Typography variant="body2">
                  Lecturer: {partnerData.selected_course.lecturer.name}
                </Typography>
              )}
            </Paper>
          )}

          {partnerData?.selected_homework && (
            <Paper elevation={1} sx={{ p: 2, mb: 3, bgcolor: 'secondary.light', color: 'secondary.contrastText' }}>
              <Typography variant="h6" gutterBottom>
                <AssignmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                {partnerData.selected_homework.title}
              </Typography>
              <Typography variant="body2">
                Due: {new Date(partnerData.selected_homework.due_date).toLocaleDateString()}
              </Typography>
            </Paper>
          )}

          {/* Available Partners */}
          <Typography variant="h5" gutterBottom>
            Available Study Partners
          </Typography>

          {getUniquePartners().length === 0 ? (
            <Alert severity="info">
              No potential study partners found for the selected criteria.
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {getUniquePartners().map((partner) => (
                <Grid item xs={12} sm={6} md={4} key={partner._id}>
                  <Card className="partner-card" elevation={2}>
                    <CardContent>
                      <Box display="flex" alignItems="center" mb={2}>
                        <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                          <PersonIcon />
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
                    </CardContent>
                    <CardActions>
                      <Button
                        size="small"
                        startIcon={<SendIcon />}
                        onClick={() => handleSelectPartner(partner)}
                        disabled={!selectedHomework}
                        fullWidth
                      >
                        {selectedHomework ? 'Send Request' : 'Select Homework First'}
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {/* Partner Statistics */}
          <Paper elevation={1} sx={{ p: 2, mt: 3 }}>
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
          </Paper>
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
      </div>
    </DashboardLayout>
  );
}

export default ChoosePartner;
