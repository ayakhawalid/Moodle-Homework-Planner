const express = require('express');
const router = express.Router();
const StudentHomework = require('../models/StudentHomework');
const Course = require('../models/Course');
const User = require('../models/User');
const { checkJwt, extractUser } = require('../middleware/auth');

// GET /api/test-data/status - Check if there's any homework data
router.get('/status', checkJwt, extractUser, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const user = await User.findOne({ auth0_id: auth0Id });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get all homework
    const allHomework = await StudentHomework.find()
      .populate('course_id', 'course_name course_code lecturer_id')
      .populate('uploaded_by', 'name email role')
      .sort({ createdAt: -1 });

    // Get courses for this user
    let userCourses = [];
    if (user.role === 'lecturer') {
      userCourses = await Course.find({ lecturer_id: user._id, is_active: true });
    } else if (user.role === 'student') {
      userCourses = await Course.find({ students: user._id, is_active: true });
    }

    // Get homework for user's courses
    const courseIds = userCourses.map(course => course._id);
    const userHomework = allHomework.filter(hw => courseIds.includes(hw.course_id._id));

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      courses: {
        total: userCourses.length,
        list: userCourses.map(c => ({
          _id: c._id,
          name: c.course_name,
          code: c.course_code,
          lecturer_id: c.lecturer_id
        }))
      },
      homework: {
        total: allHomework.length,
        userRelevant: userHomework.length,
        list: userHomework.map(h => ({
          _id: h._id,
          title: h.title,
          course: h.course_id.course_name,
          uploaded_by: h.uploaded_by.name,
          uploader_role: h.uploader_role,
          deadline_status: h.deadline_verification_status,
          grade_status: h.grade_verification_status,
          completion_status: h.completion_status,
          created_at: h.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Error checking test data:', error);
    res.status(500).json({ error: 'Failed to check test data' });
  }
});

// POST /api/test-data/create-sample - Create sample homework data
router.post('/create-sample', checkJwt, extractUser, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const user = await User.findOne({ auth0_id: auth0Id });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's courses
    let userCourses = [];
    if (user.role === 'lecturer') {
      userCourses = await Course.find({ lecturer_id: user._id, is_active: true });
    } else if (user.role === 'student') {
      userCourses = await Course.find({ students: user._id, is_active: true });
    }

    if (userCourses.length === 0) {
      return res.status(400).json({ error: 'No courses found for user' });
    }

    const sampleCourse = userCourses[0];
    const sampleDeadline = new Date();
    sampleDeadline.setDate(sampleDeadline.getDate() + 7); // Due in 7 days

    // Create sample homework
    const sampleHomework = new StudentHomework({
      title: 'Sample Homework Assignment',
      description: 'This is a sample homework created for testing purposes.',
      course_id: sampleCourse._id,
      uploaded_by: user._id,
      uploader_role: user.role,
      claimed_deadline: sampleDeadline,
      priority: 'medium',
      tags: ['sample', 'test'],
      deadline_verification_status: 'pending_review',
      grade_verification_status: 'unverified',
      completion_status: 'not_started'
    });

    await sampleHomework.save();
    await sampleHomework.populate('course_id', 'course_name course_code');
    await sampleHomework.populate('uploaded_by', 'name email');

    res.json({
      message: 'Sample homework created successfully',
      homework: {
        _id: sampleHomework._id,
        title: sampleHomework.title,
        course: sampleHomework.course_id.course_name,
        uploaded_by: sampleHomework.uploaded_by.name,
        deadline: sampleHomework.claimed_deadline,
        status: sampleHomework.deadline_verification_status
      }
    });
  } catch (error) {
    console.error('Error creating sample data:', error);
    res.status(500).json({ error: 'Failed to create sample data' });
  }
});

module.exports = router;
