const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { requireAdmin, requireStudent } = require('../middleware/auth');

// GET /api/users/profile - Get current user's profile
router.get('/profile', async (req, res) => {
  try {
    let user = await User.findByAuth0Id(req.userInfo.auth0_id);
    
    if (!user) {
      // Create user if doesn't exist (auto-sync from Auth0)
      user = new User({
        auth0_id: req.userInfo.auth0_id,
        email: req.userInfo.email,
        name: req.userInfo.name,
        role: req.userInfo.roles[0] || 'student',
        email_verified: req.userInfo.email_verified,
        last_login: new Date()
      });
      
      await user.save();
      console.log('Created new user from Auth0:', user.email);
    } else {
      // Update last login
      user.last_login = new Date();
      await user.save();
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// PUT /api/users/profile - Update current user's profile
router.put('/profile', async (req, res) => {
  try {
    const { birth_date, gender } = req.body;
    
    const user = await User.findByAuth0Id(req.userInfo.auth0_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update allowed fields
    if (birth_date) user.birth_date = birth_date;
    if (gender) user.gender = gender;
    
    await user.save();
    
    res.json(user);
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

// GET /api/users - Get all users (Admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { role, page = 1, limit = 10 } = req.query;
    
    const query = { is_active: true };
    if (role) query.role = role;
    
    const users = await User.find(query)
      .select('-__v')
      .sort({ created_at: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await User.countDocuments(query);
    
    res.json({
      users,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_users: total,
        per_page: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// GET /api/users/stats - Get user statistics (Admin only)
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const totalUsers = await User.countDocuments({ is_active: true });
    const verifiedUsers = await User.countDocuments({ email_verified: true, is_active: true });
    
    const roleStats = {};
    stats.forEach(stat => {
      roleStats[stat._id] = stat.count;
    });
    
    res.json({
      total_users: totalUsers,
      verified_users: verifiedUsers,
      roles: {
        students: roleStats.student || 0,
        lecturers: roleStats.lecturer || 0,
        admins: roleStats.admin || 0
      }
    });
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({ error: 'Failed to get user statistics' });
  }
});

// GET /api/users/:id - Get specific user (Admin only)
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// PUT /api/users/:id/role - Update user role (Admin only)
router.put('/:id/role', requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!['student', 'lecturer', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    user.role = role;
    await user.save();
    
    res.json({ message: 'User role updated successfully', user });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// DELETE /api/users/:id - Deactivate user (Admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    user.is_active = false;
    await user.save();
    
    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating user:', error);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

module.exports = router;
