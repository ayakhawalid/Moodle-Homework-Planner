const express = require('express');
const router = express.Router();
const { checkJwt, extractUser, requireAdminOrReadStats } = require('../middleware/auth');
const User = require('../models/User');

// GET /api/analytics/overview
// Returns user growth over last 12 months and weekly activity for last 7 days
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

    // Weekly activity: last 7 days: logins (last_login) and new users (createdAt)
    const startWeek = new Date(now);
    startWeek.setDate(now.getDate() - 6);

    const dailyLogins = await User.aggregate([
      { $match: { last_login: { $gte: startWeek } } },
      {
        $group: {
          _id: { y: { $year: '$last_login' }, m: { $month: '$last_login' }, d: { $dayOfMonth: '$last_login' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.y': 1, '_id.m': 1, '_id.d': 1 } }
    ]);

    const dailySignups = await User.aggregate([
      { $match: { createdAt: { $gte: startWeek } } },
      {
        $group: {
          _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' }, d: { $dayOfMonth: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.y': 1, '_id.m': 1, '_id.d': 1 } }
    ]);

    const dayLabels = [];
    const loginCounts = [];
    const signupCounts = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const day = d.getDate();
      dayLabels.push(d.toLocaleString('default', { weekday: 'short' }));
      const loginDay = dailyLogins.find(x => x._id.y === y && x._id.m === m && x._id.d === day);
      const signupDay = dailySignups.find(x => x._id.y === y && x._id.m === m && x._id.d === day);
      loginCounts.push(loginDay ? loginDay.count : 0);
      signupCounts.push(signupDay ? signupDay.count : 0);
    }

    res.json({
      userGrowth: { labels: monthLabels, counts: monthCounts },
      weeklyActivity: { labels: dayLabels, logins: loginCounts, newUsers: signupCounts }
    });
  } catch (e) {
    console.error('Analytics overview error:', e);
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

module.exports = router;


