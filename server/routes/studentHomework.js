const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const StudentHomework = require('../models/StudentHomework');
const Homework = require('../models/Homework');
const Course = require('../models/Course');
const User = require('../models/User');
const { checkJwt, extractUser, requireStudent, requireLecturer } = require('../middleware/auth');
const gradeExtractionService = require('../services/gradeExtraction');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/homework');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// GET /api/student-homework - Get all homework for student
router.get('/', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }

    const studentId = user._id;
    
    // Get courses where student is enrolled
    const courses = await Course.find({
      students: studentId,
      is_active: true
    }).select('_id course_name course_code');

    const courseIds = courses.map(course => course._id);

    console.log(`Student ${studentId} enrolled in courses:`, courseIds);

    // Get homework from BOTH tables for student's courses
    // 1. StudentHomework table
    const studentHomework = await StudentHomework.find({
      course_id: { $in: courseIds },
      $or: [
        // Student's own homework
        { uploaded_by: studentId },
        // Lecturer-created homework
        { uploader_role: 'lecturer' },
        // Other students' homework that has been verified
        { 
          uploader_role: 'student',
          uploaded_by: { $ne: studentId },
          deadline_verification_status: { $in: ['verified'] }
        }
      ]
    })
    .populate('course_id', 'course_name course_code')
    .populate('uploaded_by', 'name email')
    .populate('deadline_verified_by', 'name email')
    .populate('grade_verified_by', 'name email')
    .sort({ claimed_deadline: 1 });

    // 2. Traditional Homework table (lecturer-created homework)
    const traditionalHomework = await Homework.find({
      course_id: { $in: courseIds },
      is_active: true
    })
    .populate('course_id', 'course_name course_code')
    .sort({ due_date: 1 });

    // Debug: Log traditional homework data
    console.log('Traditional homework raw data:', traditionalHomework.map(hw => ({
      id: hw._id,
      title: hw.title,
      course_id: hw.course_id,
      course_name: hw.course_id?.course_name,
      course_code: hw.course_id?.course_code
    })));
    
    // Convert traditional homework to match StudentHomework format
    const convertedTraditionalHomework = traditionalHomework.map(hw => ({
      _id: hw._id,
      title: hw.title,
      description: hw.description,
      course_id: hw.course_id._id,
      course: {
        _id: hw.course_id._id,
        name: hw.course_id?.course_name || 'Unknown Course',
        code: hw.course_id?.course_code || 'UNKNOWN'
      },
      claimed_deadline: hw.due_date,
      assigned_date: hw.assigned_date,
      points_possible: hw.points_possible,
      uploader_role: 'lecturer',
      uploaded_by: {
        _id: 'lecturer',
        name: 'Lecturer',
        email: 'lecturer@university.edu'
      },
      completion_status: 'not_started', // Default status for traditional homework
      deadline_verification_status: 'verified', // Traditional homework is considered verified
      grade_verification_status: 'unverified',
      claimed_grade: null,
      tags: [],
      moodle_url: '',
      created_at: hw.assigned_date,
      updated_at: hw.assigned_date
    }));
    
    // Debug: Log converted traditional homework data
    console.log('Converted traditional homework data:', convertedTraditionalHomework.map(hw => ({
      id: hw._id,
      title: hw.title,
      course: hw.course,
      course_name: hw.course?.name,
      course_code: hw.course?.code
    })));

    // Combine both types
    const homework = [...studentHomework, ...convertedTraditionalHomework];

    console.log(`Found ${homework.length} homework items for student ${studentId}`);
    console.log('Homework breakdown:', {
      student_homework_count: studentHomework.length,
      traditional_homework_count: traditionalHomework.length,
      total_homework_count: homework.length,
      own_homework: homework.filter(hw => hw.uploaded_by._id.toString() === studentId.toString()).length,
      lecturer_homework: homework.filter(hw => hw.uploader_role === 'lecturer').length,
      verified_student_homework: homework.filter(hw => hw.uploader_role === 'student' && hw.uploaded_by._id.toString() !== studentId.toString() && hw.deadline_verification_status === 'verified').length
    });

    res.json({
      homework: homework.map(hw => ({
        _id: hw._id,
        title: hw.title,
        description: hw.description,
        course: {
          _id: hw.course_id._id,
          name: hw.course_id.course_name || hw.course?.name || 'Unknown Course',
          code: hw.course_id.course_code || hw.course?.code || 'UNKNOWN'
        },
        uploaded_by: {
          _id: hw.uploaded_by._id,
          name: hw.uploaded_by.name,
          email: hw.uploaded_by.email,
          role: hw.uploader_role
        },
        uploader_role: hw.uploader_role,
        claimed_deadline: hw.claimed_deadline,
        verified_deadline: hw.verified_deadline,
        deadline_verification_status: hw.deadline_verification_status,
        claimed_grade: hw.claimed_grade,
        verified_grade: hw.verified_grade,
        grade_verification_status: hw.grade_verification_status,
        completion_status: hw.completion_status,
        priority: hw.priority,
        tags: hw.tags,
        days_until_deadline: hw.days_until_deadline,
        is_overdue: hw.is_overdue,
        moodle_assignment_id: hw.moodle_assignment_id,
        moodle_url: hw.moodle_url,
        createdAt: hw.createdAt,
        completed_at: hw.completed_at
      })),
      courses: courses
    });
  } catch (error) {
    console.error('Error fetching student homework:', error);
    res.status(500).json({ error: 'Failed to fetch homework' });
  }
});

// POST /api/student-homework - Create new homework
router.post('/', checkJwt, extractUser, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }

    const {
      title,
      description,
      course_id,
      claimed_deadline,
      priority,
      tags,
      moodle_assignment_id,
      moodle_url
    } = req.body;

    // Determine user role
    const userRole = user.role || 'student';

    // Validate course access
    const course = await Course.findById(course_id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if user has access to course
    if (userRole === 'student' && !course.students.includes(user._id)) {
      return res.status(403).json({ error: 'You are not enrolled in this course' });
    }

    if (userRole === 'lecturer' && !course.lecturer_id.equals(user._id)) {
      return res.status(403).json({ error: 'You are not the lecturer for this course' });
    }

    // Create homework
    const homework = new StudentHomework({
      title,
      description,
      course_id,
      uploaded_by: user._id,
      uploader_role: userRole,
      claimed_deadline: new Date(claimed_deadline),
      priority: priority || 'medium',
      tags: tags || [],
      moodle_assignment_id,
      moodle_url,
      deadline_verification_status: 'pending_review' // Set to pending review for lecturer verification
    });

    await homework.save();
    await homework.populate('course_id', 'course_name course_code');
    await homework.populate('uploaded_by', 'name email');

    res.status(201).json({
      message: 'Homework created successfully',
      homework: {
        _id: homework._id,
        title: homework.title,
        description: homework.description,
        course: {
          _id: homework.course_id._id,
          name: homework.course_id.course_name,
          code: homework.course_id.course_code
        },
        uploaded_by: {
          _id: homework.uploaded_by._id,
          name: homework.uploaded_by.name,
          email: homework.uploaded_by.email,
          role: homework.uploader_role
        },
        claimed_deadline: homework.claimed_deadline,
        priority: homework.priority,
        tags: homework.tags,
        deadline_verification_status: homework.deadline_verification_status,
        createdAt: homework.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating homework:', error);
    res.status(500).json({ error: 'Failed to create homework' });
  }
});

// PUT /api/student-homework/:id/complete - Mark homework as completed
router.put('/:id/complete', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }

    const homeworkId = req.params.id;
    const { claimed_grade } = req.body;

    // First try to find in StudentHomework table
    let homework = await StudentHomework.findById(homeworkId);
    
    if (!homework) {
      // If not found in StudentHomework, check if it's traditional homework
      const traditionalHomework = await Homework.findById(homeworkId);
      if (!traditionalHomework) {
        return res.status(404).json({ error: 'Homework not found' });
      }

      // Check if student is enrolled in the course
      const course = await Course.findById(traditionalHomework.course_id);
      if (!course.students.includes(user._id)) {
        return res.status(403).json({ error: 'You are not enrolled in this course' });
      }

      // Create a StudentHomework entry for traditional homework completion
      homework = new StudentHomework({
        title: traditionalHomework.title,
        description: traditionalHomework.description,
        course_id: traditionalHomework.course_id,
        claimed_deadline: traditionalHomework.due_date,
        assigned_date: traditionalHomework.assigned_date,
        points_possible: traditionalHomework.points_possible,
        uploader_role: 'lecturer',
        uploaded_by: user._id, // Student completing the homework
        completion_status: 'completed',
        completed_at: new Date(),
        claimed_grade: claimed_grade,
        deadline_verification_status: 'verified', // Traditional homework is considered verified
        grade_verification_status: 'unverified',
        tags: [],
        moodle_url: '',
        created_at: new Date(),
        updated_at: new Date()
      });

      await homework.save();
      await homework.populate('course_id', 'course_name course_code');
      await homework.populate('uploaded_by', 'name email');

      return res.json({
        message: 'Traditional homework marked as completed',
        homework: {
          _id: homework._id,
          title: homework.title,
          completion_status: homework.completion_status,
          completed_at: homework.completed_at,
          claimed_grade: homework.claimed_grade,
          grade_verification_status: homework.grade_verification_status
        }
      });
    }

    // Handle StudentHomework completion
    // Check if student is enrolled in the course
    const course = await Course.findById(homework.course_id);
    if (!course.students.includes(user._id)) {
      return res.status(403).json({ error: 'You are not enrolled in this course' });
    }

    // Update homework
    homework.completion_status = 'completed';
    homework.completed_at = new Date();
    homework.claimed_grade = claimed_grade;
    homework.grade_verification_status = 'unverified';

    await homework.save();

    res.json({
      message: 'Homework marked as completed',
      homework: {
        _id: homework._id,
        title: homework.title,
        completion_status: homework.completion_status,
        completed_at: homework.completed_at,
        claimed_grade: homework.claimed_grade,
        grade_verification_status: homework.grade_verification_status
      }
    });
  } catch (error) {
    console.error('Error completing homework:', error);
    res.status(500).json({ error: 'Failed to complete homework' });
  }
});

// GET /api/student-homework/lecturer/all - Get all homework for lecturer's courses
router.get('/lecturer/all', checkJwt, extractUser, requireLecturer, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }

    // Get courses taught by lecturer
    const courses = await Course.find({
      lecturer_id: user._id,
      is_active: true
    }).select('_id course_name course_code');

    const courseIds = courses.map(course => course._id);

    // Get all homework for these courses from BOTH tables
    console.log(`Lecturer ${user._id} teaching courses:`, courseIds);
    
    // Query StudentHomework table
    const studentHomework = await StudentHomework.find({
      course_id: { $in: courseIds }
    })
    .populate('course_id', 'course_name course_code')
    .populate('uploaded_by', 'name email')
    .sort({ createdAt: -1 });
    
    // Query traditional Homework table
    const traditionalHomework = await Homework.find({
      course_id: { $in: courseIds }
    })
    .populate('course_id', 'course_name course_code')
    .sort({ createdAt: -1 });
    
    console.log(`Found ${studentHomework.length} student homework items`);
    console.log(`Found ${traditionalHomework.length} traditional homework items`);
    
    // Convert traditional homework to match StudentHomework format
    const convertedTraditionalHomework = traditionalHomework.map(hw => ({
      _id: hw._id,
      title: hw.title,
      description: hw.description,
      course_id: hw.course_id._id,
      course: {
        _id: hw.course_id._id,
        name: hw.course_id.course_name,
        code: hw.course_id.course_code
      },
      uploaded_by: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: 'lecturer'
      },
      uploader_role: 'lecturer',
      claimed_deadline: hw.due_date,
      verified_deadline: hw.due_date,
      deadline_verification_status: 'verified', // Traditional homework is considered verified
      deadline_verification_notes: '',
      completion_status: 'not_started',
      completed_at: null,
      claimed_grade: null,
      verified_grade: null,
      grade_verification_status: 'unverified',
      grade_verification_notes: '',
      priority: 'medium',
      tags: [],
      moodle_assignment_id: '',
      moodle_url: '',
      createdAt: hw.createdAt,
      updatedAt: hw.updatedAt
    }));
    
    // Combine both types of homework
    const allHomework = [...studentHomework, ...convertedTraditionalHomework];
    
    console.log(`Total combined homework: ${allHomework.length} items`);
    console.log('Homework breakdown:', {
      lecturer_created: allHomework.filter(hw => hw.uploader_role === 'lecturer').length,
      student_created: allHomework.filter(hw => hw.uploader_role === 'student').length,
      verified: allHomework.filter(hw => hw.deadline_verification_status === 'verified').length,
      unverified: allHomework.filter(hw => hw.deadline_verification_status !== 'verified').length
    });
    
    allHomework.forEach((hw, index) => {
      console.log(`Homework ${index + 1}:`, {
        id: hw._id,
        title: hw.title,
        uploader_role: hw.uploader_role,
        uploaded_by: hw.uploaded_by.name,
        course_id: hw.course_id._id,
        course: hw.course_id.course_name,
        deadline_status: hw.deadline_verification_status,
        completion_status: hw.completion_status,
        course_match: courseIds.includes(hw.course_id._id.toString())
      });
    });

    res.json({
      homework: allHomework.map(hw => ({
        _id: hw._id,
        title: hw.title,
        description: hw.description,
        course_id: hw.course_id._id,
        course: {
          _id: hw.course_id._id,
          name: hw.course_id.course_name,
          code: hw.course_id.course_code
        },
        uploaded_by: {
          _id: hw.uploaded_by._id,
          name: hw.uploaded_by.name,
          email: hw.uploaded_by.email,
          role: hw.uploader_role
        },
        uploader_role: hw.uploader_role,
        claimed_deadline: hw.claimed_deadline,
        verified_deadline: hw.verified_deadline,
        deadline_verification_status: hw.deadline_verification_status,
        deadline_verification_notes: hw.deadline_verification_notes,
        completion_status: hw.completion_status,
        completed_at: hw.completed_at,
        claimed_grade: hw.claimed_grade,
        verified_grade: hw.verified_grade,
        grade_verification_status: hw.grade_verification_status,
        grade_verification_notes: hw.grade_verification_notes,
        priority: hw.priority,
        tags: hw.tags,
        moodle_assignment_id: hw.moodle_assignment_id,
        moodle_url: hw.moodle_url,
        createdAt: hw.createdAt,
        updatedAt: hw.updatedAt
      }))
    });
  } catch (error) {
    console.error('Error fetching lecturer homework:', error);
    res.status(500).json({ error: 'Failed to fetch homework' });
  }
});

// GET /api/student-homework/lecturer/verifications - Get pending verifications for lecturer
router.get('/lecturer/verifications', checkJwt, extractUser, requireLecturer, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }

    // Get courses taught by lecturer
    const courses = await Course.find({
      lecturer_id: user._id,
      is_active: true
    }).select('_id course_name course_code');

    const courseIds = courses.map(course => course._id);

    // Debug: Get all homework for this lecturer first
    const allHomework = await StudentHomework.find({
      course_id: { $in: courseIds }
    })
    .populate('course_id', 'course_name course_code')
    .populate('uploaded_by', 'name email')
    .sort({ createdAt: -1 });

    console.log('=== VERIFICATION DEBUG ===');
    console.log('Lecturer courses:', courseIds);
    console.log('Total homework found:', allHomework.length);
    console.log('All homework statuses:', allHomework.map(hw => ({
      id: hw._id,
      title: hw.title,
      course: hw.course_id?.course_name,
      deadline_status: hw.deadline_verification_status,
      grade_status: hw.grade_verification_status,
      completion_status: hw.completion_status,
      uploader_role: hw.uploader_role
    })));
    console.log('========================');

    // Get pending verifications
    const pendingVerifications = await StudentHomework.find({
      course_id: { $in: courseIds },
      $or: [
        { deadline_verification_status: { $in: ['pending_review', 'unverified'] } },
        { grade_verification_status: { $in: ['pending_review', 'unverified'] } }
      ]
    })
    .populate('course_id', 'course_name course_code')
    .populate('uploaded_by', 'name email')
    .sort({ createdAt: -1 });

    console.log('Pending verifications found:', pendingVerifications.length);

    res.json({
      verifications: pendingVerifications.map(verification => ({
        _id: verification._id,
        title: verification.title,
        course: {
          _id: verification.course_id._id,
          name: verification.course_id.course_name,
          code: verification.course_id.course_code
        },
        uploaded_by: {
          _id: verification.uploaded_by._id,
          name: verification.uploaded_by.name,
          email: verification.uploaded_by.email,
          role: verification.uploader_role
        },
        claimed_deadline: verification.claimed_deadline,
        deadline_verification_status: verification.deadline_verification_status,
        claimed_grade: verification.claimed_grade,
        grade_verification_status: verification.grade_verification_status,
        extracted_grade_data: verification.extracted_grade_data,
        createdAt: verification.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching verifications:', error);
    res.status(500).json({ error: 'Failed to fetch verifications' });
  }
});

// PUT /api/student-homework/:id/verify-deadline - Lecturer verifies deadline
router.put('/:id/verify-deadline', checkJwt, extractUser, requireLecturer, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }

    const homeworkId = req.params.id;
    const { verified_deadline, verification_status, notes } = req.body;

    const homework = await StudentHomework.findById(homeworkId);
    if (!homework) {
      return res.status(404).json({ error: 'Homework not found' });
    }

    // Check if lecturer teaches this course
    const course = await Course.findById(homework.course_id);
    if (!course.lecturer_id.equals(user._id)) {
      return res.status(403).json({ error: 'You are not the lecturer for this course' });
    }

    // Update verification
    homework.deadline_verification_status = verification_status;
    homework.deadline_verified_by = user._id;
    homework.deadline_verified_at = new Date();
    homework.deadline_verification_notes = notes;

    if (verified_deadline) {
      homework.verified_deadline = new Date(verified_deadline);
    }

    await homework.save();

    res.json({
      message: 'Deadline verification updated',
      homework: {
        _id: homework._id,
        title: homework.title,
        deadline_verification_status: homework.deadline_verification_status,
        verified_deadline: homework.verified_deadline,
        deadline_verification_notes: homework.deadline_verification_notes
      }
    });
  } catch (error) {
    console.error('Error verifying deadline:', error);
    res.status(500).json({ error: 'Failed to verify deadline' });
  }
});

module.exports = router;
