const express = require('express');
const router = express.Router();
const Class = require('../models/Class');
const Course = require('../models/Course');
const User = require('../models/User');
const { checkJwt, extractUser, requireLecturer } = require('../middleware/auth');

// GET /api/classes - Get all classes with filters
router.get('/', checkJwt, extractUser, async (req, res) => {
  try {
    const { course_id, date, room, upcoming, today } = req.query;
    const userRole = req.userInfo.roles[0];
    const auth0Id = req.userInfo.auth0_id;
    
    let filter = {};
    
    if (course_id) {
      filter.course_id = course_id;
    }
    
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      filter.class_date = { $gte: startDate, $lt: endDate };
    }
    
    if (room) {
      filter.room = new RegExp(room, 'i');
    }
    
    // Role-based filtering
    if (userRole === 'student') {
      // Find the user by Auth0 ID to get MongoDB ObjectId
      const user = await User.findOne({ auth0_id: auth0Id });
      if (user) {
        const studentCourses = await Course.find({ students: user._id, is_active: true }).select('_id');
        const courseIds = studentCourses.map(course => course._id);
        filter.course_id = { $in: courseIds };
      }
    } else if (userRole === 'lecturer') {
      // Find the user by Auth0 ID to get MongoDB ObjectId
      const user = await User.findOne({ auth0_id: auth0Id });
      if (user) {
        const lecturerCourses = await Course.find({ lecturer_id: user._id, is_active: true }).select('_id');
        const courseIds = lecturerCourses.map(course => course._id);
        filter.course_id = { $in: courseIds };
      }
    }
    
    let query;
    
    if (today === 'true') {
      query = Class.findToday();
    } else if (upcoming === 'true') {
      const days = parseInt(req.query.days) || 7;
      query = Class.findUpcoming(days);
    } else {
      query = Class.find(filter);
    }
    
    const classes = await query
      .populate('course_id', 'course_name course_code lecturer_id students')
      .sort({ class_date: 1, start_time: 1 });
    
    // Apply role filtering to results if needed
    let filteredClasses = classes;
    if (userRole === 'student') {
      const user = await User.findOne({ auth0_id: auth0Id });
      if (user) {
        filteredClasses = classes.filter(cls => 
          cls.course_id.students.some(student => student.equals(user._id))
        );
      }
    } else if (userRole === 'lecturer') {
      const user = await User.findOne({ auth0_id: auth0Id });
      if (user) {
        filteredClasses = classes.filter(cls => 
          cls.course_id.lecturer_id.equals(user._id)
        );
      }
    }
    
    res.json(filteredClasses);
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// GET /api/classes/:id - Get specific class with relationships
router.get('/:id', checkJwt, extractUser, async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id)
      .populate('course_id', 'course_name course_code lecturer_id students');
    
    if (!classItem) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    // Check access permissions
    const userRole = req.userInfo.roles[0];
    const auth0Id = req.userInfo.auth0_id;
    
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (userRole === 'student') {
      const isEnrolled = classItem.course_id.students.some(student => student.equals(user._id));
      if (!isEnrolled) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (userRole === 'lecturer') {
      if (!classItem.course_id.lecturer_id.equals(user._id)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    res.json(classItem);
  } catch (error) {
    console.error('Error fetching class:', error);
    res.status(500).json({ error: 'Failed to fetch class' });
  }
});

// POST /api/classes - Create new class
router.post('/', checkJwt, extractUser, async (req, res) => {
  try {
    const {
      course_id,
      class_title,
      class_date,
      start_time,
      end_time,
      room,
      description,
      agenda,
      class_type,
      attendance_required,
      is_online,
      meeting_link,
      meeting_password
    } = req.body;
    
    // Verify course exists
    const course = await Course.findById(course_id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    const user = await User.findOne({ auth0_id: req.userInfo.auth0_id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const userRole = req.userInfo.roles[0];
    
    // Check permissions
    if (userRole === 'lecturer') {
      // Lecturers can only create classes for their own courses
      if (!course.lecturer_id.equals(user._id)) {
        return res.status(403).json({ error: 'Access denied - not your course' });
      }
    } else if (userRole === 'student') {
      // Students can create classes if they're enrolled in the course
      if (!course.students.some(studentId => studentId.equals(user._id))) {
        return res.status(403).json({ error: 'Access denied - not enrolled in this course' });
      }
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const classItem = new Class({
      course_id,
      class_title,
      class_date,
      start_time,
      end_time,
      room,
      description,
      agenda,
      class_type,
      attendance_required,
      is_online,
      meeting_link,
      meeting_password
    });
    
    await classItem.save();
    await classItem.populate('course_id', 'course_name course_code');
    
    res.status(201).json(classItem);
  } catch (error) {
    console.error('Error creating class:', error);
    res.status(500).json({ error: 'Failed to create class' });
  }
});

// PUT /api/classes/:id - Update class
router.put('/:id', checkJwt, extractUser, async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id).populate('course_id');
    if (!classItem) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    const user = await User.findOne({ auth0_id: req.userInfo.auth0_id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const userRole = req.userInfo.roles[0];
    
    // Check permissions
    if (userRole === 'lecturer') {
      // Lecturers can only update classes from their own courses
      if (!classItem.course_id.lecturer_id.equals(user._id)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (userRole === 'student') {
      // Students can update classes if they're enrolled in the course
      const course = classItem.course_id;
      if (!course.students.some(studentId => studentId.equals(user._id))) {
        return res.status(403).json({ error: 'Access denied - not enrolled in this course' });
      }
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const {
      class_title,
      class_date,
      start_time,
      end_time,
      room,
      description,
      agenda,
      class_type,
      attendance_required,
      is_online,
      meeting_link,
      meeting_password
    } = req.body;
    
    if (class_title) classItem.class_title = class_title;
    if (class_date) classItem.class_date = class_date;
    if (start_time) classItem.start_time = start_time;
    if (end_time) classItem.end_time = end_time;
    if (room) classItem.room = room;
    if (description) classItem.description = description;
    if (agenda) classItem.agenda = agenda;
    if (class_type) classItem.class_type = class_type;
    if (attendance_required !== undefined) classItem.attendance_required = attendance_required;
    if (is_online !== undefined) classItem.is_online = is_online;
    if (meeting_link) classItem.meeting_link = meeting_link;
    if (meeting_password) classItem.meeting_password = meeting_password;
    
    await classItem.save();
    await classItem.populate('course_id', 'course_name course_code');
    
    res.json(classItem);
  } catch (error) {
    console.error('Error updating class:', error);
    res.status(500).json({ error: 'Failed to update class' });
  }
});

// POST /api/classes/:id/cancel - Cancel class (Lecturer only)
router.post('/:id/cancel', checkJwt, extractUser, requireLecturer, async (req, res) => {
  try {
    const { cancellation_reason } = req.body;
    
    const classItem = await Class.findById(req.params.id).populate('course_id');
    if (!classItem) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    const lecturer = await User.findOne({ auth0_id: req.userInfo.auth0_id });
    if (!lecturer) {
      return res.status(404).json({ error: 'Lecturer not found in database' });
    }
    
    if (!classItem.course_id.lecturer_id.equals(lecturer._id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await classItem.cancel(cancellation_reason);
    
    res.json({ message: 'Class cancelled successfully', class: classItem });
  } catch (error) {
    console.error('Error cancelling class:', error);
    res.status(500).json({ error: 'Failed to cancel class' });
  }
});

// GET /api/classes/course/:courseId - Get classes for specific course
router.get('/course/:courseId', checkJwt, extractUser, async (req, res) => {
  try {
    const classes = await Class.findByCourse(req.params.courseId)
      .populate('course_id', 'course_name course_code');
    
    res.json(classes);
  } catch (error) {
    console.error('Error fetching course classes:', error);
    res.status(500).json({ error: 'Failed to fetch course classes' });
  }
});

// GET /api/classes/room/:room - Get classes for specific room
router.get('/room/:room', checkJwt, extractUser, async (req, res) => {
  try {
    const classes = await Class.findByRoom(req.params.room)
      .populate('course_id', 'course_name course_code lecturer_id');
    
    res.json(classes);
  } catch (error) {
    console.error('Error fetching room classes:', error);
    res.status(500).json({ error: 'Failed to fetch room classes' });
  }
});

// GET /api/classes/today - Get today's classes
router.get('/today', checkJwt, extractUser, async (req, res) => {
  try {
    const userRole = req.userInfo.roles[0];
    const auth0Id = req.userInfo.auth0_id;
    
    let classes = await Class.findToday()
      .populate('course_id', 'course_name course_code lecturer_id students');
    
    // Filter by user role
    const user = await User.findOne({ auth0_id: auth0Id });
    if (user) {
      if (userRole === 'student') {
        classes = classes.filter(cls => 
          cls.course_id.students.some(student => student.equals(user._id))
        );
      } else if (userRole === 'lecturer') {
        classes = classes.filter(cls => 
          cls.course_id.lecturer_id.equals(user._id)
        );
      }
    }
    
    res.json(classes);
  } catch (error) {
    console.error('Error fetching today\'s classes:', error);
    res.status(500).json({ error: 'Failed to fetch today\'s classes' });
  }
});

// GET /api/classes/upcoming/:days - Get upcoming classes
router.get('/upcoming/:days', checkJwt, extractUser, async (req, res) => {
  try {
    const days = parseInt(req.params.days) || 7;
    const userRole = req.userInfo.roles[0];
    const auth0Id = req.userInfo.auth0_id;
    
    let classes = await Class.findUpcoming(days)
      .populate('course_id', 'course_name course_code lecturer_id students');
    
    // Filter by user role
    const user = await User.findOne({ auth0_id: auth0Id });
    if (user) {
      if (userRole === 'student') {
        classes = classes.filter(cls => 
          cls.course_id.students.some(student => student.equals(user._id))
        );
      } else if (userRole === 'lecturer') {
        classes = classes.filter(cls => 
          cls.course_id.lecturer_id.equals(user._id)
        );
      }
    }
    
    res.json(classes);
  } catch (error) {
    console.error('Error fetching upcoming classes:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming classes' });
  }
});

// DELETE /api/classes/:id - Delete class
router.delete('/:id', checkJwt, extractUser, async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id).populate('course_id');
    if (!classItem) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    const user = await User.findOne({ auth0_id: req.userInfo.auth0_id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const userRole = req.userInfo.roles[0];
    
    // Check permissions
    if (userRole === 'lecturer') {
      // Lecturers can only delete classes from their own courses
      if (!classItem.course_id.lecturer_id.equals(user._id)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (userRole === 'student') {
      // Students can delete classes if they're enrolled in the course
      const course = classItem.course_id;
      if (!course.students.some(studentId => studentId.equals(user._id))) {
        return res.status(403).json({ error: 'Access denied - not enrolled in this course' });
      }
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await Class.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    console.error('Error deleting class:', error);
    res.status(500).json({ error: 'Failed to delete class' });
  }
});

module.exports = router;
