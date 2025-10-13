const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Course = require('../models/Course');
const Homework = require('../models/Homework');
const Grade = require('../models/Grade');
const Partner = require('../models/Partner');
const User = require('../models/User');
const { checkJwt, extractUser, requireStudent } = require('../middleware/auth');
const gradeExtractionService = require('../services/gradeExtraction');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/homework');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Allow common document, image, and code formats
    const allowedTypes = [
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'text/html',
      'text/css',
      'text/javascript',
      'application/json',
      'application/xml',
      'text/xml',
      
      // Images
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/bmp',
      'image/svg+xml',
      'image/webp',
      
      // Code files
      'application/x-python-code',
      'text/x-python',
      'text/x-java-source',
      'text/x-c',
      'text/x-c++',
      'text/x-csharp',
      'text/x-php',
      'text/x-ruby',
      'text/x-sql',
      
      // Archives
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      
      // Other common formats
      'application/octet-stream' // Generic binary file
    ];
    
    // Also check file extension as fallback
    const allowedExtensions = [
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
      '.txt', '.csv', '.html', '.css', '.js', '.json', '.xml',
      '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp',
      '.py', '.java', '.c', '.cpp', '.cs', '.php', '.rb', '.sql',
      '.zip', '.rar', '.7z'
    ];
    
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      console.log('Rejected file:', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        extension: fileExtension
      });
      cb(new Error(`Invalid file type. File: ${file.originalname}, Type: ${file.mimetype}`), false);
    }
  }
});

// GET /api/student-submission/homework/:homeworkId - Get homework details for submission
router.get('/homework/:homeworkId', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const homeworkId = req.params.homeworkId;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const studentId = user._id;
    
    // Get homework details
    const homework = await Homework.findById(homeworkId)
      .populate('course_id', 'course_name course_code')
      .populate('lecturer_id', 'name email full_name');
    
    if (!homework) {
      return res.status(404).json({ error: 'Homework not found' });
    }
    
    // Check if student is enrolled in the course
    const course = await Course.findOne({
      _id: homework.course_id._id,
      students: studentId,
      is_active: true
    });
    
    if (!course) {
      return res.status(403).json({ error: 'You are not enrolled in this course' });
    }
    
    // Check if homework is still active
    if (!homework.is_active) {
      return res.status(400).json({ error: 'This homework is no longer active' });
    }
    
    // Check if already submitted
    const existingGrade = await Grade.findOne({
      homework_id: homeworkId,
      student_id: studentId
    });
    
    // Get potential partners (other students in the same course)
    const potentialPartners = await Course.findById(homework.course_id._id)
      .populate('students', 'name email full_name')
      .then(course => course.students.filter(student => !student._id.equals(studentId)));
    
    // Get existing partner relationship
    const existingPartner = await Partner.findOne({
      homework_id: homeworkId,
      $or: [
        { student1_id: studentId },
        { student2_id: studentId }
      ]
    });
    
    const homeworkData = {
      _id: homework._id,
      title: homework.title,
      description: homework.description,
      instructions: homework.instructions,
      due_date: homework.due_date,
      assigned_date: homework.assigned_date,
      points_possible: homework.points_possible,
      course: {
        _id: homework.course_id._id,
        name: homework.course_id.course_name,
        code: homework.course_id.course_code
      },
      lecturer: homework.lecturer_id ? {
        name: homework.lecturer_id.name || homework.lecturer_id.full_name,
        email: homework.lecturer_id.email
      } : null,
      is_submitted: !!existingGrade,
      is_overdue: new Date() > homework.due_date,
      days_until_due: Math.floor((new Date(homework.due_date) - new Date()) / (1000 * 60 * 60 * 24)),
      potential_partners: potentialPartners,
      existing_partner: existingPartner ? {
        partner_id: existingPartner._id,
        student1: existingPartner.student1_id,
        student2: existingPartner.student2_id
      } : null
    };
    
    res.json(homeworkData);
  } catch (error) {
    console.error('Error fetching homework details:', error);
    res.status(500).json({ error: 'Failed to fetch homework details' });
  }
});

// POST /api/student-submission/homework/:homeworkId/submit - Submit homework
router.post('/homework/:homeworkId/submit', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const homeworkId = req.params.homeworkId;
    const { partner_id, comments, notes } = req.body;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const studentId = user._id;
    
    // Get homework details
    const homework = await Homework.findById(homeworkId);
    if (!homework || !homework.is_active) {
      return res.status(404).json({ error: 'Homework not found or inactive' });
    }
    
    // Check if student is enrolled in the course
    const course = await Course.findOne({
      _id: homework.course_id,
      students: studentId,
      is_active: true
    });
    
    if (!course) {
      return res.status(403).json({ error: 'You are not enrolled in this course' });
    }
    
    // Check if already submitted
    const existingGrade = await Grade.findOne({
      homework_id: homeworkId,
      student_id: studentId
    });
    
    if (existingGrade) {
      return res.status(400).json({ error: 'You have already submitted this homework' });
    }
    
    // Check if overdue
    if (new Date() > homework.due_date) {
      return res.status(400).json({ error: 'Homework submission is overdue' });
    }
    
    // Validate partner if provided
    if (partner_id) {
      const partner = await User.findById(partner_id);
      if (!partner) {
        return res.status(400).json({ error: 'Invalid partner selected' });
      }
      
      // Check if partner is enrolled in the same course
      const partnerEnrolled = await Course.findOne({
        _id: homework.course_id,
        students: partner_id,
        is_active: true
      });
      
      if (!partnerEnrolled) {
        return res.status(400).json({ error: 'Selected partner is not enrolled in this course' });
      }
      
      // Check if partner is already partnered with someone else for this homework
      const existingPartner = await Partner.findOne({
        homework_id: homeworkId,
        $or: [
          { student1_id: partner_id },
          { student2_id: partner_id }
        ]
      });
      
      if (existingPartner) {
        return res.status(400).json({ error: 'Selected partner is already working with someone else' });
      }
    }
    
    // Check for existing partner relationship or create new one
    let partnerRelationship = null;
    let partnerId = null;
    
    if (partner_id) {
      // Create new partner relationship
      partnerRelationship = new Partner({
        homework_id: homeworkId,
        student1_id: studentId,
        student2_id: partner_id,
        initiated_by: studentId,
        partnership_status: 'pending',
        notes: notes || ''
      });
      await partnerRelationship.save();
      partnerId = partner_id;
    } else {
      // Check for existing partnership
      const existingPartnership = await Partner.findOne({
        homework_id: homeworkId,
        $or: [
          { student1_id: studentId },
          { student2_id: studentId }
        ],
        partnership_status: { $in: ['accepted', 'active'] }
      });
      
      if (existingPartnership) {
        partnerRelationship = existingPartnership;
        partnerId = existingPartnership.student1_id.equals(studentId) 
          ? existingPartnership.student2_id 
          : existingPartnership.student1_id;
      }
    }
    
    // Create grade entry (submission record) for the submitting student
    const grade = new Grade({
      student_id: studentId,
      homework_id: homeworkId,
      submission_date: new Date(),
      feedback: comments,
      is_late: false,
      grade: 0, // Temporary grade, will be updated by lecturer
      graded_by: studentId, // Temporary, will be updated by lecturer
      points_earned: 0,
      points_possible: homework.points_possible
    });
    
    await grade.save();
    
    // If there's a partner, also create a grade entry for the partner
    let partnerGrade = null;
    if (partnerRelationship && partnerId) {
      partnerGrade = new Grade({
        student_id: partnerId,
        homework_id: homeworkId,
        submission_date: new Date(),
        feedback: `Submitted by partner: ${comments || 'No comments provided'}`,
        is_late: false,
        grade: 0, // Temporary grade, will be updated by lecturer
        graded_by: studentId, // Temporary, will be updated by lecturer
        points_earned: 0,
        points_possible: homework.points_possible
      });
      
      await partnerGrade.save();
    }
    
    res.status(201).json({
      message: 'Homework submitted successfully',
      submission: {
        grade_id: grade._id,
        partner: partnerRelationship ? {
          partner_id: partnerRelationship._id,
          partner_student_id: partnerId,
          partner_grade_id: partnerGrade ? partnerGrade._id : null
        } : null,
        submitted_at: grade.submission_date
      }
    });
  } catch (error) {
    console.error('Error submitting homework:', error);
    res.status(500).json({ error: 'Failed to submit homework' });
  }
});

// POST /api/student-submission/homework/:homeworkId/partner - Select partner for homework
router.post('/homework/:homeworkId/partner', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    console.log('=== PARTNER REQUEST RECEIVED ===');
    console.log('Route params:', req.params);
    console.log('Request body:', req.body);
    console.log('Auth user:', req.userInfo?.auth0_id);
    
    const auth0Id = req.userInfo.auth0_id;
    const homeworkId = req.params.homeworkId;
    const { partner_id, notes } = req.body;
    
    console.log('Extracted data:', { auth0Id, homeworkId, partner_id, notes });
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    console.log('User found:', user ? { id: user._id, email: user.email } : 'NOT FOUND');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const studentId = user._id;
    
    // Get homework details - check both Homework and StudentHomework models
    console.log('Looking for homework with ID:', homeworkId);
    let homework = await Homework.findById(homeworkId);
    let homeworkType = 'traditional';
    
    if (!homework) {
      // Try StudentHomework model
      const StudentHomework = require('../models/StudentHomework');
      homework = await StudentHomework.findById(homeworkId);
      homeworkType = 'student';
      console.log('Checking StudentHomework model:', homework ? 'FOUND' : 'NOT FOUND');
    }
    
    console.log('Homework found:', homework ? { id: homework._id, title: homework.title, type: homeworkType, is_active: homework.is_active } : 'NOT FOUND');
    
    if (!homework) {
      console.error('Homework not found in either collection:', { homeworkId });
      return res.status(404).json({ error: 'Homework not found or inactive' });
    }
    
    // Check if homework is active
    if (homeworkType === 'traditional' && !homework.is_active) {
      console.error('Traditional homework is inactive');
      return res.status(404).json({ error: 'Homework not found or inactive' });
    }
    
    // Get course ID based on homework type
    const courseId = homeworkType === 'traditional' ? homework.course_id : homework.course_id._id || homework.course_id;
    
    // Check if student is enrolled in the course
    const course = await Course.findOne({
      _id: courseId,
      students: studentId,
      is_active: true
    });
    
    if (!course) {
      return res.status(403).json({ error: 'You are not enrolled in this course' });
    }
    
    // Check if homework is still open
    const deadline = homeworkType === 'traditional' ? homework.due_date : homework.claimed_deadline;
    if (new Date() > deadline) {
      return res.status(400).json({ error: 'Cannot select partner after homework deadline' });
    }
    
    // Validate partner
    if (!partner_id) {
      return res.status(400).json({ error: 'Partner ID is required' });
    }
    
    const partner = await User.findById(partner_id);
    if (!partner) {
      return res.status(400).json({ error: 'Invalid partner selected' });
    }
    
    // Check if partner is enrolled in the same course
    const partnerEnrolled = await Course.findOne({
      _id: courseId,
      students: partner_id,
      is_active: true
    });
    
    if (!partnerEnrolled) {
      return res.status(400).json({ error: 'Selected partner is not enrolled in this course' });
    }
    
    // Check if partnerships are allowed for this homework
    const allowPartners = homework.allow_partners !== undefined ? homework.allow_partners : false;
    const maxPartners = homework.max_partners || 1;
    
    if (!allowPartners) {
      return res.status(400).json({ 
        error: 'Partnerships are not allowed for this homework assignment',
        details: 'This homework must be completed individually'
      });
    }
    
    // Check if student has already reached max partners for this homework
    const studentExistingPartnerships = await Partner.find({
      homework_id: homeworkId,
      partnership_status: { $in: ['pending', 'accepted', 'active'] },
      $or: [
        { student1_id: studentId },
        { student2_id: studentId }
      ]
    });
    
    if (studentExistingPartnerships.length >= maxPartners) {
      return res.status(400).json({ 
        error: `You have reached the maximum number of partners (${maxPartners}) for this homework`,
        current_partners: studentExistingPartnerships.length,
        max_allowed: maxPartners
      });
    }
    
    // Check if partner has already reached max partners for this homework
    const partnerExistingPartnerships = await Partner.find({
      homework_id: homeworkId,
      partnership_status: { $in: ['pending', 'accepted', 'active'] },
      $or: [
        { student1_id: partner_id },
        { student2_id: partner_id }
      ]
    });
    
    if (partnerExistingPartnerships.length >= maxPartners) {
      return res.status(400).json({ 
        error: `The selected student has reached the maximum number of partners (${maxPartners}) for this homework`,
        details: 'Please choose a different partner'
      });
    }
    
    // Check if these specific students already have a partnership together
    console.log('Checking for existing partnership between these specific students:', {
      homework_id: homeworkId,
      student1: studentId.toString(),
      student2: partner_id
    });
    
    const existingPartnershipTogether = await Partner.findOne({
      homework_id: homeworkId,
      partnership_status: { $in: ['pending', 'accepted', 'active'] },
      $or: [
        { student1_id: studentId, student2_id: partner_id },
        { student1_id: partner_id, student2_id: studentId }
      ]
    })
    .populate('student1_id', 'name email')
    .populate('student2_id', 'name email')
    .populate('homework_id', 'title');
    
    if (existingPartnershipTogether) {
      console.log('Found existing partnership between these students:', {
        partnership_id: existingPartnershipTogether._id,
        status: existingPartnershipTogether.partnership_status,
        student1: existingPartnershipTogether.student1_id?.email,
        student2: existingPartnershipTogether.student2_id?.email,
        homework_title: existingPartnershipTogether.homework_id?.title
      });
      
      return res.status(400).json({ 
        error: `You already have a ${existingPartnershipTogether.partnership_status} partnership with this student for this homework`,
        partnership_status: existingPartnershipTogether.partnership_status,
        partnership_id: existingPartnershipTogether._id
      });
    }
    
    // Check if there's a declined partnership that we can reactivate
    const existingDeclinedPartner = await Partner.findOne({
      homework_id: homeworkId,
      student1_id: studentId,
      student2_id: partner_id,
      partnership_status: 'declined'
    });
    
    let partnerRelationship;
    if (existingDeclinedPartner) {
      // Update the existing declined partnership
      existingDeclinedPartner.partnership_status = 'pending';
      existingDeclinedPartner.initiated_by = studentId;
      existingDeclinedPartner.notes = notes || '';
      existingDeclinedPartner.createdAt = new Date();
      existingDeclinedPartner.updatedAt = new Date();
      await existingDeclinedPartner.save();
      partnerRelationship = existingDeclinedPartner;
    } else {
      // Create new partner relationship
      partnerRelationship = new Partner({
        homework_id: homeworkId,
        homework_type: homeworkType, // 'traditional' or 'student'
        student1_id: studentId,
        student2_id: partner_id,
        initiated_by: studentId,
        partnership_status: 'pending',
        notes: notes || ''
      });
      
      await partnerRelationship.save();
    }
    
    res.status(201).json({
      message: 'Partnership request sent successfully',
      partner: {
        partner_id: partnerRelationship._id,
        student1_id: studentId,
        student2_id: partner_id,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Error selecting partner:', error);
    res.status(500).json({ error: 'Failed to select partner' });
  }
});

// DELETE /api/student-submission/homework/:homeworkId/partner - Remove partner relationship
router.delete('/homework/:homeworkId/partner', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const homeworkId = req.params.homeworkId;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const studentId = user._id;
    
    // Get homework details
    const homework = await Homework.findById(homeworkId);
    if (!homework || !homework.is_active) {
      return res.status(404).json({ error: 'Homework not found or inactive' });
    }
    
    // Check if homework is still open
    if (new Date() > homework.due_date) {
      return res.status(400).json({ error: 'Cannot remove partner after homework deadline' });
    }
    
    // Find and delete partner relationship
    const partnerRelationship = await Partner.findOneAndDelete({
      homework_id: homeworkId,
      $or: [
        { student1_id: studentId },
        { student2_id: studentId }
      ]
    });
    
    if (!partnerRelationship) {
      return res.status(404).json({ error: 'No partner relationship found' });
    }
    
    res.json({ message: 'Partner relationship removed successfully' });
  } catch (error) {
    console.error('Error removing partner:', error);
    res.status(500).json({ error: 'Failed to remove partner' });
  }
});

// PUT /api/student-submission/homework/:homeworkId/submission - Update homework submission
router.put('/homework/:homeworkId/submission', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const homeworkId = req.params.homeworkId;
    const { partner_id, comments } = req.body;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const studentId = user._id;
    
    // Get homework details
    const homework = await Homework.findById(homeworkId);
    if (!homework || !homework.is_active) {
      return res.status(404).json({ error: 'Homework not found or inactive' });
    }
    
    // Check if student is enrolled in the course
    const course = await Course.findOne({
      _id: homework.course_id,
      students: studentId,
      is_active: true
    });
    
    if (!course) {
      return res.status(403).json({ error: 'You are not enrolled in this course' });
    }
    
    // Find existing submission
    const existingGrade = await Grade.findOne({
      homework_id: homeworkId,
      student_id: studentId
    });
    
    if (!existingGrade) {
      return res.status(404).json({ error: 'No submission found to update' });
    }
    
    // Check if homework is still editable (not graded or within allowed time)
    if (existingGrade.grade !== 0) {
      return res.status(400).json({ error: 'Cannot update graded submission' });
    }
    
    // Check if overdue
    if (new Date() > homework.due_date && !homework.allow_late_submission) {
      return res.status(400).json({ error: 'Homework submission is overdue' });
    }
    
    // Validate partner if provided
    if (partner_id) {
      const partner = await User.findById(partner_id);
      if (!partner) {
        return res.status(400).json({ error: 'Invalid partner selected' });
      }
      
      // Check if partner is enrolled in the same course
      const partnerEnrolled = await Course.findOne({
        _id: homework.course_id,
        students: partner_id,
        is_active: true
      });
      
      if (!partnerEnrolled) {
        return res.status(400).json({ error: 'Selected partner is not enrolled in this course' });
      }
      
      // Check if partner is already partnered with someone else for this homework
      const existingPartner = await Partner.findOne({
        homework_id: homeworkId,
        $or: [
          { student1_id: partner_id },
          { student2_id: partner_id }
        ]
      });
      
      if (existingPartner && !existingPartner.student1_id.equals(studentId) && !existingPartner.student2_id.equals(studentId)) {
        return res.status(400).json({ error: 'Selected partner is already working with someone else' });
      }
    }
    
    // Update partner relationship if partner is selected
    if (partner_id) {
      // Remove existing partner relationship
      await Partner.findOneAndDelete({
        homework_id: homeworkId,
        $or: [
          { student1_id: studentId },
          { student2_id: studentId }
        ]
      });
      
      // Create new partner relationship
      const partnerRelationship = new Partner({
        homework_id: homeworkId,
        student1_id: studentId,
        student2_id: partner_id
      });
      await partnerRelationship.save();
    }
    
    // Update grade entry (submission record)
    existingGrade.feedback = comments;
    existingGrade.submission_date = new Date();
    await existingGrade.save();
    
    res.status(200).json({
      message: 'Homework submission updated successfully',
      submission: {
        grade_id: existingGrade._id,
        submitted_at: existingGrade.submission_date
      }
    });
  } catch (error) {
    console.error('Error updating homework submission:', error);
    res.status(500).json({ error: 'Failed to update homework submission' });
  }
});

// DELETE /api/student-submission/homework/:homeworkId/submission - Delete homework submission
router.delete('/homework/:homeworkId/submission', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const homeworkId = req.params.homeworkId;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const studentId = user._id;
    
    // Get homework details
    const homework = await Homework.findById(homeworkId);
    if (!homework || !homework.is_active) {
      return res.status(404).json({ error: 'Homework not found or inactive' });
    }
    
    // Check if student is enrolled in the course
    const course = await Course.findOne({
      _id: homework.course_id,
      students: studentId,
      is_active: true
    });
    
    if (!course) {
      return res.status(403).json({ error: 'You are not enrolled in this course' });
    }
    
    // Find the submission
    const submission = await Grade.findOne({
      homework_id: homeworkId,
      student_id: studentId
    });
    
    if (!submission) {
      return res.status(404).json({ error: 'No submission found for this homework' });
    }
    
    // Check if homework is still editable (not graded or within allowed time)
    if (submission.grade !== 0) {
      return res.status(400).json({ error: 'Cannot delete graded submission' });
    }
    
    // Delete partner relationship if exists
    await Partner.findOneAndDelete({
      homework_id: homeworkId,
      $or: [
        { student1_id: studentId },
        { student2_id: studentId }
      ]
    });
    
    // Delete the submission
    await Grade.findByIdAndDelete(submission._id);
    
    res.json({ message: 'Submission deleted successfully' });
  } catch (error) {
    console.error('Error deleting submission:', error);
    res.status(500).json({ error: 'Failed to delete submission' });
  }
});

// POST /api/student-submission/verify-grade - Extract grade from screenshot
router.post('/verify-grade', checkJwt, extractUser, requireStudent, upload.single('screenshot'), async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const { homeworkId, claimedGrade } = req.body;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const studentId = user._id;
    
    // Validate input
    if (!req.file) {
      return res.status(400).json({ error: 'Screenshot is required' });
    }
    
    if (!homeworkId || !claimedGrade) {
      return res.status(400).json({ error: 'Homework ID and claimed grade are required' });
    }
    
    // Check if student is enrolled in the course
    const homework = await Homework.findById(homeworkId).populate('course_id');
    if (!homework) {
      return res.status(404).json({ error: 'Homework not found' });
    }
    
    const course = await Course.findOne({
      _id: homework.course_id._id,
      students: studentId,
      is_active: true
    });
    
    if (!course) {
      return res.status(403).json({ error: 'You are not enrolled in this course' });
    }
    
    // Extract grade from screenshot
    const extractionResult = await gradeExtractionService.extractGradeFromImage(req.file.buffer);
    
    if (!extractionResult.success) {
      return res.status(400).json({
        success: false,
        error: extractionResult.error,
        rawText: extractionResult.rawText
      });
    }
    
    // Validate extracted grade
    const validation = gradeExtractionService.validateGrade(extractionResult.grade, extractionResult.total);
    
    // Check if extracted grade matches claimed grade (with tolerance)
    const claimedGradeNum = parseInt(claimedGrade);
    const tolerance = 2; // Allow 2-point difference
    const isMatch = Math.abs(extractionResult.grade - claimedGradeNum) <= tolerance;
    
    // Save verification record
    const verificationRecord = {
      studentId,
      homeworkId,
      claimedGrade: claimedGradeNum,
      extractedGrade: extractionResult.grade,
      extractedTotal: extractionResult.total,
      extractedPercentage: extractionResult.percentage,
      confidence: extractionResult.confidence,
      isMatch,
      screenshotPath: req.file.path,
      rawText: extractionResult.rawText,
      verifiedAt: new Date()
    };
    
    // You can save this to a database if needed
    console.log('Grade verification record:', verificationRecord);
    
    res.json({
      success: true,
      claimedGrade: claimedGradeNum,
      extractedGrade: extractionResult.grade,
      extractedTotal: extractionResult.total,
      extractedPercentage: extractionResult.percentage,
      confidence: extractionResult.confidence,
      isMatch,
      validation,
      rawText: extractionResult.rawText,
      message: isMatch ? 'Grade verification successful!' : 'Grade mismatch detected'
    });
    
  } catch (error) {
    console.error('Grade verification error:', error);
    res.status(500).json({ error: 'Failed to verify grade' });
  }
});

module.exports = router;
