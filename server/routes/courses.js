const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const User = require('../models/User');
const { checkJwt, extractUser, requireAdminOrReadUsers, requireLecturer } = require('../middleware/auth');

// GET /api/courses - Get all courses (Admin only or with filters)
router.get('/', checkJwt, extractUser, async (req, res) => {
  try {
    const { semester, year, lecturer_id, student_id } = req.query;
    const userRole = req.userInfo.roles[0];
    
    let filter = { is_active: true };
    
    // Apply basic filters
    if (semester) filter.semester = semester;
    if (year) filter.year = parseInt(year);
    
    // Apply role-based filtering and security
    if (userRole === 'lecturer') {
      // Lecturers can see their own courses or be filtered by lecturer_id (for admins)
      if (lecturer_id) {
        filter.lecturer_id = lecturer_id;
      } else {
        const lecturer = await User.findOne({ auth0_id: req.auth.sub });
        if (lecturer) filter.lecturer_id = lecturer._id;
      }
    } else if (userRole === 'student') {
      // Students can see courses they're enrolled in, or all courses (for enrollment purposes)
      if (student_id) {
        // Security check: students can only query their own courses
        const currentStudent = await User.findOne({ auth0_id: req.auth.sub });
        if (currentStudent && currentStudent._id.toString() === student_id) {
          filter.students = student_id;
        } else {
          return res.status(403).json({ error: 'Access denied' });
        }
      }
      // If no student_id specified, return all courses (for browsing/enrollment)
    } else if (userRole === 'admin') {
      // Admins can filter by any lecturer_id or student_id
      if (lecturer_id) filter.lecturer_id = lecturer_id;
      if (student_id) filter.students = student_id;
    }
    
    const courses = await Course.find(filter)
      .populate('lecturer_id', 'name email full_name')
      .populate('students', 'name email full_name')
      .populate('homework')
      .populate('classes')
      .populate('exams')
      .sort({ course_name: 1 });
    
    res.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// GET /api/courses/:id - Get specific course with all relationships
router.get('/:id', checkJwt, extractUser, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('lecturer_id', 'name email full_name')
      .populate('students', 'name email full_name role')
      .populate({
        path: 'homework',
        populate: {
          path: 'grades',
          populate: {
            path: 'student_id',
            select: 'name email'
          }
        }
      })
      .populate({
        path: 'classes',
        populate: {
          path: 'files',
          populate: {
            path: 'uploaded_by',
            select: 'name email'
          }
        }
      })
      .populate({
        path: 'exams',
        populate: {
          path: 'grades',
          populate: {
            path: 'student_id',
            select: 'name email'
          }
        }
      });
    
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    // Check if user has access to this course
    const userRole = req.userInfo.roles[0];
    const userId = req.userInfo.auth0_id;
    
    const user = await User.findOne({ auth0_id: req.auth.sub });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (userRole === 'lecturer' && !course.lecturer_id._id.equals(user._id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (userRole === 'student' && !course.students.some(student => student._id.equals(user._id))) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(course);
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

// POST /api/courses - Create new course (Lecturer/Admin only)
router.post('/', checkJwt, extractUser, requireLecturer, async (req, res) => {
  try {
    const {
      course_name,
      course_code,
      description,
      syllabus,
      credits,
      semester,
      year,
      students = []
    } = req.body;
    
    // Find lecturer user
    const lecturer = await User.findOne({ auth0_id: req.auth.sub });
    if (!lecturer) {
      return res.status(404).json({ error: 'Lecturer not found' });
    }
    
    const course = new Course({
      course_name,
      course_code,
      description,
      syllabus,
      credits,
      semester,
      year,
      lecturer_id: lecturer._id,
      students: students
    });
    
    await course.save();
    await course.populate('lecturer_id', 'name email full_name');
    await course.populate('students', 'name email full_name');
    
    res.status(201).json(course);
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// PUT /api/courses/:id - Update course (Lecturer/Admin only)
router.put('/:id', checkJwt, extractUser, requireLecturer, async (req, res) => {
  try {
    const courseId = req.params.id;
    const {
      course_name,
      course_code,
      description,
      syllabus,
      credits,
      semester,
      year,
      students,
      partner_settings
    } = req.body;
    
    // Find lecturer user
    const lecturer = await User.findOne({ auth0_id: req.auth.sub });
    if (!lecturer) {
      return res.status(404).json({ error: 'Lecturer not found' });
    }
    
    // Find course and verify ownership
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    // Check if lecturer owns this course (unless admin)
    if (req.userInfo.roles[0] !== 'admin' && !course.lecturer_id.equals(lecturer._id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Update course
    const updateData = {};
    if (course_name !== undefined) updateData.course_name = course_name;
    if (course_code !== undefined) updateData.course_code = course_code;
    if (description !== undefined) updateData.description = description;
    if (syllabus !== undefined) updateData.syllabus = syllabus;
    if (credits !== undefined) updateData.credits = credits;
    if (semester !== undefined) updateData.semester = semester;
    if (year !== undefined) updateData.year = year;
    if (students !== undefined) updateData.students = students;
    if (partner_settings !== undefined) updateData.partner_settings = partner_settings;
    
    const updatedCourse = await Course.findByIdAndUpdate(
      courseId,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('lecturer_id', 'name email full_name')
    .populate('students', 'name email full_name');
    
    res.json(updatedCourse);
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ error: 'Failed to update course' });
  }
});

// PUT /api/courses/:id/partner-settings - Update partner settings (Lecturer/Admin only)
router.put('/:id/partner-settings', checkJwt, extractUser, requireLecturer, async (req, res) => {
  try {
    const courseId = req.params.id;
    const { enabled, max_partners_per_student } = req.body;
    
    // Find lecturer user
    const lecturer = await User.findOne({ auth0_id: req.auth.sub });
    if (!lecturer) {
      return res.status(404).json({ error: 'Lecturer not found' });
    }
    
    // Find course and verify ownership
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    // Check if lecturer owns this course (unless admin)
    if (req.userInfo.roles[0] !== 'admin' && !course.lecturer_id.equals(lecturer._id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Update partner settings
    const partnerSettings = {
      enabled: enabled !== undefined ? enabled : course.partner_settings?.enabled !== false,
      max_partners_per_student: max_partners_per_student !== undefined ? max_partners_per_student : (course.partner_settings?.max_partners_per_student || 1)
    };
    
    const updatedCourse = await Course.findByIdAndUpdate(
      courseId,
      { partner_settings: partnerSettings },
      { new: true, runValidators: true }
    )
    .populate('lecturer_id', 'name email full_name');
    
    res.json({
      message: 'Partner settings updated successfully',
      course: {
        _id: updatedCourse._id,
        course_name: updatedCourse.course_name,
        course_code: updatedCourse.course_code,
        partner_settings: updatedCourse.partner_settings
      }
    });
  } catch (error) {
    console.error('Error updating partner settings:', error);
    res.status(500).json({ error: 'Failed to update partner settings' });
  }
});


// POST /api/courses/:id/students - Add student to course (Students can enroll themselves, Lecturers/Admins can add any student)
router.post('/:id/students', checkJwt, extractUser, async (req, res) => {
  try {
    const { student_id } = req.body;
    const userRole = req.userInfo.roles[0];
    const currentUser = await User.findOne({ auth0_id: req.auth.sub });
    
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Security check: students can only enroll themselves
    if (userRole === 'student' && currentUser._id.toString() !== student_id) {
      return res.status(403).json({ error: 'Students can only enroll themselves' });
    }
    
    // Lecturers and admins can add any student, students can only add themselves
    if (userRole !== 'lecturer' && userRole !== 'admin' && userRole !== 'student') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    const student = await User.findById(student_id);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    // Check if student is already enrolled
    if (course.students.includes(student_id)) {
      return res.status(400).json({ error: 'Student is already enrolled in this course' });
    }
    
    await course.addStudent(student_id);
    await course.populate('students', 'name email full_name');
    
    res.json({ message: 'Student added to course', students: course.students });
  } catch (error) {
    console.error('Error adding student to course:', error);
    res.status(500).json({ error: 'Failed to add student to course' });
  }
});

// DELETE /api/courses/:id/students/:studentId - Remove student from course (Students can drop themselves, Lecturers/Admins can remove any student)
router.delete('/:id/students/:studentId', checkJwt, extractUser, async (req, res) => {
  try {
    const userRole = req.userInfo.roles[0];
    const currentUser = await User.findOne({ auth0_id: req.auth.sub });
    
    console.log('Drop course request:', {
      courseId: req.params.id,
      studentId: req.params.studentId,
      currentUserId: currentUser?._id?.toString(),
      userRole
    });
    
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Security check: students can only drop themselves
    if (userRole === 'student' && currentUser._id.toString() !== req.params.studentId) {
      console.log('Permission denied: student trying to drop another student');
      return res.status(403).json({ error: 'Students can only drop themselves from courses' });
    }
    
    // Lecturers and admins can remove any student, students can only remove themselves
    if (userRole !== 'lecturer' && userRole !== 'admin' && userRole !== 'student') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    // Check if student is actually enrolled
    const isEnrolled = course.students.some(studentId => studentId.toString() === req.params.studentId);
    if (!isEnrolled) {
      return res.status(400).json({ error: 'Student is not enrolled in this course' });
    }
    
    await course.removeStudent(req.params.studentId);
    await course.populate('students', 'name email full_name');
    
    console.log('Successfully removed student from course');
    res.json({ message: 'Student removed from course', students: course.students });
  } catch (error) {
    console.error('Error removing student from course:', error);
    res.status(500).json({ error: 'Failed to remove student from course' });
  }
});

// GET /api/courses/lecturer/:lecturerId - Get courses by lecturer
router.get('/lecturer/:lecturerId', checkJwt, extractUser, async (req, res) => {
  try {
    const courses = await Course.findByLecturer(req.params.lecturerId)
      .populate('students', 'name email full_name')
      .populate('homework')
      .populate('classes')
      .populate('exams');
    
    res.json(courses);
  } catch (error) {
    console.error('Error fetching lecturer courses:', error);
    res.status(500).json({ error: 'Failed to fetch lecturer courses' });
  }
});

// GET /api/courses/student/:studentId - Get courses by student
router.get('/student/:studentId', checkJwt, extractUser, async (req, res) => {
  try {
    const courses = await Course.findByStudent(req.params.studentId)
      .populate('lecturer_id', 'name email full_name')
      .populate('homework')
      .populate('classes')
      .populate('exams');
    
    res.json(courses);
  } catch (error) {
    console.error('Error fetching student courses:', error);
    res.status(500).json({ error: 'Failed to fetch student courses' });
  }
});

// DELETE /api/courses/:id - Delete course (Lecturer can delete own courses, Admin can delete any)
router.delete('/:id', checkJwt, extractUser, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    // Get current user from database
    const currentUser = await User.findOne({ auth0_id: req.auth.sub });
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check permissions: Admin can delete any course, Lecturer can only delete their own courses
    const userRole = req.userInfo.roles[0];
    if (userRole === 'admin') {
      // Admin can delete any course
    } else if (userRole === 'lecturer') {
      // Lecturer can only delete their own courses
      if (!course.lecturer_id.equals(currentUser._id)) {
        return res.status(403).json({ error: 'You can only delete your own courses' });
      }
    } else {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    // Cascade delete: Delete all related data for this course
    const Homework = require('../models/Homework');
    const StudentHomework = require('../models/StudentHomework');
    const Partner = require('../models/Partner');
    const Exam = require('../models/Exam');
    const Class = require('../models/Class');
    const Grade = require('../models/Grade');
    
    const courseId = course._id;
    
    console.log(`Deleting course: ${course.course_name} (${course.course_code})`);
    
    // Find all homework IDs (both traditional and student homework) for this course
    const traditionalHomework = await Homework.find({ course_id: courseId }).select('_id');
    const studentHomework = await StudentHomework.find({ course_id: courseId }).select('_id');
    const exams = await Exam.find({ course_id: courseId }).select('_id');
    
    const allHomeworkIds = [
      ...traditionalHomework.map(hw => hw._id),
      ...studentHomework.map(hw => hw._id)
    ];
    
    const examIds = exams.map(exam => exam._id);
    
    console.log(`Found ${traditionalHomework.length} traditional homework, ${studentHomework.length} student homework, and ${exams.length} exams to delete`);
    
    // Delete all related data for this course
    await Promise.all([
      Homework.deleteMany({ course_id: courseId }),
      Exam.deleteMany({ course_id: courseId }),
      Class.deleteMany({ course_id: courseId }),
      StudentHomework.deleteMany({ course_id: courseId }),
      Partner.deleteMany({ homework_id: { $in: allHomeworkIds } }),
      Grade.deleteMany({ 
        $or: [
          { homework_id: { $in: allHomeworkIds } },
          { exam_id: { $in: examIds } }
        ]
      })
    ]);
    
    console.log(`Deleted all related data: ${allHomeworkIds.length} homework assignments, partnerships, and grades`);
    
    // Delete the course itself
    await Course.findByIdAndDelete(courseId);
    
    console.log(`Successfully deleted course: ${course.course_name}`);
    
    res.json({ 
      message: 'Course and all related data deleted successfully',
      deleted: {
        course: course.course_name,
        homework: allHomeworkIds.length,
        exams: examIds.length
      }
    });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

module.exports = router;
