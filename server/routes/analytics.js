const express = require('express');
const router = express.Router();
const { checkJwt, extractUser, requireAdminOrReadStats } = require('../middleware/auth');
const User = require('../models/User');

// GET /api/analytics/overview
// Returns user growth over last 12 months and new user registrations for last 7 days
router.get('/overview', checkJwt, extractUser, requireAdminOrReadStats, async (req, res) => {
  try {
    // User growth over last 12 months by month
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const growth = await User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Build last 12 month labels and counts - ensure we always have 12 months
    const monthLabels = [];
    const monthCounts = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1; // 1-12
      const label = d.toLocaleString('default', { month: 'short' });
      const found = growth.find(g => g._id.year === y && g._id.month === m);
      monthLabels.push(label);
      monthCounts.push(found ? found.count : 0);
    }

    // Weekly activity: last 7 days: new users (createdAt) only
    const startWeek = new Date(now);
    startWeek.setDate(now.getDate() - 6);
    startWeek.setHours(0, 0, 0, 0);
    
    const endWeek = new Date(now);
    endWeek.setHours(23, 59, 59, 999);

    const dailySignups = await User.aggregate([
      { $match: { createdAt: { $gte: startWeek, $lte: endWeek } } },
      {
        $group: {
          _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' }, d: { $dayOfMonth: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.y': 1, '_id.m': 1, '_id.d': 1 } }
    ]);

    // Generate proper week structure (last 7 days in chronological order)
    const dayLabels = [];
    const signupCounts = [];
    
    // Generate 7 days starting from today going backwards
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const day = d.getDate();
      
      const dayLabel = d.toLocaleString('default', { weekday: 'short' });
      dayLabels.push(dayLabel); // Add to end to show today first
      
      // Find data for this specific day
      const signupDay = dailySignups.find(x => x._id.y === y && x._id.m === m && x._id.d === day);
      
      signupCounts.push(signupDay ? signupDay.count : 0); // Add to end to show today first
    }

    res.json({
      userGrowth: { labels: monthLabels, counts: monthCounts },
      weeklyActivity: { labels: dayLabels, newUsers: signupCounts }
    });
  } catch (e) {
    console.error('Analytics overview error:', e);
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

module.exports = router;


