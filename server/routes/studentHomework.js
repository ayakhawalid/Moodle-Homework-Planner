const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const StudentHomework = require('../models/StudentHomework');
const Homework = require('../models/Homework');
const Course = require('../models/Course');
const User = require('../models/User');
const Partner = require('../models/Partner');
const Grade = require('../models/Grade');
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

/**
 * Sync completion status (and grade when graded) to all partners for this homework.
 * When one partner updates status, the other partner's Grade entry is updated too.
 */
async function syncCompletionStatusToPartners(homeworkId, currentStudentId, completionStatus, options = {}) {
  const { grade, isStudentHomework = true, isLate = false } = options;
  const hid = mongoose.Types.ObjectId.isValid(homeworkId) ? new mongoose.Types.ObjectId(homeworkId) : homeworkId;
  const cid = mongoose.Types.ObjectId.isValid(currentStudentId) ? new mongoose.Types.ObjectId(currentStudentId) : currentStudentId;
  const partnerships = await Partner.find({
    homework_id: hid,
    $or: [
      { student1_id: cid },
      { student2_id: cid }
    ],
    partnership_status: { $in: ['accepted', 'active', 'completed'] }
  });
  if (partnerships.length === 0) {
    console.log(`Sync: no partnerships found for homework ${hid}, current student ${cid}`);
    return;
  }
  const htype = isStudentHomework ? 'student' : 'traditional';
  for (const p of partnerships) {
    const partnerId = p.student1_id.equals(cid) ? p.student2_id : p.student1_id;
    if (completionStatus === 'not_started') {
      const existing = await Grade.findOne({
        student_id: partnerId,
        homework_id: hid,
        homework_type: htype
      });
      if (existing) await Grade.findByIdAndDelete(existing._id);
      continue;
    }
    let partnerGrade = await Grade.findOne({
      student_id: partnerId,
      homework_id: hid,
      homework_type: htype
    });
    if (!partnerGrade) {
      partnerGrade = new Grade({
        student_id: partnerId,
        homework_id: hid,
        homework_type: htype,
        completion_status: completionStatus,
        graded_by: cid,
        graded_at: new Date()
      });
    } else {
      partnerGrade.completion_status = completionStatus;
      partnerGrade.graded_at = new Date();
    }
    if (completionStatus === 'completed' || completionStatus === 'graded') {
      partnerGrade.submission_date = partnerGrade.submission_date || new Date();
      partnerGrade.is_late = isLate;
    }
    if (completionStatus === 'graded' && grade !== undefined && grade !== null) {
      partnerGrade.grade = grade;
    }
    await partnerGrade.save();
    console.log(`Synced status ${completionStatus} to partner ${partnerId} for homework ${hid}`);
  }
}

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
        // Other students' homework (both verified and unverified)
        { 
          uploader_role: 'student',
          uploaded_by: { $ne: studentId }
        }
      ]
    })
    .populate('course_id', 'course_name course_code')
    .populate('uploaded_by', 'name email')
    .populate('deadline_verified_by', 'name email')
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
      uploader_role: 'lecturer',
      uploaded_by: {
        _id: 'lecturer',
        name: 'Lecturer',
        email: 'lecturer@university.edu'
      },
      allow_partners: hw.allow_partners || false,
      max_partners: hw.max_partners ?? 1,
      // completion_status will be set from Grade table
      deadline_verification_status: 'verified', // Traditional homework is considered verified
      grade_verification_status: 'unverified',
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

    // Combine both types; tag each with homework_type for correct Grade lookup
    const studentHomeworkWithType = studentHomework.map(hw => {
      const obj = hw.toObject ? hw.toObject() : { ...hw };
      return { ...obj, _homework_type: 'student' };
    });
    const convertedWithType = convertedTraditionalHomework.map(hw => ({ ...hw, _homework_type: 'traditional' }));
    const homework = [...studentHomeworkWithType, ...convertedWithType];

    // Get all homework IDs for Grade lookup (normalize to ObjectId so we match Grades saved by sync)
    const allHomeworkIds = homework
      .map(hw => hw._id)
      .filter(Boolean)
      .map(id => (mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id));

    // Get completion status from Grade table (match by homework_id and homework_type so status is correct)
    const grades = await Grade.find({
      student_id: studentId,
      homework_id: { $in: allHomeworkIds }
    });

    const completionStatusMap = new Map();
    const gradeMap = new Map();
    const toKey = (hid, htype) => String(hid) + '_' + (htype || 'traditional');
    grades.forEach(grade => {
      if (!grade.homework_id) return;
      const key = toKey(grade.homework_id, grade.homework_type);
      completionStatusMap.set(key, grade.completion_status);
      gradeMap.set(key, grade.grade);
    });
    const getCompletionStatus = (hw) => {
      const preferredType = hw._homework_type || (hw.uploader_role === 'lecturer' ? 'traditional' : 'student');
      const keyPreferred = toKey(hw._id, preferredType);
      const keyOther = toKey(hw._id, preferredType === 'student' ? 'traditional' : 'student');
      return completionStatusMap.get(keyPreferred) || completionStatusMap.get(keyOther) || 'not_started';
    };
    const getActualGrade = (hw) => {
      const preferredType = hw._homework_type || (hw.uploader_role === 'lecturer' ? 'traditional' : 'student');
      const keyPreferred = toKey(hw._id, preferredType);
      const keyOther = toKey(hw._id, preferredType === 'student' ? 'traditional' : 'student');
      return gradeMap.get(keyPreferred) ?? gradeMap.get(keyOther) ?? null;
    };

    // Debug: Log grades data
    console.log('=== STUDENT HOMEWORK GRADES DEBUG ===');
    console.log('Total grades found:', grades.length);
    console.log('Grades data:', grades.map(g => ({
      homework_id: g.homework_id,
      completion_status: g.completion_status
    })));
    console.log('Completion status map:', Object.fromEntries(completionStatusMap));
    console.log('=== END STUDENT HOMEWORK GRADES DEBUG ===');

    // Get partner information for all homework

    const partnerships = await Partner.find({
      homework_id: { $in: allHomeworkIds },
      $or: [
        { student1_id: studentId },
        { student2_id: studentId }
      ]
    })
    .populate('student1_id', 'name email')
    .populate('student2_id', 'name email');

    // Create a map of homework_id to partnership info
    const partnershipMap = new Map();
    partnerships.forEach(partnership => {
      const partner = partnership.student1_id._id.equals(studentId) 
        ? partnership.student2_id 
        : partnership.student1_id;
      
      partnershipMap.set(partnership.homework_id.toString(), {
        has_partner: true,
        partner_name: partner.name || partner.email,
        partnership_status: partnership.partnership_status,
        partner_id: partner._id
      });
    });

    console.log(`Found ${homework.length} homework items for student ${studentId}`);
    console.log('Homework breakdown:', {
      student_homework_count: studentHomework.length,
      traditional_homework_count: traditionalHomework.length,
      total_homework_count: homework.length,
      own_homework: homework.filter(hw => hw.uploaded_by && hw.uploaded_by._id.toString() === studentId.toString()).length,
      lecturer_homework: homework.filter(hw => hw.uploader_role === 'lecturer').length,
      verified_student_homework: homework.filter(hw => hw.uploader_role === 'student' && hw.uploaded_by && hw.uploaded_by._id.toString() !== studentId.toString() && hw.deadline_verification_status === 'verified').length
    });

    res.json({
      user: user ? { _id: user._id } : null,
      homework: homework.map(hw => ({
        _id: hw._id,
        title: hw.title,
        description: hw.description,
        course: {
          _id: hw.course_id._id,
          name: hw.course_id.course_name || hw.course?.name || 'Unknown Course',
          code: hw.course_id.course_code || hw.course?.code || 'UNKNOWN'
        },
        uploaded_by: hw.uploaded_by ? {
          _id: hw.uploaded_by._id,
          name: hw.uploaded_by.name,
          email: hw.uploaded_by.email,
          role: hw.uploader_role
        } : null,
        uploader_role: hw.uploader_role,
        claimed_deadline: hw.claimed_deadline,
        verified_deadline: hw.verified_deadline,
        deadline_verification_status: hw.deadline_verification_status,
        completion_status: getCompletionStatus(hw),
        actual_grade: getActualGrade(hw),
        claimed_grade: hw.claimed_grade || null,
        days_until_deadline: hw.days_until_deadline,
        createdAt: hw.createdAt,
        completed_at: hw.completed_at,
        is_late: hw.is_late,
        allow_partners: hw.allow_partners === true || hw.allow_partners === 'true',
        max_partners: hw.max_partners ?? 1,
        partner_info: partnershipMap.get(hw._id.toString()) || { has_partner: false }
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
      allow_partners,
      max_partners
    } = req.body;

    // Determine user role
    const userRole = user.role || 'student';

    // Validate course access
    const course = await Course.findById(course_id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if course is verified (required for homework creation)
    if (course.verification_status !== 'verified') {
      return res.status(403).json({ 
        error: 'Course must be verified before creating homework',
        verification_status: course.verification_status
      });
    }

    // Check if user has access to course
    if (userRole === 'student' && !course.students.includes(user._id)) {
      return res.status(403).json({ error: 'You are not enrolled in this course' });
    }

    if (userRole === 'lecturer' && !course.lecturer_id.equals(user._id)) {
      return res.status(403).json({ error: 'You are not the lecturer for this course' });
    }

    // Create homework (coerce allow_partners to boolean so "true" from form is saved correctly)
    const homework = new StudentHomework({
      title,
      description,
      course_id,
      uploaded_by: user._id,
      uploader_role: userRole,
      claimed_deadline: new Date(claimed_deadline),
      allow_partners: allow_partners === true || allow_partners === 'true',
      max_partners: typeof max_partners === 'number' && max_partners >= 1 ? max_partners : 1,
      deadline_verification_status: 'unverified'
    });

    await homework.save();
    await homework.populate('course_id', 'course_name course_code');
    await homework.populate('uploaded_by', 'name email');

    // Create Grade entries for all enrolled students
    const enrolledStudents = await User.find({
      enrolled_courses: course_id,
      role: 'student'
    }).select('_id');

    // Create Grade entries for all students with 'not_started' status
    const gradeEntries = enrolledStudents.map(student => ({
      student_id: student._id,
      homework_id: homework._id,
      homework_type: 'student',
      completion_status: 'not_started',
      graded_by: user._id, // The homework creator
      graded_at: new Date()
    }));

    await Grade.insertMany(gradeEntries);
    console.log(`Created Grade entries for ${enrolledStudents.length} students for homework ${homework._id}`);

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
        uploaded_by: homework.uploaded_by ? {
          _id: homework.uploaded_by._id,
          name: homework.uploaded_by.name,
          email: homework.uploaded_by.email,
          role: homework.uploader_role
        } : null,
        claimed_deadline: homework.claimed_deadline,
        allow_partners: homework.allow_partners,
        max_partners: homework.max_partners,
        deadline_verification_status: homework.deadline_verification_status,
        createdAt: homework.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating homework:', error);
    res.status(500).json({ error: 'Failed to create homework' });
  }
});

// PUT /api/student-homework/:id - Update homework
router.put('/:id', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }

    const homeworkId = req.params.id;
    const {
      title,
      description,
      course_id,
      claimed_deadline,
      allow_partners,
      max_partners,
      completion_status,
      claimed_grade
    } = req.body;

    // Grade is required when setting status to 'graded' (Grade model validation)
    if (completion_status === 'graded') {
      const num = claimed_grade != null && claimed_grade !== '' ? Number(claimed_grade) : NaN;
      if (Number.isNaN(num) || num < 0 || num > 100) {
        return res.status(400).json({ error: 'A grade (0–100) is required when setting status to graded' });
      }
    }

    // Check if it's student homework or traditional homework
    let homework = await StudentHomework.findById(homeworkId);
    let isStudentHomework = true;
    
    if (!homework) {
      // If not found in StudentHomework, check if it's traditional homework
      homework = await Homework.findById(homeworkId);
      isStudentHomework = false;
      
      if (!homework) {
        return res.status(404).json({ error: 'Homework not found' });
      }
    }

    // Debug logging
    console.log('=== HOMEWORK UPDATE PERMISSION DEBUG ===');
    console.log('User role (DB):', user.role);
    console.log('User roles (Auth0):', req.userInfo.roles);
    console.log('User ID:', user._id);
    console.log('Homework uploaded_by:', homework.uploaded_by);
    console.log('Homework uploader_role:', homework.uploader_role);
    console.log('Is student homework:', isStudentHomework);
    console.log('=== END PERMISSION DEBUG ===');

    // Check permissions - Students can edit ANY student-created homework
    const isStudent = user.role === 'student' || req.userInfo.roles.includes('student');
    const isLecturer = user.role === 'lecturer' || req.userInfo.roles.includes('lecturer');
    const isAdmin = user.role === 'admin' || req.userInfo.roles.includes('admin');
    
    if (isStudent) {
      // Students can update any student-created homework (their own or others')
      if (homework.uploader_role !== 'student') {
        // For traditional homework, only allow status updates
        if (completion_status === undefined) {
          console.log('Student trying to update lecturer-created homework content - denied');
          return res.status(403).json({ error: 'You can only update the status of lecturer-created homework' });
        }
        console.log('Student updating status of lecturer-created homework - access granted');
      } else {
        console.log('Student updating student-created homework - access granted');
      }
    } else if (isLecturer) {
      // Lecturers can only update homework from their own courses
      const course = await Course.findById(homework.course_id);
      if (!course || !course.lecturer_id.equals(user._id)) {
        console.log('Lecturer trying to update homework from course they don\'t teach');
        return res.status(403).json({ error: 'You can only update homework from your own courses' });
      }
    } else if (isAdmin) {
      // Admins can update any homework
      console.log('Admin updating homework - access granted');
    } else {
      console.log('User role not recognized:', { dbRole: user.role, auth0Roles: req.userInfo.roles });
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Update homework fields
    // For traditional homework updated by students, only allow status updates
    if (isStudent && homework.uploader_role !== 'student') {
      // Only allow status updates for traditional homework by students
      console.log('Student updating traditional homework - only status allowed');
    } else {
      // Full update allowed for student-created homework or non-student users
      if (title !== undefined) homework.title = title;
      if (description !== undefined) homework.description = description;
      if (course_id !== undefined) homework.course_id = course_id;
      if (claimed_deadline !== undefined) homework.claimed_deadline = new Date(claimed_deadline);
      if (allow_partners !== undefined) homework.allow_partners = allow_partners;
      if (max_partners !== undefined) homework.max_partners = max_partners;
    }

    // When a student edits student-created or previously verified homework, set to unverified so it reappears on the lecturer verification page
    if (isStudentHomework && isStudent) {
      const contentFieldsUpdated = [
        title,
        description,
        course_id,
        claimed_deadline,
        allow_partners,
        max_partners
      ].some(field => field !== undefined);

      if (contentFieldsUpdated) {
        homework.deadline_verification_status = 'unverified';
        homework.verified_deadline = undefined;
        homework.deadline_verified_by = undefined;
        homework.deadline_verified_at = undefined;
        homework.deadline_verification_notes = undefined;
      }
    }

    await homework.save();

    // Update Grade table if completion_status is provided
    if (completion_status !== undefined) {
      // Find existing Grade entry for the current user
      let gradeEntry = await Grade.findOne({
        student_id: user._id,
        homework_id: homeworkId,
        homework_type: isStudentHomework ? 'student' : 'traditional'
      });

      if (completion_status === 'not_started') {
        // If changing to 'not_started', remove from Grade table
        if (gradeEntry) {
          await Grade.findByIdAndDelete(gradeEntry._id);
          console.log(`Removed Grade entry for student ${user._id} and homework ${homeworkId} (status changed to not_started)`);
        }
        try {
          await syncCompletionStatusToPartners(homeworkId, user._id, 'not_started', { isStudentHomework });
        } catch (syncErr) {
          console.warn('Partner sync failed (non-fatal):', syncErr.message);
        }
      } else {
        // For other statuses, create or update Grade entry
        if (!gradeEntry) {
          // Create Grade entry if it doesn't exist
          gradeEntry = new Grade({
            student_id: user._id,
            homework_id: homeworkId,
            homework_type: isStudentHomework ? 'student' : 'traditional',
            completion_status: completion_status,
            graded_by: user._id,
            graded_at: new Date()
          });
          console.log(`Created NEW Grade entry for student ${user._id} and homework ${homeworkId} with status: ${completion_status}`);
        } else {
          // Check if changing from 'graded' to any other status
          const wasGraded = gradeEntry.completion_status === 'graded';
          
          // Update existing Grade entry
          gradeEntry.completion_status = completion_status;
          gradeEntry.graded_at = new Date();
          
          // If changing from 'graded' to any other status, remove the grade
          if (wasGraded && completion_status !== 'graded') {
            gradeEntry.grade = undefined; // Remove the grade
            console.log(`UPDATED existing Grade entry for student ${user._id} and homework ${homeworkId} - removed grade (status changed from graded to ${completion_status})`);
          } else {
            console.log(`UPDATED existing Grade entry for student ${user._id} and homework ${homeworkId} to status: ${completion_status}`);
          }
        }

        // When setting status to 'graded', store the grade if provided
        if (completion_status === 'graded' && claimed_grade !== undefined && claimed_grade !== null && claimed_grade !== '') {
          const num = Number(claimed_grade);
          if (!Number.isNaN(num)) gradeEntry.grade = num;
        }

        await gradeEntry.save();
        console.log(`Updated Grade entry for student ${user._id} and homework ${homeworkId} to status: ${completion_status}`);
        // Sync status to partners so both see the same state
        try {
          await syncCompletionStatusToPartners(homeworkId, user._id, completion_status, {
            grade: gradeEntry.grade,
            isStudentHomework,
            isLate: gradeEntry.is_late
          });
        } catch (syncErr) {
          console.warn('Partner sync failed (non-fatal):', syncErr.message);
        }
      }
    }
    await homework.populate('course_id', 'course_name course_code');
    
    // Only populate uploaded_by for student-created homework
    if (isStudentHomework) {
      await homework.populate('uploaded_by', 'name email');
    }

    res.json({
      message: 'Homework updated successfully',
      homework: {
        _id: homework._id,
        title: homework.title,
        description: homework.description,
        course: {
          _id: homework.course_id._id,
          name: homework.course_id.course_name,
          code: homework.course_id.course_code
        },
        uploaded_by: homework.uploaded_by ? {
          _id: homework.uploaded_by._id,
          name: homework.uploaded_by.name,
          email: homework.uploaded_by.email,
          role: homework.uploader_role
        } : null,
        claimed_deadline: homework.claimed_deadline,
        allow_partners: homework.allow_partners,
        max_partners: homework.max_partners,
        deadline_verification_status: homework.deadline_verification_status,
        updatedAt: homework.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating homework:', error);
    res.status(500).json({ error: 'Failed to update homework' });
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
    const { claimed_grade, is_late } = req.body;

    // Check if it's student homework or traditional homework
    let homework = await StudentHomework.findById(homeworkId);
    let isStudentHomework = true;
    
    if (!homework) {
      // If not found in StudentHomework, check if it's traditional homework
      homework = await Homework.findById(homeworkId);
      isStudentHomework = false;
      
      if (!homework) {
        return res.status(404).json({ error: 'Homework not found' });
      }
    }

    // Check if student is enrolled in the course
    const course = await Course.findById(homework.course_id);
    if (!course.students.includes(user._id)) {
      return res.status(403).json({ error: 'You are not enrolled in this course' });
    }

    // Find or create the Grade table entry for this student
    let gradeEntry = await Grade.findOne({
      student_id: user._id,
      homework_id: homeworkId,
      homework_type: isStudentHomework ? 'student' : 'traditional'
    });

    if (!gradeEntry) {
      // Create Grade entry if it doesn't exist (for homework created before Grade table implementation)
      gradeEntry = new Grade({
        student_id: user._id,
        homework_id: homeworkId,
        homework_type: isStudentHomework ? 'student' : 'traditional',
        completion_status: 'not_started',
        graded_by: user._id, // The student themselves
        graded_at: new Date()
      });
      console.log(`Created missing Grade entry for student ${user._id} and homework ${homeworkId}`);
    }

    // Update completion status and grade
    const completionStatus = claimed_grade !== null && claimed_grade !== undefined ? 'graded' : 'completed';
    gradeEntry.completion_status = completionStatus;
    gradeEntry.completed_at = new Date();
    gradeEntry.is_late = is_late || false;
    
    if (claimed_grade !== null && claimed_grade !== undefined) {
      gradeEntry.grade = claimed_grade;
    }

    await gradeEntry.save();

    // Sync completion status (and grade) to partners so both see submitted/completed
    let updatedPartners = [];
    try {
      await syncCompletionStatusToPartners(homeworkId, user._id, completionStatus, {
        grade: claimed_grade,
        isStudentHomework,
        isLate: is_late || false
      });
      const partnerships = await Partner.find({
        homework_id: homeworkId,
        $or: [{ student1_id: user._id }, { student2_id: user._id }],
        partnership_status: { $in: ['accepted', 'active'] }
      });
      updatedPartners = partnerships.map(p => ({
        student_id: p.student1_id.equals(user._id) ? p.student2_id : p.student1_id,
        grade: claimed_grade
      }));
    } catch (syncErr) {
      console.warn('Partner sync failed (non-fatal):', syncErr.message);
    }

    // Return success response
    res.json({
      message: updatedPartners.length > 0 
        ? 'Homework marked as completed and grade shared with partner(s)' 
        : 'Homework marked as completed',
      homework: {
        _id: homework._id,
        title: homework.title,
        completion_status: completionStatus,
        completed_at: new Date(),
        grade: claimed_grade
      },
      updatedPartners
    });
  } catch (error) {
    console.error('Error completing homework:', error);
    res.status(500).json({ error: 'Failed to complete homework' });
  }
});

// PUT /api/student-homework/:id/start - Mark homework as started
router.put('/:id/start', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }

    const homeworkId = req.params.id;

    // Check if it's student homework or traditional homework
    let homework = await StudentHomework.findById(homeworkId);
    let isStudentHomework = true;
    
    if (!homework) {
      // If not found in StudentHomework, check if it's traditional homework
      homework = await Homework.findById(homeworkId);
      isStudentHomework = false;
      
      if (!homework) {
        return res.status(404).json({ error: 'Homework not found' });
      }
    }

    // Check if student is enrolled in the course
    const course = await Course.findById(homework.course_id);
    if (!course.students.includes(user._id)) {
      return res.status(403).json({ error: 'You are not enrolled in this course' });
    }

    // Find or create the Grade table entry for this student
    let gradeEntry = await Grade.findOne({
      student_id: user._id,
      homework_id: homeworkId,
      homework_type: isStudentHomework ? 'student' : 'traditional'
    });

    if (!gradeEntry) {
      // Create Grade entry if it doesn't exist (for homework created before Grade table implementation)
      gradeEntry = new Grade({
        student_id: user._id,
        homework_id: homeworkId,
        homework_type: isStudentHomework ? 'student' : 'traditional',
        completion_status: 'not_started',
        graded_by: user._id, // The student themselves
        graded_at: new Date()
      });
      await gradeEntry.save();
      console.log(`Created missing Grade entry for student ${user._id} and homework ${homeworkId}`);
    }

    // Update completion status to 'in_progress'
    gradeEntry.completion_status = 'in_progress';
    await gradeEntry.save();

    // Sync to partners so both see "in progress"
    try {
      await syncCompletionStatusToPartners(homeworkId, user._id, 'in_progress', { isStudentHomework });
    } catch (syncErr) {
      console.warn('Partner sync failed (non-fatal):', syncErr.message);
    }

    res.json({
      message: 'Homework marked as started',
      homework: {
        _id: homework._id,
        title: homework.title,
        completion_status: 'in_progress'
      }
    });
  } catch (error) {
    console.error('Error starting homework:', error);
    res.status(500).json({ error: 'Failed to start homework' });
  }
});

// GET /api/student-homework/verifications - Get all homework verifications for lecturer
router.get('/verifications', checkJwt, extractUser, requireLecturer, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }

    // Get all homework that needs verification for courses taught by this lecturer
    const courses = await Course.find({ lecturer_id: user._id });
    const courseIds = courses.map(course => course._id);

    const homeworkVerifications = await StudentHomework.find({
      course_id: { $in: courseIds },
      deadline_verification_status: 'unverified'
    })
    .populate('course_id', 'course_name course_code')
    .populate('uploaded_by', 'name email')
    .sort({ createdAt: -1 });

    res.json({
      verifications: homeworkVerifications.map(verification => ({
        _id: verification._id,
        title: verification.title,
        description: verification.description,
        course_id: verification.course_id,
        uploaded_by: verification.uploaded_by,
        uploader_role: verification.uploader_role,
        claimed_deadline: verification.claimed_deadline,
        deadline_verification_status: verification.deadline_verification_status,
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

// GET /api/student-homework/lecturer/verifications - Get all homework verifications for lecturer (alternative path)
router.get('/lecturer/verifications', checkJwt, extractUser, requireLecturer, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }

    // Get all homework that needs verification for courses taught by this lecturer
    const courses = await Course.find({ lecturer_id: user._id });
    const courseIds = courses.map(course => course._id);

    const homeworkVerifications = await StudentHomework.find({
      course_id: { $in: courseIds },
      deadline_verification_status: 'unverified'
    })
    .populate('course_id', 'course_name course_code')
    .populate('uploaded_by', 'name email')
    .sort({ createdAt: -1 });

    res.json({
      verifications: homeworkVerifications.map(verification => ({
        _id: verification._id,
        title: verification.title,
        description: verification.description,
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
        uploader_role: verification.uploader_role,
        claimed_deadline: verification.claimed_deadline,
        deadline_verification_status: verification.deadline_verification_status,
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

// GET /api/student-homework/lecturer/all - Get all homework for lecturer's courses
router.get('/lecturer/all', checkJwt, extractUser, requireLecturer, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }

    // Get all courses taught by this lecturer
    const courses = await Course.find({ lecturer_id: user._id });
    const courseIds = courses.map(course => course._id);

    // Get student-created homework from courses taught by this lecturer
    const studentHomework = await StudentHomework.find({
      course_id: { $in: courseIds }
    })
    .populate('course_id', 'course_name course_code')
    .populate('uploaded_by', 'name email full_name')
    .populate('deadline_verified_by', 'name email')
    .sort({ createdAt: -1 });

    // Get traditional homework from courses taught by this lecturer
    const traditionalHomework = await Homework.find({
      course_id: { $in: courseIds },
      is_active: true
    })
    .populate('course_id', 'course_name course_code')
    .sort({ due_date: 1 });

    // Convert traditional homework to match student homework format
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
      claimed_deadline: hw.due_date,
      assigned_date: hw.assigned_date,
      uploader_role: 'lecturer',
      uploaded_by: {
        _id: user._id,
        name: user.name,
        full_name: user.full_name,
        email: user.email,
        role: 'lecturer'
      },
      allow_partners: hw.allow_partners || false,
      max_partners: hw.max_partners ?? 1,
      deadline_verification_status: 'verified',
      grade_verification_status: 'unverified',
      tags: [],
      moodle_url: '',
      created_at: hw.assigned_date,
      updated_at: hw.assigned_date
    }));

    // Combine both types
    const allHomework = [...studentHomework, ...convertedTraditionalHomework];

    res.json({
      homework: allHomework.map(hw => ({
        _id: hw._id,
        title: hw.title,
        description: hw.description,
        course: {
          _id: hw.course_id._id,
          name: hw.course_id.course_name || hw.course?.name || 'Unknown Course',
          code: hw.course_id.course_code || hw.course?.code || 'UNKNOWN'
        },
        uploaded_by: hw.uploaded_by ? {
          _id: hw.uploaded_by._id,
          name: hw.uploaded_by.name,
          full_name: hw.uploaded_by.full_name,
          email: hw.uploaded_by.email,
          role: hw.uploader_role
        } : null,
        uploader_role: hw.uploader_role,
        claimed_deadline: hw.claimed_deadline,
        verified_deadline: hw.verified_deadline,
        deadline_verification_status: hw.deadline_verification_status,
        grade_verification_status: hw.grade_verification_status,
        allow_partners: hw.allow_partners === true || hw.allow_partners === 'true',
        max_partners: hw.max_partners ?? 1,
        createdAt: hw.createdAt,
        updatedAt: hw.updatedAt
      })),
      courses: courses
    });
  } catch (error) {
    console.error('Error fetching lecturer homework:', error);
    res.status(500).json({ error: 'Failed to fetch homework' });
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
    const { verified_deadline, deadline_verification_notes } = req.body;

    // Find the homework
    const homework = await StudentHomework.findById(homeworkId);
    if (!homework) {
      return res.status(404).json({ error: 'Homework not found' });
    }

    // Check if user is the lecturer for this course
    const course = await Course.findById(homework.course_id);
    if (!course.lecturer_id.equals(user._id)) {
      return res.status(403).json({ error: 'You are not the lecturer for this course' });
    }

    // Update verification status
    homework.deadline_verification_status = 'verified';
    if (verified_deadline) {
      homework.verified_deadline = new Date(verified_deadline);
    }
    if (deadline_verification_notes) {
      homework.deadline_verification_notes = deadline_verification_notes;
    }

    await homework.save();
    await homework.populate('course_id', 'course_name course_code');
    await homework.populate('uploaded_by', 'name email');

    res.json({
      message: 'Deadline verified successfully',
      homework: {
        _id: homework._id,
        title: homework.title,
        course_id: homework.course_id,
        uploaded_by: homework.uploaded_by,
        claimed_deadline: homework.claimed_deadline,
        verified_deadline: homework.verified_deadline,
        deadline_verification_status: homework.deadline_verification_status,
        deadline_verification_notes: homework.deadline_verification_notes
      }
    });
  } catch (error) {
    console.error('Error verifying deadline:', error);
    res.status(500).json({ error: 'Failed to verify deadline' });
  }
});

// DELETE /api/student-homework/:id - Delete homework
router.delete('/:id', checkJwt, extractUser, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }

    const homeworkId = req.params.id;

    // Check if it's student homework or traditional homework
    let homework = await StudentHomework.findById(homeworkId);
    let isStudentHomework = true;
    
    if (!homework) {
      // If not found in StudentHomework, check if it's traditional homework
      homework = await Homework.findById(homeworkId);
      isStudentHomework = false;
      
      if (!homework) {
        return res.status(404).json({ error: 'Homework not found' });
      }
    }

    // Check permissions - Students can delete ANY student-created homework
    const isStudent = user.role === 'student' || req.userInfo.roles.includes('student');
    const isLecturer = user.role === 'lecturer' || req.userInfo.roles.includes('lecturer');
    const isAdmin = user.role === 'admin' || req.userInfo.roles.includes('admin');
    
    if (isStudent) {
      // Students can delete any student-created homework (their own or others')
      if (homework.uploader_role !== 'student') {
        console.log('Student trying to delete lecturer-created homework - denied');
        return res.status(403).json({ error: 'You can only delete student-created homework' });
      }
      console.log('Student deleting student-created homework - access granted');
    } else if (isLecturer) {
      // Lecturers can delete homework from their own courses
      const course = await Course.findById(homework.course_id);
      if (!course || !course.lecturer_id.equals(user._id)) {
        console.log('Lecturer trying to delete homework from course they don\'t teach');
        return res.status(403).json({ error: 'You can only delete homework from your own courses' });
      }
    } else if (isAdmin) {
      // Admins can delete any homework
      console.log('Admin deleting homework - access granted');
    } else {
      console.log('User role not recognized:', { dbRole: user.role, auth0Roles: req.userInfo.roles });
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Delete associated Grade entries
    await Grade.deleteMany({
      homework_id: homeworkId,
      homework_type: isStudentHomework ? 'student' : 'traditional'
    });

    // Delete associated partnerships
    await Partner.deleteMany({
      homework_id: homeworkId
    });

    // Delete the homework
    if (isStudentHomework) {
      await StudentHomework.findByIdAndDelete(homeworkId);
    } else {
      await Homework.findByIdAndDelete(homeworkId);
    }

    console.log(`Homework ${homeworkId} deleted by user ${user._id}`);

    res.json({
      message: 'Homework deleted successfully',
      homeworkId: homeworkId
    });
  } catch (error) {
    console.error('Error deleting homework:', error);
    res.status(500).json({ error: 'Failed to delete homework' });
  }
});

module.exports = router;