# Calendar Installation Guide

To use the new calendar feature, you need to install the required packages:

## Installation Commands

```bash
cd client
npm install react-big-calendar moment
```

## What Was Added

### 1. Calendar Component (`client/src/Components/Calendar.jsx`)
- Reusable calendar component using [react-big-calendar](https://github.com/jquense/react-big-calendar)
- Supports multiple views: month, week, day, agenda
- Color-coded events based on status and urgency
- Event details dialog with homework information
- Legend showing different event types

### 2. Lecturer Calendar (`client/src/pages/lecturer/LecturerCalendar.jsx`)
- Shows all homework assignments across lecturer's courses
- Combines traditional homework and student-created homework
- Statistics cards showing totals and pending verifications
- Calendar view of all deadlines

### 3. Student Calendar (`client/src/pages/student/StudentCalendar.jsx`)
- Shows student's homework assignments
- Statistics cards showing completed, upcoming, and overdue homework
- Calendar view with color-coded events

### 4. Navigation Updates
- Added "Calendar" links to both student and lecturer sidebars
- Routes added to App.jsx for `/student/calendar` and `/lecturer/calendar`

## Features

### Color Coding
- **Green**: Completed homework
- **Red**: Overdue homework
- **Orange**: Due today/tomorrow
- **Yellow**: Due within 3 days
- **Blue**: Upcoming homework

### Calendar Views
- **Month View**: Overview of all assignments
- **Week View**: Detailed weekly schedule
- **Day View**: Daily assignments
- **Agenda View**: List format

### Event Details
- Click on any event to see detailed information
- Shows course, due date, description, grade, and status
- Displays verification status for student-created homework

## Usage

1. Install the packages using the commands above
2. Navigate to the Calendar page from the sidebar
3. Use the view switcher to change between month/week/day/agenda
4. Click on events to see detailed information
5. Use the legend to understand color coding

The calendar integrates seamlessly with your existing homework management system and provides a visual way to track deadlines and assignments.
