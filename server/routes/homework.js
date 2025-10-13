const express = require('express');
const router = express.Router();
const Homework = require('../models/Homework');
const Course = require('../models/Course');
const Grade = require('../models/Grade');
const User = require('../models/User');
const { checkJwt, extractUser, requireLecturer } = require('../middleware/auth');

// GET /api/homework - Get all homework with filters
router.get('/', checkJwt, extractUser, async (req, res) => {
  try {
    const { course_id, upcoming, days = 7 } = req.query;
    const userRole = req.userInfo.roles[0];
    const userId = req.userInfo.auth0_id;
    
    let filter = { is_active: true };
    
    if (course_id) {
      filter.course_id = course_id;
    }
    
    // Role-based filtering
    if (userRole === 'student') {
      // First find the student's MongoDB ObjectId
      const student = await User.findOne({ auth0_id: userId });
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
      
      // Get courses the student is enrolled in
      const studentCourses = await Course.find({ students: student._id, is_active: true }).select('_id');
      const courseIds = studentCourses.map(course => course._id);
      filter.course_id = { $in: courseIds };
    } else if (userRole === 'lecturer') {
      // First find the lecturer's MongoDB ObjectId
      const lecturer = await User.findOne({ auth0_id: userId });
      if (!lecturer) {
        return res.status(404).json({ error: 'Lecturer not found' });
      }
      
      // Get courses the lecturer teaches
      const lecturerCourses = await Course.find({ lecturer_id: lecturer._id, is_active: true }).select('_id');
      const courseIds = lecturerCourses.map(course => course._id);
      filter.course_id = { $in: courseIds };
    }
    
    let query = Homework.find(filter)
      .populate('course_id', 'course_name course_code lecturer_id')
      .populate({
        path: 'grades',
        populate: {
          path: 'student_id',
          select: 'name email full_name'
        }
      });
    
    if (upcoming === 'true') {
      query = Homework.findUpcoming(parseInt(days))
        .populate('course_id', 'course_name course_code lecturer_id');
    }
    
    const homework = await query.sort({ due_date: 1 });
    
    res.json(homework);
  } catch (error) {
    console.error('Error fetching homework:', error);
    res.status(500).json({ error: 'Failed to fetch homework' });
  }
});

// GET /api/homework/:id - Get specific homework with relationships
router.get('/:id', checkJwt, extractUser, async (req, res) => {
  try {
    const homework = await Homework.findById(req.params.id)
      .populate('course_id', 'course_name course_code lecturer_id students')
      .populate({
        path: 'grades',
        populate: {
          path: 'student_id',
          select: 'name email full_name'
        }
      })
      .populate({
        path: 'partners',
        populate: [
          { path: 'student1_id', select: 'name email full_name' },
          { path: 'student2_id', select: 'name email full_name' }
        ]
      });
    
    if (!homework) {
      return res.status(404).json({ error: 'Homework not found' });
    }
    
    // Check access permissions
    const userRole = req.userInfo.roles[0];
    const auth0UserId = req.userInfo.auth0_id;
    
    if (userRole === 'student') {
      // Find the student's MongoDB ObjectId
      const student = await User.findOne({ auth0_id: auth0UserId });
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
      
      const isEnrolled = homework.course_id.students.some(studentId => studentId.equals(student._id));
      if (!isEnrolled) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (userRole === 'lecturer') {
      // Find the lecturer's MongoDB ObjectId
      const lecturer = await User.findOne({ auth0_id: auth0UserId });
      if (!lecturer) {
        return res.status(404).json({ error: 'Lecturer not found' });
      }
      
      if (!homework.course_id.lecturer_id.equals(lecturer._id)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    res.json(homework);
  } catch (error) {
    console.error('Error fetching homework:', error);
    res.status(500).json({ error: 'Failed to fetch homework' });
  }
});

// POST /api/homework - Create new homework (Lecturer only)
router.post('/', checkJwt, extractUser, requireLecturer, async (req, res) => {
  try {
    const {
      course_id,
      title,
      description,
      instructions,
      due_date,
      points_possible,
      submission_type,
      allow_late_submission,
      allow_partners,
      max_partners
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
    
    const homework = new Homework({
      course_id,
      title,
      description,
      instructions,
      due_date,
      points_possible,
      submission_type,
      allow_late_submission,
      allow_partners: allow_partners || false,
      max_partners: max_partners || 1
    });
    
    await homework.save();
    await homework.populate('course_id', 'course_name course_code');
    
    res.status(201).json(homework);
  } catch (error) {
    console.error('Error creating homework:', error);
    res.status(500).json({ error: 'Failed to create homework' });
  }
});

// PUT /api/homework/:id - Update homework (Lecturer only)
router.put('/:id', checkJwt, extractUser, requireLecturer, async (req, res) => {
  try {
    const homework = await Homework.findById(req.params.id).populate('course_id');
    if (!homework) {
      return res.status(404).json({ error: 'Homework not found' });
    }
    
    // Check if lecturer owns this homework
    const lecturer = await User.findOne({ auth0_id: req.auth.sub });
    if (!homework.course_id.lecturer_id.equals(lecturer._id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const {
      title,
      description,
      instructions,
      due_date,
      points_possible,
      submission_type,
      allow_late_submission
    } = req.body;
    
    if (title) homework.title = title;
    if (description) homework.description = description;
    if (instructions) homework.instructions = instructions;
    if (due_date) homework.due_date = due_date;
    if (points_possible) homework.points_possible = points_possible;
    if (submission_type) homework.submission_type = submission_type;
    if (allow_late_submission !== undefined) homework.allow_late_submission = allow_late_submission;
    
    await homework.save();
    await homework.populate('course_id', 'course_name course_code');
    
    res.json(homework);
  } catch (error) {
    console.error('Error updating homework:', error);
    res.status(500).json({ error: 'Failed to update homework' });
  }
});

// GET /api/homework/course/:courseId - Get homework for specific course
router.get('/course/:courseId', checkJwt, extractUser, async (req, res) => {
  try {
    const userRole = req.userInfo.roles[0];
    const userId = req.userInfo.auth0_id;
    
    const homework = await Homework.findByCourse(req.params.courseId)
      .populate('course_id', 'course_name course_code')
      .populate({
        path: 'grades',
        populate: {
          path: 'student_id',
          select: 'name email'
        }
      });
    
    // For students, add submission information
    if (userRole === 'student') {
      const user = await User.findOne({ auth0_id: userId });
      if (user) {
        const processedHomework = await Promise.all(homework.map(async (hw) => {
          const studentSubmission = await Grade.findOne({
            homework_id: hw._id,
            student_id: user._id
          }).populate('student_id', 'name email');
          
          return {
            ...hw.toObject(),
            submitted: !!studentSubmission,
            submission: studentSubmission ? {
              _id: studentSubmission._id,
              submitted_at: studentSubmission.submission_date,
              comments: studentSubmission.feedback,
              grade: studentSubmission.grade
            } : null
          };
        }));
        
        return res.json(processedHomework);
      }
    }
    
    res.json(homework);
  } catch (error) {
    console.error('Error fetching course homework:', error);
    res.status(500).json({ error: 'Failed to fetch course homework' });
  }
});

// GET /api/homework/upcoming/:days - Get upcoming homework
router.get('/upcoming/:days', checkJwt, extractUser, async (req, res) => {
  try {
    const days = parseInt(req.params.days) || 7;
    const userRole = req.userInfo.roles[0];
    const userId = req.userInfo.auth0_id;
    
    let homework = await Homework.findUpcoming(days)
      .populate('course_id', 'course_name course_code lecturer_id students');
    
    // Filter by user role
    if (userRole === 'student') {
      homework = homework.filter(hw => 
        hw.course_id.students.some(student => student.equals(userId))
      );
    } else if (userRole === 'lecturer') {
      homework = homework.filter(hw => 
        hw.course_id.lecturer_id.equals(userId)
      );
    }
    
    res.json(homework);
  } catch (error) {
    console.error('Error fetching upcoming homework:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming homework' });
  }
});

// GET /api/homework/:id/grades - Get grades for specific homework
router.get('/:id/grades', checkJwt, extractUser, requireLecturer, async (req, res) => {
  try {
    const homework = await Homework.findById(req.params.id).populate('course_id');
    if (!homework) {
      return res.status(404).json({ error: 'Homework not found' });
    }
    
    const grades = await Grade.findByHomework(req.params.id)
      .populate('student_id', 'name email full_name')
      .populate('graded_by', 'name email');
    
    res.json(grades);
  } catch (error) {
    console.error('Error fetching homework grades:', error);
    res.status(500).json({ error: 'Failed to fetch homework grades' });
  }
});

// POST /api/homework/:id/grade - Grade homework submission
router.post('/:id/grade', checkJwt, extractUser, requireLecturer, async (req, res) => {
  try {
    const { student_id, grade, points_earned, feedback, is_late } = req.body;
    
    const homework = await Homework.findById(req.params.id).populate('course_id');
    if (!homework) {
      return res.status(404).json({ error: 'Homework not found' });
    }
    
    const lecturer = await User.findOne({ auth0_id: req.auth.sub });
    if (!homework.course_id.lecturer_id.equals(lecturer._id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check if grade already exists
    let gradeRecord = await Grade.findOne({ 
      student_id, 
      homework_id: req.params.id 
    });
    
    if (gradeRecord) {
      // Update existing grade
      gradeRecord.grade = grade;
      gradeRecord.points_earned = points_earned;
      gradeRecord.points_possible = homework.points_possible;
      gradeRecord.feedback = feedback;
      gradeRecord.is_late = is_late;
      gradeRecord.letter_grade = gradeRecord.calculateLetterGrade();
      gradeRecord.graded_at = new Date();
    } else {
      // Create new grade
      gradeRecord = new Grade({
        student_id,
        homework_id: req.params.id,
        grade,
        points_earned,
        points_possible: homework.points_possible,
        feedback,
        is_late,
        graded_by: lecturer._id
      });
      gradeRecord.letter_grade = gradeRecord.calculateLetterGrade();
    }
    
    await gradeRecord.save();
    await gradeRecord.populate('student_id', 'name email full_name');
    
    res.json(gradeRecord);
  } catch (error) {
    console.error('Error grading homework:', error);
    res.status(500).json({ error: 'Failed to grade homework' });
  }
});

// DELETE /api/homework/:id - Delete homework (Lecturer only)
router.delete('/:id', checkJwt, extractUser, requireLecturer, async (req, res) => {
  try {
    const homework = await Homework.findById(req.params.id).populate('course_id');
    if (!homework) {
      return res.status(404).json({ error: 'Homework not found' });
    }
    
    const lecturer = await User.findOne({ auth0_id: req.auth.sub });
    if (!homework.course_id.lecturer_id.equals(lecturer._id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Delete related data
    const Partner = require('../models/Partner');
    
    // Delete partnerships for this homework
    await Partner.deleteMany({ homework_id: req.params.id });
    
    // Delete grades for this homework
    await Grade.deleteMany({ homework_id: req.params.id });
    
    // Delete the homework itself
    await Homework.findByIdAndDelete(req.params.id);
    
    console.log(`Deleted homework ${req.params.id} and its partnerships/grades`);
    
    res.json({ 
      message: 'Homework and all related data deleted successfully',
      deleted: {
        homework_id: req.params.id,
        title: homework.title
      }
    });
  } catch (error) {
    console.error('Error deleting homework:', error);
    res.status(500).json({ error: 'Failed to delete homework' });
  }
});

module.exports = router;
