const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Course = require('../models/Course');
const Homework = require('../models/Homework');
const Grade = require('../models/Grade');
const File = require('../models/File');
const Partner = require('../models/Partner');
const User = require('../models/User');
const { checkJwt, extractUser, requireStudent } = require('../middleware/auth');

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
    // Allow common document and image formats
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, Word, text, and image files are allowed.'), false);
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
      days_until_due: Math.ceil((new Date(homework.due_date) - new Date()) / (1000 * 60 * 60 * 24)),
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

// POST /api/student-submission/homework/:homeworkId/submit - Submit homework with files
router.post('/homework/:homeworkId/submit', checkJwt, extractUser, requireStudent, upload.array('files', 5), async (req, res) => {
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
    
    // Save uploaded files
    const savedFiles = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const fileDoc = new File({
          original_name: file.originalname,
          file_name: file.filename,
          file_path: file.path,
          file_size: file.size,
          mime_type: file.mimetype,
          homework_id: homeworkId,
          uploaded_by: studentId
        });
        
        await fileDoc.save();
        savedFiles.push(fileDoc);
      }
    }
    
    // Create partner relationship if partner is selected
    let partnerRelationship = null;
    if (partner_id) {
      partnerRelationship = new Partner({
        homework_id: homeworkId,
        student1_id: studentId,
        student2_id: partner_id
      });
      await partnerRelationship.save();
    }
    
    // Create grade entry (submission record)
    const grade = new Grade({
      student_id: studentId,
      homework_id: homeworkId,
      submitted_at: new Date(),
      comments: comments,
      is_late: false,
      grade: null // Will be graded by lecturer later
    });
    
    await grade.save();
    
    res.status(201).json({
      message: 'Homework submitted successfully',
      submission: {
        grade_id: grade._id,
        files: savedFiles.map(file => ({
          _id: file._id,
          original_name: file.original_name,
          file_name: file.file_name
        })),
        partner: partnerRelationship ? {
          partner_id: partnerRelationship._id,
          partner_student_id: partner_id
        } : null,
        submitted_at: grade.submitted_at
      }
    });
  } catch (error) {
    console.error('Error submitting homework:', error);
    res.status(500).json({ error: 'Failed to submit homework' });
  }
});

// GET /api/student-submission/homework/:homeworkId/files - Get submitted files
router.get('/homework/:homeworkId/files', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const homeworkId = req.params.homeworkId;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const studentId = user._id;
    
    // Check if student has submitted this homework
    const grade = await Grade.findOne({
      homework_id: homeworkId,
      student_id: studentId
    });
    
    if (!grade) {
      return res.status(404).json({ error: 'No submission found for this homework' });
    }
    
    // Get files for this submission
    const files = await File.find({ homework_id: homeworkId, uploaded_by: studentId });
    
    const filesData = files.map(file => ({
      _id: file._id,
      original_name: file.original_name,
      file_name: file.file_name,
      file_size: file.file_size,
      mime_type: file.mime_type,
      uploaded_at: file.uploaded_at,
      download_url: `/api/student-submission/files/${file._id}/download`
    }));
    
    res.json(filesData);
  } catch (error) {
    console.error('Error fetching submitted files:', error);
    res.status(500).json({ error: 'Failed to fetch submitted files' });
  }
});

// GET /api/student-submission/files/:fileId/download - Download submitted file
router.get('/files/:fileId/download', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const fileId = req.params.fileId;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const studentId = user._id;
    
    // Get file details
    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Check if user owns this file or is partnered with the owner
    const isOwner = file.uploaded_by.equals(studentId);
    
    if (!isOwner) {
      // Check if user is partnered with the file owner for this homework
      const partner = await Partner.findOne({
        homework_id: file.homework_id,
        $or: [
          { student1_id: studentId, student2_id: file.uploaded_by },
          { student2_id: studentId, student1_id: file.uploaded_by }
        ]
      });
      
      if (!partner) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    // Check if file exists on disk
    if (!fs.existsSync(file.file_path)) {
      return res.status(404).json({ error: 'File not found on server' });
    }
    
    // Send file
    res.download(file.file_path, file.original_name);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// DELETE /api/student-submission/files/:fileId - Delete submitted file
router.delete('/files/:fileId', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const fileId = req.params.fileId;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const studentId = user._id;
    
    // Get file details
    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Check if user owns this file
    if (!file.uploaded_by.equals(studentId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check if homework is still open for submission
    const homework = await Homework.findById(file.homework_id);
    if (!homework || !homework.is_active || new Date() > homework.due_date) {
      return res.status(400).json({ error: 'Cannot delete file after homework deadline' });
    }
    
    // Delete file from disk
    if (fs.existsSync(file.file_path)) {
      fs.unlinkSync(file.file_path);
    }
    
    // Delete file record from database
    await File.findByIdAndDelete(fileId);
    
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// POST /api/student-submission/homework/:homeworkId/partner - Select partner for homework
router.post('/homework/:homeworkId/partner', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const homeworkId = req.params.homeworkId;
    const { partner_id } = req.body;
    
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
    
    // Check if homework is still open
    if (new Date() > homework.due_date) {
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
      _id: homework.course_id,
      students: partner_id,
      is_active: true
    });
    
    if (!partnerEnrolled) {
      return res.status(400).json({ error: 'Selected partner is not enrolled in this course' });
    }
    
    // Check if either student is already partnered
    const existingPartner = await Partner.findOne({
      homework_id: homeworkId,
      $or: [
        { student1_id: studentId },
        { student2_id: studentId },
        { student1_id: partner_id },
        { student2_id: partner_id }
      ]
    });
    
    if (existingPartner) {
      return res.status(400).json({ error: 'One or both students are already partnered for this homework' });
    }
    
    // Create partner relationship
    const partnerRelationship = new Partner({
      homework_id: homeworkId,
      student1_id: studentId,
      student2_id: partner_id
    });
    
    await partnerRelationship.save();
    
    res.status(201).json({
      message: 'Partner selected successfully',
      partner: {
        partner_id: partnerRelationship._id,
        student1_id: studentId,
        student2_id: partner_id
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

module.exports = router;
