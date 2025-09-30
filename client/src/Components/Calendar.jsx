import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Card,
  CardContent,
  Grid,
  Alert
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  School as SchoolIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './Calendar.css';

const localizer = momentLocalizer(moment);

const CalendarComponent = ({ events = [], userRole = 'student' }) => {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState('month');

  // Convert homework data to calendar events
  const calendarEvents = events.map((homework, index) => ({
    id: homework._id || index,
    title: homework.title,
    start: new Date(homework.due_date || homework.claimed_deadline),
    end: new Date(homework.due_date || homework.claimed_deadline),
    resource: {
      homework: homework,
      type: 'homework'
    }
  }));

  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
    setEventDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setEventDialogOpen(false);
    setSelectedEvent(null);
  };

  const handleNavigate = (date) => {
    console.log('Calendar navigation:', date);
    setCurrentDate(date);
  };

  const handleViewChange = (view) => {
    console.log('Calendar view change:', view);
    setCurrentView(view);
  };

  const handleSelectSlot = (slotInfo) => {
    // Optional: Handle slot selection for adding new events
    console.log('Selected slot:', slotInfo);
  };

  const getEventStyle = (event) => {
    const homework = event.resource?.homework;
    if (!homework) return {};

    // Determine color based on status and urgency
    const dueDate = new Date(event.start);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    let backgroundColor = '#3174ad'; // Default blue

    if (homework.completion_status === 'completed' || homework.status === 'graded') {
      backgroundColor = '#28a745'; // Green for completed
    } else if (daysUntilDue < 0) {
      backgroundColor = '#dc3545'; // Red for overdue
    } else if (daysUntilDue <= 1) {
      backgroundColor = '#fd7e14'; // Orange for urgent
    } else if (daysUntilDue <= 3) {
      backgroundColor = '#ffc107'; // Yellow for warning
    }

    return {
      backgroundColor,
      borderRadius: '4px',
      opacity: 0.8,
      color: 'white',
      border: '0px',
      display: 'block'
    };
  };

  const EventComponent = ({ event }) => {
    const homework = event.resource?.homework;
    const dueDate = new Date(event.start);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    return (
      <Box>
        <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block' }}>
          {event.title}
        </Typography>
        {homework?.course && (
          <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem' }}>
            {homework.course.name || homework.course.code}
          </Typography>
        )}
        {daysUntilDue <= 1 && (
          <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem', fontWeight: 'bold' }}>
            {daysUntilDue < 0 ? 'Overdue!' : daysUntilDue === 0 ? 'Due Today!' : 'Due Tomorrow!'}
          </Typography>
        )}
      </Box>
    );
  };

  return (
    <Box>
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Homework Calendar
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          View all your homework deadlines and assignments in calendar format
        </Typography>
        
        {/* Debug Info */}
        <Box sx={{ mb: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="caption" display="block">
            Current Date: {currentDate.toLocaleDateString()}
          </Typography>
          <Typography variant="caption" display="block">
            Current View: {currentView}
          </Typography>
          <Typography variant="caption" display="block">
            Events Count: {calendarEvents.length}
          </Typography>
        </Box>
        
        {/* Legend */}
        <Grid container spacing={1} sx={{ mb: 2 }}>
          <Grid item>
            <Chip
              icon={<AssignmentIcon />}
              label="Completed"
              size="small"
              sx={{ backgroundColor: '#28a745', color: 'white' }}
            />
          </Grid>
          <Grid item>
            <Chip
              icon={<ScheduleIcon />}
              label="Due Today/Tomorrow"
              size="small"
              sx={{ backgroundColor: '#fd7e14', color: 'white' }}
            />
          </Grid>
          <Grid item>
            <Chip
              icon={<ScheduleIcon />}
              label="Overdue"
              size="small"
              sx={{ backgroundColor: '#dc3545', color: 'white' }}
            />
          </Grid>
          <Grid item>
            <Chip
              icon={<AssignmentIcon />}
              label="Upcoming"
              size="small"
              sx={{ backgroundColor: '#3174ad', color: 'white' }}
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper elevation={1} sx={{ height: '600px' }}>
        <Calendar
          localizer={localizer}
          events={calendarEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%', padding: '16px' }}
          onSelectEvent={handleSelectEvent}
          onNavigate={handleNavigate}
          onView={handleViewChange}
          onSelectSlot={handleSelectSlot}
          eventPropGetter={getEventStyle}
          components={{
            event: EventComponent
          }}
          views={['month', 'week', 'day', 'agenda']}
          view={currentView}
          date={currentDate}
          popup
          showMultiDayTimes
          selectable
        />
      </Paper>

      {/* Event Details Dialog */}
      <Dialog open={eventDialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <AssignmentIcon />
            <Typography variant="h6">
              {selectedEvent?.title}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedEvent?.resource?.homework && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        Assignment Details
                      </Typography>
                      
                      {selectedEvent.resource.homework.course && (
                        <Box display="flex" alignItems="center" mb={1}>
                          <SchoolIcon sx={{ mr: 1, fontSize: 16 }} />
                          <Typography variant="body2">
                            <strong>Course:</strong> {selectedEvent.resource.homework.course.name} ({selectedEvent.resource.homework.course.code})
                          </Typography>
                        </Box>
                      )}
                      
                      <Box display="flex" alignItems="center" mb={1}>
                        <ScheduleIcon sx={{ mr: 1, fontSize: 16 }} />
                        <Typography variant="body2">
                          <strong>Due Date:</strong> {moment(selectedEvent.start).format('MMMM Do YYYY, h:mm a')}
                        </Typography>
                      </Box>

                      {selectedEvent.resource.homework.description && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          <strong>Description:</strong> {selectedEvent.resource.homework.description}
                        </Typography>
                      )}

                      {selectedEvent.resource.homework.claimed_grade && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          <strong>Grade:</strong> {selectedEvent.resource.homework.claimed_grade}
                        </Typography>
                      )}

                      {selectedEvent.resource.homework.completion_status && (
                        <Box sx={{ mt: 1 }}>
                          <Chip
                            label={`Status: ${selectedEvent.resource.homework.completion_status}`}
                            color={selectedEvent.resource.homework.completion_status === 'completed' ? 'success' : 'warning'}
                            size="small"
                          />
                        </Box>
                      )}

                      {selectedEvent.resource.homework.deadline_verification_status && (
                        <Box sx={{ mt: 1 }}>
                          <Chip
                            label={`Deadline: ${selectedEvent.resource.homework.deadline_verification_status}`}
                            color={selectedEvent.resource.homework.deadline_verification_status === 'verified' ? 'success' : 'warning'}
                            size="small"
                          />
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CalendarComponent;
