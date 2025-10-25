import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import FallingLeaves from './FallingLeaves';
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

  // Convert all event data to calendar events
  const calendarEvents = events.map((event, index) => {
    const eventType = event.type || 'homework';
    let start, end, title, allDay;
    
    if (eventType === 'class') {
      // For classes, combine class_date with start_time and end_time
      const classDate = new Date(event.due_date);
      
      if (event.start_time) {
        const [startHours, startMinutes] = event.start_time.split(':');
        start = new Date(classDate);
        start.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);
      } else {
        start = classDate;
      }
      
      if (event.end_time) {
        const [endHours, endMinutes] = event.end_time.split(':');
        end = new Date(classDate);
        end.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);
      } else {
        end = new Date(start.getTime() + 60 * 60 * 1000); // Default 1 hour
      }
      
      title = event.title;
      allDay = false;
    } else if (eventType === 'exam') {
      // For exams, combine due_date with exam_time and duration
      const examDate = new Date(event.due_date);
      
      if (event.exam_time) {
        const [examHours, examMinutes] = event.exam_time.split(':');
        start = new Date(examDate);
        start.setHours(parseInt(examHours), parseInt(examMinutes), 0, 0);
        
        // Add duration to get end time
        const durationMs = (event.duration || 60) * 60 * 1000;
        end = new Date(start.getTime() + durationMs);
      } else {
        start = examDate;
        end = new Date(examDate.getTime() + 60 * 60 * 1000); // Default 1 hour
      }
      
      title = event.title;
      allDay = false;
    } else {
      // Homework - show in all-day row for week/day views
      start = new Date(event.due_date || event.claimed_deadline);
      end = new Date(event.due_date || event.claimed_deadline);
      title = event.title;
      allDay = true; // This puts it in the all-day section of week/day views
    }
    
    return {
      id: event._id || index,
      title: title,
      start: start,
      end: end,
      allDay: allDay,
      resource: {
        homework: eventType === 'homework' ? event : null,
        class: eventType === 'class' ? event : null,
        exam: eventType === 'exam' ? event : null,
        type: eventType
      }
    };
  });

  const handleSelectEvent = (event) => {
    console.log('=== EVENT CLICKED ===');
    console.log('Event:', event);
    console.log('Event resource:', event.resource);
    console.log('Event homework:', event.resource?.homework);
    console.log('Event homework course:', event.resource?.homework?.course);
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
    const eventData = event.resource?.homework || event.resource?.class || event.resource?.exam;
    const eventType = event.resource?.type;
    
    if (!eventData) return {};

    // Determine color based on event type and status
    const dueDate = new Date(event.start);
    const today = new Date();
    
    // Normalize dates to midnight for accurate comparison
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    const daysUntilDue = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));

    let backgroundColor = '#95E1D3'; // Default light teal

    if (eventType === 'homework') {
      if (userRole === 'lecturer') {
        // Lecturer-specific logic: focus on deadline urgency and assignment source
        if (daysUntilDue < 0) {
          backgroundColor = '#F38181'; // Light coral for overdue
        } else if (daysUntilDue <= 1) {
          backgroundColor = '#FCE38A'; // Light yellow for urgent (today/tomorrow)
        } else if (daysUntilDue <= 3) {
          backgroundColor = '#FCE38A'; // Light yellow for warning
        } else {
          // Differentiate between lecturer-created and student-created assignments
          if (eventData?.uploader_role === 'lecturer') {
            backgroundColor = '#D6F7AD'; // Light green for lecturer-created assignments
          } else {
            backgroundColor = '#95E1D3'; // Light teal for student-created assignments
          }
        }
      } else {
        // Student-specific logic: focus on completion status (four statuses)
        if (eventData?.completion_status === 'completed' || eventData?.completion_status === 'graded') {
          backgroundColor = '#95E1D3'; // Light teal for completed/graded
        } else if (daysUntilDue < 0) {
          backgroundColor = '#F38181'; // Light coral for overdue
        } else if (daysUntilDue <= 1) {
          backgroundColor = '#FCE38A'; // Light yellow for urgent (today/tomorrow)
        } else if (daysUntilDue <= 3) {
          backgroundColor = '#FCE38A'; // Light yellow for warning
        } else {
          backgroundColor = '#D6F7AD'; // Light green for normal/upcoming
        }
      }
    } else if (eventType === 'class') {
      backgroundColor = '#D6F7AD'; // Light green for classes
    } else if (eventType === 'exam') {
      backgroundColor = '#F38181'; // Light coral for exams
    }

    return {
      backgroundColor,
      borderRadius: '4px',
      opacity: 0.9,
      color: '#333',
      border: '0px',
      display: 'block',
      padding: '4px 6px',
      fontSize: '12px',
      lineHeight: '1.4',
      whiteSpace: 'normal',
      overflow: 'visible'
    };
  };

  const EventComponent = ({ event }) => {
    const eventData = event.resource?.homework || event.resource?.class || event.resource?.exam;
    const eventType = event.resource?.type;
    
    // Debug: Log homework events to see what's being rendered
    if (eventType === 'homework') {
      console.log('Rendering homework in EventComponent:', {
        title: event.title,
        hasCourse: !!eventData?.course,
        courseName: eventData?.course?.name,
        courseCode: eventData?.course?.code,
        courseCourseName: eventData?.course?.course_name,
        courseCourseCode: eventData?.course?.course_code,
        fullCourseData: eventData?.course,
        uploaderRole: eventData?.uploader_role
      });
    }
    
    // Debug: Log exam events to see what's being rendered
    if (eventType === 'exam') {
      console.log('Rendering exam in EventComponent:', {
        title: event.title,
        hasCourse: !!eventData?.course,
        courseName: eventData?.course?.name,
        courseCode: eventData?.course?.code,
        courseCourseName: eventData?.course?.course_name,
        courseCourseCode: eventData?.course?.course_code,
        fullCourseData: eventData?.course
      });
    }
    
    if (eventType === 'class') {
      console.log('Rendering class in EventComponent:', {
        title: event.title,
        hasCourse: !!eventData?.course,
        courseName: eventData?.course?.name,
        courseCode: eventData?.course?.code,
        fullCourseData: eventData?.course
      });
    }
    
    const dueDate = new Date(event.start);
    const today = new Date();
    
    // Normalize dates to midnight for accurate comparison
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    const daysUntilDue = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));

    // Determine color based on event type and status
    let backgroundColor = '#95E1D3'; // Default light teal
    let textColor = '#333';

    if (eventType === 'homework') {
      if (userRole === 'lecturer') {
        // Lecturer-specific logic: focus on deadline urgency and assignment source
        if (daysUntilDue < 0) {
          backgroundColor = '#F38181'; // Light coral for overdue
        } else if (daysUntilDue <= 1) {
          backgroundColor = '#FCE38A'; // Light yellow for urgent (today/tomorrow)
        } else if (daysUntilDue <= 3) {
          backgroundColor = '#FCE38A'; // Light yellow for warning
        } else {
          // Differentiate between lecturer-created and student-created assignments
          if (eventData?.uploader_role === 'lecturer') {
            backgroundColor = '#D6F7AD'; // Light green for lecturer-created assignments
          } else {
            backgroundColor = '#95E1D3'; // Light teal for student-created assignments
          }
        }
      } else {
        // Student-specific logic: focus on completion status (four statuses)
        if (eventData?.completion_status === 'completed' || eventData?.completion_status === 'graded') {
          backgroundColor = '#95E1D3'; // Light teal for completed/graded
        } else if (daysUntilDue < 0) {
          backgroundColor = '#F38181'; // Light coral for overdue
        } else if (daysUntilDue <= 1) {
          backgroundColor = '#FCE38A'; // Light yellow for urgent (today/tomorrow)
        } else if (daysUntilDue <= 3) {
          backgroundColor = '#FCE38A'; // Light yellow for warning
        } else {
          backgroundColor = '#D6F7AD'; // Light green for normal/upcoming
        }
      }
    } else if (eventType === 'class') {
      backgroundColor = '#D6F7AD'; // Light green for classes
    } else if (eventType === 'exam') {
      backgroundColor = '#F38181'; // Light coral for exams
    }

    return (
      <div style={{ 
        backgroundColor, 
        color: textColor,
        padding: '6px 8px',
        borderRadius: '4px',
        minHeight: '50px',
        width: '100%',
        overflow: 'visible',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px'
      }}>
        <div style={{ 
          fontWeight: 'bold', 
          fontSize: '13px',
          lineHeight: '1.4',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginBottom: '2px'
        }}>
          {event.title || 'Untitled'}
        </div>
        {eventData?.course && (() => {
          const courseText = eventData.course.name || eventData.course.course_name || eventData.course.code || eventData.course.course_code || '';
          console.log('Should display course for', event.title, ':', courseText, 'has course?', !!eventData.course);
          return (
            <div className="event-course-name" style={{ 
              fontSize: '11px', 
              opacity: 1,
              lineHeight: '1.3',
              overflow: 'visible',
              display: 'block',
              color: '#333',
              fontWeight: '500',
              marginTop: '2px'
            }}>
              {courseText}
            </div>
          );
        })()}
        {eventType === 'homework' && daysUntilDue <= 1 && (
          <div style={{ 
            fontSize: '9px', 
            fontWeight: 'bold',
            lineHeight: '1.2',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginTop: '2px'
          }}>
            {daysUntilDue < 0 ? 'Overdue!' : daysUntilDue === 0 ? 'Due Today!' : 'Due Tomorrow!'}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="dashboard-card" style={{ marginBottom: '0px' }}>
        <div className="card-content">
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
            {userRole === 'lecturer' ? 'Lecturer Calendar' : 'Homework Calendar'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {userRole === 'lecturer' 
              ? 'Monitor assignment deadlines and track both lecturer-created and student-created homework across your courses'
              : 'View all your homework deadlines and assignments in calendar format'
            }
          </Typography>
          
          {/* Calendar Info */}
          <Box sx={{ mb: 2, p: 1, backgroundColor: 'rgba(149, 225, 211, 0.2)', borderRadius: 1 }}>
            <Typography variant="caption" display="block">
              Current Date: {new Date().toLocaleDateString()}
            </Typography>
            <Typography variant="caption" display="block">
              Current View: {currentView}
            </Typography>
            <Typography variant="caption" display="block">
              Total Events: {calendarEvents.length}
            </Typography>
          </Box>
          
          {/* Legend */}
          <Grid container spacing={1} sx={{ mb: 2 }}>
            {userRole === 'lecturer' ? (
              // Lecturer-specific legend
              <>
                <Grid item>
                  <Chip
                    icon={<ScheduleIcon />}
                    label="Due Today/Tomorrow"
                    size="small"
                    sx={{ 
                      backgroundColor: '#FCE38A', 
                      color: '#333',
                      border: '1px solid #FCE38A'
                    }}
                  />
                </Grid>
                <Grid item>
                  <Chip
                    icon={<ScheduleIcon />}
                    label="Overdue"
                    size="small"
                    sx={{ 
                      backgroundColor: '#F38181', 
                      color: '#333',
                      border: '1px solid #F38181'
                    }}
                  />
                </Grid>
                <Grid item>
                  <Chip
                    icon={<AssignmentIcon />}
                    label="Lecturer Created"
                    size="small"
                    sx={{ 
                      backgroundColor: '#D6F7AD', 
                      color: '#333',
                      border: '1px solid #D6F7AD'
                    }}
                  />
                </Grid>
                <Grid item>
                  <Chip
                    icon={<AssignmentIcon />}
                    label="Student Created"
                    size="small"
                    sx={{ 
                      backgroundColor: '#95E1D3', 
                      color: '#333',
                      border: '1px solid #95E1D3'
                    }}
                  />
                </Grid>
              </>
            ) : (
              // Student-specific legend
              <>
                <Grid item>
                  <Chip
                    icon={<AssignmentIcon />}
                    label="Completed"
                    size="small"
                    sx={{ 
                      backgroundColor: '#95E1D3', 
                      color: '#333',
                      border: '1px solid #95E1D3'
                    }}
                  />
                </Grid>
                <Grid item>
                  <Chip
                    icon={<ScheduleIcon />}
                    label="Due Today/Tomorrow"
                    size="small"
                    sx={{ 
                      backgroundColor: '#FCE38A', 
                      color: '#333',
                      border: '1px solid #FCE38A'
                    }}
                  />
                </Grid>
                <Grid item>
                  <Chip
                    icon={<ScheduleIcon />}
                    label="Overdue"
                    size="small"
                    sx={{ 
                      backgroundColor: '#F38181', 
                      color: '#333',
                      border: '1px solid #F38181'
                    }}
                  />
                </Grid>
                <Grid item>
                  <Chip
                    icon={<AssignmentIcon />}
                    label="Upcoming"
                    size="small"
                    sx={{ 
                      backgroundColor: '#D6F7AD', 
                      color: '#333',
                      border: '1px solid #D6F7AD'
                    }}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </div>
      </div>

      {/* Falling Leaves Animation */}
      <style>
        {`
          .falling-leaves-section {
            margin: 0 !important;
            padding: 0 !important;
            height: 150px !important;
          }
          .falling-leaves {
            margin: 0 !important;
            padding: 0 !important;
          }
        `}
      </style>
      <div style={{ 
        margin: 0, 
        padding: 0, 
        height: '150px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          margin: 0,
          padding: 0
        }}>
          <FallingLeaves />
        </div>
      </div>

      <div className="dashboard-card" style={{ height: '600px', marginTop: '0px' }}>
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
      </div>

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
                  <div className="dashboard-card">
                    <div className="card-content">
                      <Typography variant="subtitle1" gutterBottom>
                        Assignment Details
                      </Typography>
                      
                      {(() => {
                        const course = selectedEvent?.resource?.homework?.course;
                        console.log('DIALOG - Course object:', course);
                        if (!course) return null;
                        
                        const courseName = course.name || course.course_name || '';
                        const courseCode = course.code || course.course_code || '';
                        console.log('DIALOG - courseName:', courseName, 'courseCode:', courseCode);
                        
                        if (!courseName && !courseCode) return null;
                        
                        const displayText = (courseName && courseCode) 
                          ? `${courseName} (${courseCode})` 
                          : courseName || courseCode;
                        
                        return (
                          <Box display="flex" alignItems="center" mb={1}>
                            <SchoolIcon sx={{ mr: 1, fontSize: 16, color: '#95E1D3' }} />
                            <Typography variant="body2">
                              <strong>Course:</strong> {displayText}
                            </Typography>
                          </Box>
                        );
                      })()}
                      
                      <Box display="flex" alignItems="center" mb={1}>
                        <ScheduleIcon sx={{ mr: 1, fontSize: 16, color: '#D6F7AD' }} />
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

                      {selectedEvent.resource.homework.completion_status && userRole !== 'lecturer' && (
                        <Box sx={{ mt: 1 }}>
                          <Chip
                            label={`Status: ${String(selectedEvent.resource.homework.completion_status).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`}
                            sx={{
                              backgroundColor: selectedEvent.resource.homework.completion_status === 'completed' ? 'rgba(149, 225, 211, 0.3)' : 'rgba(252, 227, 138, 0.3)',
                              color: '#333',
                              border: selectedEvent.resource.homework.completion_status === 'completed' ? '1px solid #95E1D3' : '1px solid #FCE38A'
                            }}
                            size="small"
                          />
                        </Box>
                      )}

                      {selectedEvent.resource.homework.deadline_verification_status && (
                        <Box sx={{ mt: 1 }}>
                          <Chip
                            label={`Deadline: ${String(selectedEvent.resource.homework.deadline_verification_status).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`}
                            sx={{
                              backgroundColor: selectedEvent.resource.homework.deadline_verification_status === 'verified' ? 'rgba(149, 225, 211, 0.3)' : 'rgba(252, 227, 138, 0.3)',
                              color: '#333',
                              border: selectedEvent.resource.homework.deadline_verification_status === 'verified' ? '1px solid #95E1D3' : '1px solid #FCE38A'
                            }}
                            size="small"
                          />
                        </Box>
                      )}
                    </div>
                  </div>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CalendarComponent;
