const express = require('express');
const router = express.Router();
const Exam = require('../models/Exam');
const Course = require('../models/Course');
const Grade = require('../models/Grade');
const User = require('../models/User');
const { checkJwt, extractUser, requireLecturer } = require('../middleware/auth');

// GET /api/exams - Get all exams with filters
router.get('/', checkJwt, extractUser, async (req, res) => {
  try {
    const { course_id, exam_type, upcoming, days = 14 } = req.query;
    const userRole = req.userInfo.roles[0];
    const userId = req.userInfo.auth0_id;
    
    let filter = { is_active: true };
    
    if (course_id) {
      filter.course_id = course_id;
    }
    
    if (exam_type) {
      filter.exam_type = exam_type;
    }
    
    // Role-based filtering
    if (userRole === 'student') {
      const studentCourses = await Course.find({ students: userId, is_active: true }).select('_id');
      const courseIds = studentCourses.map(course => course._id);
      filter.course_id = { $in: courseIds };
      filter.is_published = true; // Students can only see published exams
    } else if (userRole === 'lecturer') {
      const lecturerCourses = await Course.find({ lecturer_id: userId, is_active: true }).select('_id');
      const courseIds = lecturerCourses.map(course => course._id);
      filter.course_id = { $in: courseIds };
    }
    
    let query;
    
    if (upcoming === 'true') {
      query = Exam.findUpcoming(parseInt(days));
    } else {
      query = Exam.find(filter);
    }
    
    const exams = await query
      .populate('course_id', 'course_name course_code lecturer_id students')
      .populate({
        path: 'grades',
        populate: {
          path: 'student_id',
          select: 'name email full_name'
        }
      })
      .sort({ due_date: 1 });
    
    // Apply role filtering to results if needed
    let filteredExams = exams;
    if (userRole === 'student') {
      filteredExams = exams.filter(exam => 
        exam.course_id.students.some(student => student.equals(userId)) && exam.is_published
      );
    } else if (userRole === 'lecturer') {
      filteredExams = exams.filter(exam => 
        exam.course_id.lecturer_id.equals(userId)
      );
    }
    
    res.json(filteredExams);
  } catch (error) {
    console.error('Error fetching exams:', error);
    res.status(500).json({ error: 'Failed to fetch exams' });
  }
});

// GET /api/exams/:id - Get specific exam with relationships
router.get('/:id', checkJwt, extractUser, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('course_id', 'course_name course_code lecturer_id students')
      .populate({
        path: 'grades',
        populate: {
          path: 'student_id',
          select: 'name email full_name'
        }
      });
    
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }
    
    // Check access permissions
    const userRole = req.userInfo.roles[0];
    const userId = req.userInfo.auth0_id;
    
    if (userRole === 'student') {
      const isEnrolled = exam.course_id.students.some(student => student.equals(userId));
      if (!isEnrolled || !exam.is_published) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (userRole === 'lecturer') {
      if (!exam.course_id.lecturer_id.equals(userId)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    res.json(exam);
  } catch (error) {
    console.error('Error fetching exam:', error);
    res.status(500).json({ error: 'Failed to fetch exam' });
  }
});

// POST /api/exams - Create new exam (Lecturer only)
router.post('/', checkJwt, extractUser, requireLecturer, async (req, res) => {
  try {
    const {
      course_id,
      exam_title,
      description,
      instructions,
      due_date,
      start_time,
      duration_minutes,
      exam_type,
      points_possible,
      room,
      is_online,
      meeting_link,
      open_book,
      calculator_allowed,
      notes_allowed
    } = req.body;
    
    // Verify course exists and lecturer has access
    const course = await Course.findById(course_id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    const lecturer = await User.findOne({ auth0_id: req.auth.sub });
    if (!course.lecturer_id.equals(lecturer._id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const exam = new Exam({
      course_id,
      exam_title,
      description,
      instructions,
      due_date,
      start_time,
      duration_minutes,
      exam_type,
      points_possible,
      room,
      is_online,
      meeting_link,
      open_book,
      calculator_allowed,
      notes_allowed
    });
    
    await exam.save();
    await exam.populate('course_id', 'course_name course_code');
    
    res.status(201).json(exam);
  } catch (error) {
    console.error('Error creating exam:', error);
    res.status(500).json({ error: 'Failed to create exam' });
  }
});

// PUT /api/exams/:id - Update exam (Lecturer only)
router.put('/:id', checkJwt, extractUser, requireLecturer, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id).populate('course_id');
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }
    
    // Check if lecturer owns this exam
    const lecturer = await User.findOne({ auth0_id: req.auth.sub });
    if (!exam.course_id.lecturer_id.equals(lecturer._id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const {
      exam_title,
      description,
      instructions,
      due_date,
      start_time,
      duration_minutes,
      exam_type,
      points_possible,
      room,
      is_online,
      meeting_link,
      open_book,
      calculator_allowed,
      notes_allowed
    } = req.body;
    
    if (exam_title) exam.exam_title = exam_title;
    if (description) exam.description = description;
    if (instructions) exam.instructions = instructions;
    if (due_date) exam.due_date = due_date;
    if (start_time) exam.start_time = start_time;
    if (duration_minutes) exam.duration_minutes = duration_minutes;
    if (exam_type) exam.exam_type = exam_type;
    if (points_possible) exam.points_possible = points_possible;
    if (room) exam.room = room;
    if (is_online !== undefined) exam.is_online = is_online;
    if (meeting_link) exam.meeting_link = meeting_link;
    if (open_book !== undefined) exam.open_book = open_book;
    if (calculator_allowed !== undefined) exam.calculator_allowed = calculator_allowed;
    if (notes_allowed !== undefined) exam.notes_allowed = notes_allowed;
    
    await exam.save();
    await exam.populate('course_id', 'course_name course_code');
    
    res.json(exam);
  } catch (error) {
    console.error('Error updating exam:', error);
    res.status(500).json({ error: 'Failed to update exam' });
  }
});

// POST /api/exams/:id/publish - Publish exam (Lecturer only)
router.post('/:id/publish', checkJwt, extractUser, requireLecturer, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id).populate('course_id');
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }
    
    const lecturer = await User.findOne({ auth0_id: req.auth.sub });
    if (!exam.course_id.lecturer_id.equals(lecturer._id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await exam.publish();
    
    res.json({ message: 'Exam published successfully', exam });
  } catch (error) {
    console.error('Error publishing exam:', error);
    res.status(500).json({ error: 'Failed to publish exam' });
  }
});

// GET /api/exams/course/:courseId - Get exams for specific course
router.get('/course/:courseId', checkJwt, extractUser, async (req, res) => {
  try {
    const userRole = req.userInfo.roles[0];
    
    let exams = await Exam.findByCourse(req.params.courseId)
      .populate('course_id', 'course_name course_code')
      .populate({
        path: 'grades',
        populate: {
          path: 'student_id',
          select: 'name email'
        }
      });
    
    // Filter published exams for students
    if (userRole === 'student') {
      exams = exams.filter(exam => exam.is_published);
    }
    
    res.json(exams);
  } catch (error) {
    console.error('Error fetching course exams:', error);
    res.status(500).json({ error: 'Failed to fetch course exams' });
  }
});

// GET /api/exams/upcoming/:days - Get upcoming exams
router.get('/upcoming/:days', checkJwt, extractUser, async (req, res) => {
  try {
    const days = parseInt(req.params.days) || 14;
    const userRole = req.userInfo.roles[0];
    const userId = req.userInfo.auth0_id;
    
    let exams = await Exam.findUpcoming(days)
      .populate('course_id', 'course_name course_code lecturer_id students');
    
    // Filter by user role
    if (userRole === 'student') {
      exams = exams.filter(exam => 
        exam.course_id.students.some(student => student.equals(userId)) && exam.is_published
      );
    } else if (userRole === 'lecturer') {
      exams = exams.filter(exam => 
        exam.course_id.lecturer_id.equals(userId)
      );
    }
    
    res.json(exams);
  } catch (error) {
    console.error('Error fetching upcoming exams:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming exams' });
  }
});

// GET /api/exams/today - Get today's exams
router.get('/today', checkJwt, extractUser, async (req, res) => {
  try {
    const userRole = req.userInfo.roles[0];
    const userId = req.userInfo.auth0_id;
    
    let exams = await Exam.findToday()
      .populate('course_id', 'course_name course_code lecturer_id students');
    
    // Filter by user role
    if (userRole === 'student') {
      exams = exams.filter(exam => 
        exam.course_id.students.some(student => student.equals(userId)) && exam.is_published
      );
    } else if (userRole === 'lecturer') {
      exams = exams.filter(exam => 
        exam.course_id.lecturer_id.equals(userId)
      );
    }
    
    res.json(exams);
  } catch (error) {
    console.error('Error fetching today\'s exams:', error);
    res.status(500).json({ error: 'Failed to fetch today\'s exams' });
  }
});

// GET /api/exams/:id/grades - Get grades for specific exam
router.get('/:id/grades', checkJwt, extractUser, requireLecturer, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id).populate('course_id');
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }
    
    const grades = await Grade.findByExam(req.params.id)
      .populate('student_id', 'name email full_name')
      .populate('graded_by', 'name email');
    
    res.json(grades);
  } catch (error) {
    console.error('Error fetching exam grades:', error);
    res.status(500).json({ error: 'Failed to fetch exam grades' });
  }
});

// POST /api/exams/:id/grade - Grade exam
router.post('/:id/grade', checkJwt, extractUser, requireLecturer, async (req, res) => {
  try {
    const { student_id, grade, points_earned, feedback } = req.body;
    
    const exam = await Exam.findById(req.params.id).populate('course_id');
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }
    
    const lecturer = await User.findOne({ auth0_id: req.auth.sub });
    if (!exam.course_id.lecturer_id.equals(lecturer._id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check if grade already exists
    let gradeRecord = await Grade.findOne({ 
      student_id, 
      exam_id: req.params.id 
    });
    
    if (gradeRecord) {
      // Update existing grade
      gradeRecord.grade = grade;
      gradeRecord.points_earned = points_earned;
      gradeRecord.points_possible = exam.points_possible;
      gradeRecord.feedback = feedback;
      gradeRecord.letter_grade = gradeRecord.calculateLetterGrade();
      gradeRecord.graded_at = new Date();
    } else {
      // Create new grade
      gradeRecord = new Grade({
        student_id,
        exam_id: req.params.id,
        grade,
        points_earned,
        points_possible: exam.points_possible,
        feedback,
        graded_by: lecturer._id
      });
      gradeRecord.letter_grade = gradeRecord.calculateLetterGrade();
    }
    
    await gradeRecord.save();
    await gradeRecord.populate('student_id', 'name email full_name');
    
    res.json(gradeRecord);
  } catch (error) {
    console.error('Error grading exam:', error);
    res.status(500).json({ error: 'Failed to grade exam' });
  }
});

// DELETE /api/exams/:id - Delete exam (Lecturer only)
router.delete('/:id', checkJwt, extractUser, requireLecturer, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id).populate('course_id');
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }
    
    const lecturer = await User.findOne({ auth0_id: req.auth.sub });
    if (!exam.course_id.lecturer_id.equals(lecturer._id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    exam.is_active = false;
    await exam.save();
    
    res.json({ message: 'Exam deleted successfully' });
  } catch (error) {
    console.error('Error deleting exam:', error);
    res.status(500).json({ error: 'Failed to delete exam' });
  }
});

module.exports = router;
