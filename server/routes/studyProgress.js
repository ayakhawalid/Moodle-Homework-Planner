const express = require('express');
const router = express.Router();
const StudyProgress = require('../models/StudyProgress');
const User = require('../models/User');
const { checkJwt, extractUser, requireStudent } = require('../middleware/auth');

// GET /api/study-progress - Get study progress with filters
router.get('/', checkJwt, extractUser, async (req, res) => {
  try {
    const { student_id, start_date, end_date, month, year } = req.query;
    const userRole = req.userInfo.roles[0];
    const userId = req.userInfo.auth0_id;
    
    // Students can only see their own progress
    let targetStudentId;
    if (userRole === 'student') {
      const student = await User.findOne({ auth0_id: userId });
      targetStudentId = student._id;
    } else if (userRole === 'admin' && student_id) {
      targetStudentId = student_id;
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    let query = StudyProgress.find({ student_id: targetStudentId });
    
    // Apply date filters
    if (start_date && end_date) {
      query = StudyProgress.findByDateRange(targetStudentId, new Date(start_date), new Date(end_date));
    } else if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);
      query = StudyProgress.findByDateRange(targetStudentId, startDate, endDate);
    }
    
    const progress = await query
      .populate('student_id', 'name email full_name')
      .sort({ date: -1 });
    
    res.json(progress);
  } catch (error) {
    console.error('Error fetching study progress:', error);
    res.status(500).json({ error: 'Failed to fetch study progress' });
  }
});

// GET /api/study-progress/:id - Get specific study progress entry
router.get('/:id', checkJwt, extractUser, async (req, res) => {
  try {
    const progress = await StudyProgress.findById(req.params.id)
      .populate('student_id', 'name email full_name');
    
    if (!progress) {
      return res.status(404).json({ error: 'Study progress not found' });
    }
    
    // Check access permissions
    const userRole = req.userInfo.roles[0];
    const userId = req.userInfo.auth0_id;
    
    if (userRole === 'student') {
      const student = await User.findOne({ auth0_id: userId });
      if (!progress.student_id._id.equals(student._id)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    res.json(progress);
  } catch (error) {
    console.error('Error fetching study progress:', error);
    res.status(500).json({ error: 'Failed to fetch study progress' });
  }
});

// POST /api/study-progress - Create new study progress entry (Student only)
router.post('/', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const {
      date,
      hours_studied,
      tasks_completed,
      subjects_studied,
      study_sessions,
      daily_goal_hours,
      focus_rating,
      difficulty_rating,
      month_summary
    } = req.body;
    
    const student = await User.findOne({ auth0_id: req.auth.sub });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    const progress = new StudyProgress({
      student_id: student._id,
      date,
      hours_studied,
      tasks_completed,
      subjects_studied,
      study_sessions,
      daily_goal_hours,
      focus_rating,
      difficulty_rating,
      month_summary
    });
    
    await progress.save();
    await progress.populate('student_id', 'name email full_name');
    
    res.status(201).json(progress);
  } catch (error) {
    console.error('Error creating study progress:', error);
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Study progress for this date already exists' });
    }
    res.status(500).json({ error: 'Failed to create study progress' });
  }
});

// PUT /api/study-progress/:id - Update study progress entry (Student only)
router.put('/:id', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const progress = await StudyProgress.findById(req.params.id);
    if (!progress) {
      return res.status(404).json({ error: 'Study progress not found' });
    }
    
    // Check if student owns this progress
    const student = await User.findOne({ auth0_id: req.auth.sub });
    if (!progress.student_id.equals(student._id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const {
      hours_studied,
      tasks_completed,
      subjects_studied,
      study_sessions,
      daily_goal_hours,
      focus_rating,
      difficulty_rating,
      month_summary
    } = req.body;
    
    if (hours_studied !== undefined) progress.hours_studied = hours_studied;
    if (tasks_completed) progress.tasks_completed = tasks_completed;
    if (subjects_studied) progress.subjects_studied = subjects_studied;
    if (study_sessions) progress.study_sessions = study_sessions;
    if (daily_goal_hours !== undefined) progress.daily_goal_hours = daily_goal_hours;
    if (focus_rating) progress.focus_rating = focus_rating;
    if (difficulty_rating) progress.difficulty_rating = difficulty_rating;
    if (month_summary) progress.month_summary = month_summary;
    
    await progress.save();
    await progress.populate('student_id', 'name email full_name');
    
    res.json(progress);
  } catch (error) {
    console.error('Error updating study progress:', error);
    res.status(500).json({ error: 'Failed to update study progress' });
  }
});

// POST /api/study-progress/:id/session - Add study session to existing progress
router.post('/:id/session', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const progress = await StudyProgress.findById(req.params.id);
    if (!progress) {
      return res.status(404).json({ error: 'Study progress not found' });
    }
    
    const student = await User.findOne({ auth0_id: req.auth.sub });
    if (!progress.student_id.equals(student._id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { start_time, end_time, subject, notes, productivity_rating } = req.body;
    
    const session = {
      start_time,
      end_time,
      subject,
      notes,
      productivity_rating
    };
    
    await progress.addStudySession(session);
    await progress.populate('student_id', 'name email full_name');
    
    res.json(progress);
  } catch (error) {
    console.error('Error adding study session:', error);
    res.status(500).json({ error: 'Failed to add study session' });
  }
});

// GET /api/study-progress/student/:studentId - Get progress for specific student
router.get('/student/:studentId', checkJwt, extractUser, async (req, res) => {
  try {
    const userRole = req.userInfo.roles[0];
    const userId = req.userInfo.auth0_id;
    
    // Check permissions
    if (userRole === 'student') {
      const student = await User.findOne({ auth0_id: userId });
      if (!student._id.equals(req.params.studentId)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    const progress = await StudyProgress.findByStudent(req.params.studentId)
      .populate('student_id', 'name email full_name');
    
    res.json(progress);
  } catch (error) {
    console.error('Error fetching student progress:', error);
    res.status(500).json({ error: 'Failed to fetch student progress' });
  }
});

// GET /api/study-progress/weekly/:studentId - Get weekly summary
router.get('/weekly/:studentId', checkJwt, extractUser, async (req, res) => {
  try {
    const { week } = req.query;
    const userRole = req.userInfo.roles[0];
    const userId = req.userInfo.auth0_id;
    
    // Check permissions
    if (userRole === 'student') {
      const student = await User.findOne({ auth0_id: userId });
      if (!student._id.equals(req.params.studentId)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    const weekStart = week ? new Date(week) : new Date();
    if (!week) {
      // Get start of current week (Monday)
      const day = weekStart.getDay();
      const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
      weekStart.setDate(diff);
      weekStart.setHours(0, 0, 0, 0);
    }
    
    const summary = await StudyProgress.getWeeklySummary(req.params.studentId, weekStart);
    
    res.json(summary[0] || {
      total_hours: 0,
      days_studied: 0,
      avg_hours_per_day: 0,
      goals_achieved: 0
    });
  } catch (error) {
    console.error('Error fetching weekly summary:', error);
    res.status(500).json({ error: 'Failed to fetch weekly summary' });
  }
});

// GET /api/study-progress/monthly/:studentId - Get monthly summary
router.get('/monthly/:studentId', checkJwt, extractUser, async (req, res) => {
  try {
    const { year, month } = req.query;
    const userRole = req.userInfo.roles[0];
    const userId = req.userInfo.auth0_id;
    
    // Check permissions
    if (userRole === 'student') {
      const student = await User.findOne({ auth0_id: userId });
      if (!student._id.equals(req.params.studentId)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    const currentDate = new Date();
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();
    const targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
    
    const summary = await StudyProgress.getMonthlySummary(req.params.studentId, targetYear, targetMonth);
    
    res.json(summary[0] || {
      total_hours: 0,
      days_studied: 0,
      avg_hours_per_day: 0,
      goals_achieved: 0,
      avg_focus_rating: 0,
      avg_difficulty_rating: 0
    });
  } catch (error) {
    console.error('Error fetching monthly summary:', error);
    res.status(500).json({ error: 'Failed to fetch monthly summary' });
  }
});

// GET /api/study-progress/streak/:studentId - Get study streak
router.get('/streak/:studentId', checkJwt, extractUser, async (req, res) => {
  try {
    const userRole = req.userInfo.roles[0];
    const userId = req.userInfo.auth0_id;
    
    // Check permissions
    if (userRole === 'student') {
      const student = await User.findOne({ auth0_id: userId });
      if (!student._id.equals(req.params.studentId)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    const streak = await StudyProgress.getStudyStreak(req.params.studentId);
    
    res.json({ streak });
  } catch (error) {
    console.error('Error fetching study streak:', error);
    res.status(500).json({ error: 'Failed to fetch study streak' });
  }
});

// DELETE /api/study-progress/:id - Delete study progress entry (Student only)
router.delete('/:id', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const progress = await StudyProgress.findById(req.params.id);
    if (!progress) {
      return res.status(404).json({ error: 'Study progress not found' });
    }
    
    const student = await User.findOne({ auth0_id: req.auth.sub });
    if (!progress.student_id.equals(student._id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await StudyProgress.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Study progress deleted successfully' });
  } catch (error) {
    console.error('Error deleting study progress:', error);
    res.status(500).json({ error: 'Failed to delete study progress' });
  }
});

module.exports = router;
