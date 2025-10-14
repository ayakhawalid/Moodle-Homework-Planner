const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Homework = require('../models/Homework');
const Class = require('../models/Class');
const Exam = require('../models/Exam');
const User = require('../models/User');
const { checkJwt, extractUser, requireLecturer } = require('../middleware/auth');

// GET /api/lecturer-management/courses - Get lecturer's courses for management
router.get('/courses', checkJwt, extractUser, requireLecturer, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const lecturerId = user._id;
    
    // Get lecturer's courses
    const courses = await Course.find({ lecturer_id: lecturerId, is_active: true })
      .populate('students', 'name email full_name')
      .populate('homework')
      .populate('classes')
      .populate('exams');
    
    const coursesData = courses.map(course => ({
      _id: course._id,
      course_name: course.course_name,
      course_code: course.course_code,
      description: course.description,
      credits: course.credits,
      semester: course.semester,
      year: course.year,
      student_count: course.students.length,
      homework_count: course.homework ? course.homework.length : 0,
      class_count: course.classes ? course.classes.length : 0,
      exam_count: course.exams ? course.exams.length : 0
    }));
    
    res.json(coursesData);
  } catch (error) {
    console.error('Error fetching lecturer courses:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// POST /api/lecturer-management/homework - Add new homework
router.post('/homework', checkJwt, extractUser, requireLecturer, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const { course_id, title, description, due_date } = req.body;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const lecturerId = user._id;
    
    // Verify the course belongs to this lecturer
    const course = await Course.findOne({ _id: course_id, lecturer_id: lecturerId });
    if (!course) {
      return res.status(403).json({ error: 'Course not found or access denied' });
    }
    
    // Create new homework
    const homework = new Homework({
      course_id: course_id,
      title: title,
      description: description,
      due_date: new Date(due_date),
      assigned_date: new Date(),
      is_active: true
    });
    
    await homework.save();
    
    // Populate course info for response
    await homework.populate('course_id', 'course_name course_code');
    
    res.status(201).json({
      message: 'Homework created successfully',
      homework: homework
    });
  } catch (error) {
    console.error('Error creating homework:', error);
    res.status(500).json({ error: 'Failed to create homework' });
  }
});

// PUT /api/lecturer-management/homework/:id - Update homework
router.put('/homework/:id', checkJwt, extractUser, requireLecturer, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const homeworkId = req.params.id;
    const { title, description, due_date, is_active } = req.body;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const lecturerId = user._id;
    
    // Find homework and verify ownership
    const homework = await Homework.findById(homeworkId).populate('course_id');
    if (!homework) {
      return res.status(404).json({ error: 'Homework not found' });
    }
    
    // Verify the course belongs to this lecturer
    const course = await Course.findOne({ _id: homework.course_id._id, lecturer_id: lecturerId });
    if (!course) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Update homework
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (due_date !== undefined) updateData.due_date = new Date(due_date);
    if (is_active !== undefined) updateData.is_active = is_active;
    
    const updatedHomework = await Homework.findByIdAndUpdate(
      homeworkId,
      updateData,
      { new: true }
    ).populate('course_id', 'course_name course_code');
    
    res.json({
      message: 'Homework updated successfully',
      homework: updatedHomework
    });
  } catch (error) {
    console.error('Error updating homework:', error);
    res.status(500).json({ error: 'Failed to update homework' });
  }
});

// DELETE /api/lecturer-management/homework/:id - Delete homework
router.delete('/homework/:id', checkJwt, extractUser, requireLecturer, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const homeworkId = req.params.id;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const lecturerId = user._id;
    
    // Find homework and verify ownership
    const homework = await Homework.findById(homeworkId).populate('course_id');
    if (!homework) {
      return res.status(404).json({ error: 'Homework not found' });
    }
    
    // Verify the course belongs to this lecturer
    const course = await Course.findOne({ _id: homework.course_id._id, lecturer_id: lecturerId });
    if (!course) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Soft delete by setting is_active to false
    await Homework.findByIdAndUpdate(homeworkId, { is_active: false });
    
    res.json({ message: 'Homework deleted successfully' });
  } catch (error) {
    console.error('Error deleting homework:', error);
    res.status(500).json({ error: 'Failed to delete homework' });
  }
});

// POST /api/lecturer-management/classes - Add new class
router.post('/classes', checkJwt, extractUser, requireLecturer, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const { course_id, class_date, room, topic, description, duration_minutes } = req.body;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const lecturerId = user._id;
    
    // Verify the course belongs to this lecturer
    const course = await Course.findOne({ _id: course_id, lecturer_id: lecturerId });
    if (!course) {
      return res.status(403).json({ error: 'Course not found or access denied' });
    }
    
    // Create new class
    const classSession = new Class({
      course_id: course_id,
      class_date: new Date(class_date),
      room: room,
      topic: topic,
      description: description,
      duration_minutes: duration_minutes || 60,
      is_active: true
    });
    
    await classSession.save();
    
    // Populate course info for response
    await classSession.populate('course_id', 'course_name course_code');
    
    res.status(201).json({
      message: 'Class created successfully',
      class: classSession
    });
  } catch (error) {
    console.error('Error creating class:', error);
    res.status(500).json({ error: 'Failed to create class' });
  }
});

// PUT /api/lecturer-management/classes/:id - Update class
router.put('/classes/:id', checkJwt, extractUser, requireLecturer, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const classId = req.params.id;
    const { class_date, room, topic, description, duration_minutes, is_active } = req.body;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const lecturerId = user._id;
    
    // Find class and verify ownership
    const classSession = await Class.findById(classId).populate('course_id');
    if (!classSession) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    // Verify the course belongs to this lecturer
    const course = await Course.findOne({ _id: classSession.course_id._id, lecturer_id: lecturerId });
    if (!course) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Update class
    const updateData = {};
    if (class_date !== undefined) updateData.class_date = new Date(class_date);
    if (room !== undefined) updateData.room = room;
    if (topic !== undefined) updateData.topic = topic;
    if (description !== undefined) updateData.description = description;
    if (duration_minutes !== undefined) updateData.duration_minutes = duration_minutes;
    if (is_active !== undefined) updateData.is_active = is_active;
    
    const updatedClass = await Class.findByIdAndUpdate(
      classId,
      updateData,
      { new: true }
    ).populate('course_id', 'course_name course_code');
    
    res.json({
      message: 'Class updated successfully',
      class: updatedClass
    });
  } catch (error) {
    console.error('Error updating class:', error);
    res.status(500).json({ error: 'Failed to update class' });
  }
});

// DELETE /api/lecturer-management/classes/:id - Delete class
router.delete('/classes/:id', checkJwt, extractUser, requireLecturer, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const classId = req.params.id;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const lecturerId = user._id;
    
    // Find class and verify ownership
    const classSession = await Class.findById(classId).populate('course_id');
    if (!classSession) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    // Verify the course belongs to this lecturer
    const course = await Course.findOne({ _id: classSession.course_id._id, lecturer_id: lecturerId });
    if (!course) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Soft delete by setting is_active to false
    await Class.findByIdAndUpdate(classId, { is_active: false });
    
    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    console.error('Error deleting class:', error);
    res.status(500).json({ error: 'Failed to delete class' });
  }
});

// POST /api/lecturer-management/exams - Add new exam
router.post('/exams', checkJwt, extractUser, requireLecturer, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const { course_id, exam_title, due_date, points_possible, description, exam_type } = req.body;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const lecturerId = user._id;
    
    // Verify the course belongs to this lecturer
    const course = await Course.findOne({ _id: course_id, lecturer_id: lecturerId });
    if (!course) {
      return res.status(403).json({ error: 'Course not found or access denied' });
    }
    
    // Create new exam
    const exam = new Exam({
      course_id: course_id,
      exam_title: exam_title,
      due_date: new Date(due_date),
      points_possible: points_possible || 100,
      description: description,
      exam_type: exam_type || 'midterm',
      is_active: true
    });
    
    await exam.save();
    
    // Populate course info for response
    await exam.populate('course_id', 'course_name course_code');
    
    res.status(201).json({
      message: 'Exam created successfully',
      exam: exam
    });
  } catch (error) {
    console.error('Error creating exam:', error);
    res.status(500).json({ error: 'Failed to create exam' });
  }
});

// PUT /api/lecturer-management/exams/:id - Update exam
router.put('/exams/:id', checkJwt, extractUser, requireLecturer, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const examId = req.params.id;
    const { exam_title, due_date, points_possible, description, exam_type, is_active } = req.body;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const lecturerId = user._id;
    
    // Find exam and verify ownership
    const exam = await Exam.findById(examId).populate('course_id');
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }
    
    // Verify the course belongs to this lecturer
    const course = await Course.findOne({ _id: exam.course_id._id, lecturer_id: lecturerId });
    if (!course) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Update exam
    const updateData = {};
    if (exam_title !== undefined) updateData.exam_title = exam_title;
    if (due_date !== undefined) updateData.due_date = new Date(due_date);
    if (points_possible !== undefined) updateData.points_possible = points_possible;
    if (description !== undefined) updateData.description = description;
    if (exam_type !== undefined) updateData.exam_type = exam_type;
    if (is_active !== undefined) updateData.is_active = is_active;
    
    const updatedExam = await Exam.findByIdAndUpdate(
      examId,
      updateData,
      { new: true }
    ).populate('course_id', 'course_name course_code');
    
    res.json({
      message: 'Exam updated successfully',
      exam: updatedExam
    });
  } catch (error) {
    console.error('Error updating exam:', error);
    res.status(500).json({ error: 'Failed to update exam' });
  }
});

// DELETE /api/lecturer-management/exams/:id - Delete exam
router.delete('/exams/:id', checkJwt, extractUser, requireLecturer, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const examId = req.params.id;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const lecturerId = user._id;
    
    // Find exam and verify ownership
    const exam = await Exam.findById(examId).populate('course_id');
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }
    
    // Verify the course belongs to this lecturer
    const course = await Course.findOne({ _id: exam.course_id._id, lecturer_id: lecturerId });
    if (!course) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Soft delete by setting is_active to false
    await Exam.findByIdAndUpdate(examId, { is_active: false });
    
    res.json({ message: 'Exam deleted successfully' });
  } catch (error) {
    console.error('Error deleting exam:', error);
    res.status(500).json({ error: 'Failed to delete exam' });
  }
});

module.exports = router;
