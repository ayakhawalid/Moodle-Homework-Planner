const express = require('express');
const router = express.Router();
const User = require('../models/User');
const {
  syncUserRoleFromAuth0,
  deleteAuth0User,
  updateUserRoleInAuth0,
  updateAuth0UserProfile,
  updateAuth0UserMetadata,
  getAllAuth0Users
} = require('../services/auth0Management');
const {
  requireAdmin,
  requireStudent,
  checkJwt,
  extractUser,
  requireAdminOrReadUsers,
  requireAdminOrReadStats,
  requireAdminOrWriteUsers,
  requireAdminOrManageUsers
} = require('../middleware/auth');

// POST /api/users - Create or sync a user profile after login.
// This endpoint is protected and requires a valid JWT.
router.post('/', checkJwt, async (req, res) => {
  try {
    const auth0_id = req.auth.sub;
    const { email, name, full_name, username, picture, email_verified } = req.body;

    if (!auth0_id || !email || !name) {
      return res.status(400).json({ message: 'auth0_id, email, and name are required.' });
    }

    console.log(`Syncing profile for auth0_id: ${auth0_id}`);
    console.log('Auth0 roles from token:', req.auth['https://my-app.com/roles']);

    // Find user by auth0_id or email to handle account linking scenarios
    let user = await User.findOne({ $or: [{ auth0_id }, { email }] });

    if (!user) {
      console.log(`No user found for auth0_id ${auth0_id} or email ${email}. Creating new user.`);
      // Get roles from Auth0 token, default to 'student' if not present
      const rolesFromAuth0 = req.auth['https://my-app.com/roles'] || [];
      let initialRole = 'student'; // Default to student
      if (rolesFromAuth0.includes('admin')) {
        initialRole = 'admin';
      } else if (rolesFromAuth0.includes('lecturer')) {
        initialRole = 'lecturer';
      } else if (rolesFromAuth0.length > 0) {
        initialRole = rolesFromAuth0[0]; // Use the first role if no specific privilege found
      }

      user = new User({
        auth0_id,
        email,
        name,
        full_name: full_name || name, // Use full_name if provided, otherwise use name
        username: username || null,
        picture,
        email_verified,
        role: initialRole, // Set initial role from Auth0 or default
      });
    } else {
      console.log(`User found for auth0_id ${auth0_id} or email ${email}. Updating profile.`);
      // Update user details, especially linking the auth0_id if it was found by email
      user.auth0_id = auth0_id;
      user.name = name;
      user.full_name = full_name || user.full_name || name;
      user.username = username || user.username;
      user.picture = picture;
      user.email_verified = email_verified || user.email_verified;
      user.last_login = new Date();

      // Sync role from Auth0 Management API (authoritative source)
      const tokenRoles = req.auth['https://my-app.com/roles'] || [];
      console.log(`Token roles for ${user.email}:`, tokenRoles);

      // Use Management API to get authoritative roles
      await syncUserRoleFromAuth0(user, tokenRoles);
    }

    await user.save();
    res.status(200).json(user);

  } catch (error) {
    console.error('Error syncing user profile:', error);
    // Check for duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Conflict: A user with this email or Auth0 ID already exists.' });
    }
    res.status(500).json({ message: 'Failed to sync user profile' });
  }
});


// PUT /api/users/profile - Update current user's profile
router.put('/profile', checkJwt, async (req, res) => {
  try {
    const { birth_date, gender, name, full_name, username, picture } = req.body;
    const auth0_id = req.auth.sub;

    const user = await User.findOne({ auth0_id });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update allowed fields in database
    if (birth_date) user.birth_date = birth_date;
    if (gender) user.gender = gender;
    if (name) user.name = name;
    if (full_name) user.full_name = full_name;
    if (username) user.username = username;
    if (picture) user.picture = picture;

    await user.save();

    // Update profile in Auth0 if name, full_name, username, or picture changed
    if ((name || full_name || username || picture) && user.auth0_id) {
      try {
        const profileData = {};
        if (name) profileData.name = name;
        if (full_name) profileData.given_name = full_name;
        if (username) profileData.nickname = username;
        if (picture) profileData.picture = picture;

        await updateAuth0UserProfile(user.auth0_id, profileData);
        console.log(`✅ Updated profile in Auth0 for ${user.email}:`, profileData);
      } catch (auth0Error) {
        console.error(`⚠️ Failed to update profile in Auth0 for ${user.email}:`, auth0Error.message);
        // Don't fail the request if Auth0 update fails
      }
    }

    // Update metadata in Auth0 for additional fields
    if ((birth_date || gender || full_name) && user.auth0_id) {
      try {
        const metadata = {};
        if (birth_date) metadata.birth_date = birth_date;
        if (gender) metadata.gender = gender;
        if (full_name) metadata.full_name = full_name;

        await updateAuth0UserMetadata(user.auth0_id, metadata);
        console.log(`✅ Updated metadata in Auth0 for ${user.email}:`, metadata);
      } catch (auth0Error) {
        console.error(`⚠️ Failed to update metadata in Auth0 for ${user.email}:`, auth0Error.message);
        // Don't fail the request if Auth0 update fails
      }
    }

    console.log(`✅ Profile updated successfully for ${user.email} in database`);
    res.json(user);
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

// GET /api/users/profile - Get current user's profile
router.get('/profile', checkJwt, extractUser, async (req, res) => {
  try {
    const auth0_id = req.auth.sub;
    const user = await User.findOne({ auth0_id });

    if (!user) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// GET /api/users/username-available - Check if username is available
router.get('/username-available', checkJwt, extractUser, async (req, res) => {
  try {
    const { u: username } = req.query;
    const auth0_id = req.auth.sub;

    if (!username) {
      return res.status(400).json({ error: 'Username parameter required' });
    }

    // Check if username exists (excluding current user)
    const existingUser = await User.findOne({ 
      username: username,
      auth0_id: { $ne: auth0_id } // Exclude current user
    });

    res.json({ available: !existingUser });
  } catch (error) {
    console.error('Error checking username availability:', error);
    res.status(500).json({ error: 'Failed to check username availability' });
  }
});

// GET /api/users - Get all users (Admin only)
router.get('/', checkJwt, extractUser, requireAdminOrReadUsers, async (req, res) => {
  try {
    const { role, page = 1, limit = 10 } = req.query;

    const query = {}; // No filters applied
    if (role) query.role = role;

    const users = await User.find(query)
      .select('-__v') // Exclude the __v field
      .sort({ created_at: -1 }) // Sort by creation date (descending)
      .limit(limit * 1) // Limit the number of results
      .skip((page - 1) * limit); // Skip results for pagination

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_users: total,
        per_page: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// GET /api/users/stats - Get user statistics (Admin only)
router.get('/stats', checkJwt, extractUser, requireAdminOrReadStats, async (req, res) => {
  try {
    console.log('[Stats] Request received from user:', req.userInfo);
    console.log('[Stats] User roles:', req.userInfo.roles);
    console.log('[Stats] User permissions:', req.userInfo.permissions);
    console.log('[Stats] User scope:', req.userInfo.scope);
    
    // Use a single, more efficient aggregation pipeline with $facet
    const stats = await User.aggregate([
      {
        $facet: {
          totalUsers: [
            { $match: { is_active: true } },
            { $count: 'count' }
          ],
          verifiedUsers: [
            { $match: { email_verified: true, is_active: true } },
            { $count: 'count' }
          ],
          roleCounts: [
            { $match: { is_active: true, role: { $ne: null } } },
            { $group: { _id: '$role', count: { $sum: 1 } } }
          ]
        }
      }
    ]);

    console.log('[Stats] Raw aggregation result:', stats);

    // Process the results from the single aggregation call
    const result = stats[0];
    const roleStats = {};
    result.roleCounts.forEach(stat => {
      roleStats[stat._id] = stat.count;
    });

    const responseData = {
      total_users: result.totalUsers[0]?.count || 0,
      verified_users: result.verifiedUsers[0]?.count || 0,
      roles: {
        students: roleStats.student || 0,
        lecturers: roleStats.lecturer || 0,
        admins: roleStats.admin || 0
      }
    };

    console.log('[Stats] Sending response:', responseData);
    res.json(responseData);
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({ error: 'Failed to get user statistics' });
  }
});

// GET /api/users/:id - Get specific user (Admin only)
router.get('/:id', checkJwt, extractUser, requireAdminOrReadUsers, async (req, res) => {
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

// PUT /api/users/:id - Update user profile (Admin only)
router.put('/:id', checkJwt, extractUser, requireAdminOrManageUsers, async (req, res) => {
  try {
    const { name, email, birth_date, gender } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update allowed fields in database
    if (name) user.name = name;
    if (email) user.email = email;
    if (birth_date) user.birth_date = birth_date;
    if (gender) user.gender = gender;

    await user.save();

    // Update profile in Auth0 if name or email changed
    if ((name || email) && user.auth0_id) {
      try {
        const profileData = {};
        if (name) profileData.name = name;
        if (email) profileData.email = email;

        await updateAuth0UserProfile(user.auth0_id, profileData);
        console.log(`✅ Updated profile in Auth0 for ${user.email}`);
      } catch (auth0Error) {
        console.error(`⚠️ Failed to update profile in Auth0 for ${user.email}:`, auth0Error.message);
        // Don't fail the request if Auth0 update fails
      }
    }

    // Update metadata in Auth0
    if ((birth_date || gender) && user.auth0_id) {
      try {
        const metadata = {};
        if (birth_date) metadata.birth_date = birth_date;
        if (gender) metadata.gender = gender;

        await updateAuth0UserMetadata(user.auth0_id, metadata);
        console.log(`✅ Updated metadata in Auth0 for ${user.email}`);
      } catch (auth0Error) {
        console.error(`⚠️ Failed to update metadata in Auth0 for ${user.email}:`, auth0Error.message);
        // Don't fail the request if Auth0 update fails
      }
    }

    res.json({
      message: 'User profile updated successfully',
      user,
      auth0_updated: !!user.auth0_id
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

// PUT /api/users/:id/role - Update user role (Admin only)
router.put('/:id/role', checkJwt, extractUser, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;

    if (!['student', 'lecturer', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const oldRole = user.role;

    // Update role in database
    user.role = role;
    await user.save();

    // Update role in Auth0 if user has auth0_id
    if (user.auth0_id) {
      try {
        await updateUserRoleInAuth0(user.auth0_id, role);
        console.log(`✅ Successfully updated role in Auth0 for ${user.email}: ${oldRole} → ${role}`);
      } catch (auth0Error) {
        console.error(`⚠️ Failed to update role in Auth0 for ${user.email}:`, auth0Error.message);
        // Don't fail the request if Auth0 update fails, but log it
        // The database update was successful, which is the primary concern
      }
    } else {
      console.log(`⚠️ User ${user.email} has no auth0_id, skipping Auth0 role update`);
    }

    res.json({
      message: 'User role updated successfully',
      user,
      auth0_updated: !!user.auth0_id
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// DELETE /api/users/:id - Delete user in DB and Auth0
router.delete('/:id', checkJwt, extractUser, requireAdminOrManageUsers, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If deleting a lecturer, delete their courses and related data
    if (user.role === 'lecturer') {
      const Course = require('../models/Course');
      const Homework = require('../models/Homework');
      const Exam = require('../models/Exam');
      const Class = require('../models/Class');
      const StudentHomework = require('../models/StudentHomework');
      const Partner = require('../models/Partner');
      const Grade = require('../models/Grade');
      
      // Find all courses taught by this lecturer
      const lecturerCourses = await Course.find({ lecturer_id: user._id });
      const courseIds = lecturerCourses.map(course => course._id);
      
      console.log(`Deleting ${lecturerCourses.length} courses for lecturer: ${user.email}`);
      
      // Find all homework IDs (both traditional and student homework) for these courses
      const traditionalHomework = await Homework.find({ course_id: { $in: courseIds } }).select('_id');
      const studentHomework = await StudentHomework.find({ course_id: { $in: courseIds } }).select('_id');
      const exams = await Exam.find({ course_id: { $in: courseIds } }).select('_id');
      
      const allHomeworkIds = [
        ...traditionalHomework.map(hw => hw._id),
        ...studentHomework.map(hw => hw._id)
      ];
      
      const examIds = exams.map(exam => exam._id);
      
      console.log(`Found ${traditionalHomework.length} traditional homework, ${studentHomework.length} student homework, and ${exams.length} exams to delete`);
      
      // Delete all related data for these courses
      await Promise.all([
        Homework.deleteMany({ course_id: { $in: courseIds } }),
        Exam.deleteMany({ course_id: { $in: courseIds } }),
        Class.deleteMany({ course_id: { $in: courseIds } }),
        StudentHomework.deleteMany({ course_id: { $in: courseIds } }),
        Partner.deleteMany({ homework_id: { $in: allHomeworkIds } }),
        Grade.deleteMany({ 
          $or: [
            { homework_id: { $in: allHomeworkIds } },
            { exam_id: { $in: examIds } }
          ]
        })
      ]);
      
      console.log(`Deleted partnerships and grades for ${allHomeworkIds.length} homework assignments`);
      
      // Delete the courses themselves
      await Course.deleteMany({ lecturer_id: user._id });
      
      console.log(`Successfully deleted all courses and related data for lecturer: ${user.email}`);
    }

    // Delete user in Auth0
    if (user.auth0_id) {
      try {
        await deleteAuth0User(user.auth0_id);
        console.log(`Deleted Auth0 user: ${user.auth0_id}`);
      } catch (err) {
        console.error('Failed to delete user in Auth0:', err.message);
        return res.status(500).json({ error: 'Failed to delete user in Auth0' });
      }
    }

    // Delete associated role requests
    const RoleRequest = require('../models/RoleRequest');
    await RoleRequest.deleteMany({ user: user._id });
    console.log(`Deleted role requests for user: ${user.email}`);

    // Delete user in the database
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// DELETE /api/users/me - Delete current user's account (self-deletion)
router.delete('/me', checkJwt, extractUser, async (req, res) => {
  try {
    const currentUser = await User.findOne({ auth0_id: req.auth.sub });
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If deleting a lecturer, delete their courses and related data
    if (currentUser.role === 'lecturer') {
      const Course = require('../models/Course');
      const Homework = require('../models/Homework');
      const Exam = require('../models/Exam');
      const Class = require('../models/Class');
      const StudentHomework = require('../models/StudentHomework');
      const Partner = require('../models/Partner');
      const Grade = require('../models/Grade');
      
      // Find all courses taught by this lecturer
      const lecturerCourses = await Course.find({ lecturer_id: currentUser._id });
      const courseIds = lecturerCourses.map(course => course._id);
      
      console.log(`Self-deletion: Deleting ${lecturerCourses.length} courses for lecturer: ${currentUser.email}`);
      
      // Find all homework IDs (both traditional and student homework) for these courses
      const traditionalHomework = await Homework.find({ course_id: { $in: courseIds } }).select('_id');
      const studentHomework = await StudentHomework.find({ course_id: { $in: courseIds } }).select('_id');
      const exams = await Exam.find({ course_id: { $in: courseIds } }).select('_id');
      
      const allHomeworkIds = [
        ...traditionalHomework.map(hw => hw._id),
        ...studentHomework.map(hw => hw._id)
      ];
      
      const examIds = exams.map(exam => exam._id);
      
      console.log(`Self-deletion: Found ${traditionalHomework.length} traditional homework, ${studentHomework.length} student homework, and ${exams.length} exams to delete`);
      
      // Delete all related data for these courses
      await Promise.all([
        Homework.deleteMany({ course_id: { $in: courseIds } }),
        Exam.deleteMany({ course_id: { $in: courseIds } }),
        Class.deleteMany({ course_id: { $in: courseIds } }),
        StudentHomework.deleteMany({ course_id: { $in: courseIds } }),
        Partner.deleteMany({ homework_id: { $in: allHomeworkIds } }),
        Grade.deleteMany({ 
          $or: [
            { homework_id: { $in: allHomeworkIds } },
            { exam_id: { $in: examIds } }
          ]
        })
      ]);
      
      console.log(`Self-deletion: Deleted partnerships and grades for ${allHomeworkIds.length} homework assignments`);
      
      // Delete the courses themselves
      await Course.deleteMany({ lecturer_id: currentUser._id });
      
      console.log(`Self-deletion: Successfully deleted all courses and related data for lecturer: ${currentUser.email}`);
    }

    // If deleting a student, remove them from all courses
    if (currentUser.role === 'student') {
      const Course = require('../models/Course');
      await Course.updateMany(
        { students: currentUser._id },
        { $pull: { students: currentUser._id } }
      );
      console.log(`Self-deletion: Removed student from all courses: ${currentUser.email}`);
    }

    // Delete user in Auth0
    if (currentUser.auth0_id) {
      try {
        await deleteAuth0User(currentUser.auth0_id);
        console.log(`Self-deletion: Deleted Auth0 user: ${currentUser.auth0_id}`);
      } catch (err) {
        console.error('Self-deletion: Failed to delete user in Auth0:', err.message);
        return res.status(500).json({ error: 'Failed to delete user in Auth0' });
      }
    }

    // Delete associated role requests
    const RoleRequest = require('../models/RoleRequest');
    await RoleRequest.deleteMany({ user: currentUser._id });
    console.log(`Self-deletion: Deleted role requests for user: ${currentUser.email}`);

    // Delete user in the database
    await User.findByIdAndDelete(currentUser._id);
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error in self-deletion:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// GET /api/users/test-auth0 - Test Auth0 Management API connection (Admin only)
router.get('/test-auth0', checkJwt, extractUser, requireAdmin, async (req, res) => {
  try {
    const { getUserRoles, getAuth0User } = require('../services/auth0Management');

    // Test with your Auth0 ID
    const testUserId = req.userInfo.auth0_id;
    console.log('Testing Auth0 Management API with user:', testUserId);

    // Test getting user details
    const auth0User = await getAuth0User(testUserId);
    console.log('Auth0 User:', auth0User);

    // Test getting user roles
    const roles = await getUserRoles(testUserId);
    console.log('Auth0 Roles:', roles);

    res.json({
      success: true,
      testUserId: testUserId,
      auth0User: auth0User ? { id: auth0User.user_id, email: auth0User.email } : null,
      roles: roles,
      message: 'Auth0 Management API test completed'
    });
  } catch (error) {
    console.error('Auth0 Management API test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Auth0 Management API test failed'
    });
  }
});

// POST /api/users/refresh-roles - Refresh all user roles from Auth0 using Management API
router.post('/refresh-roles', checkJwt, extractUser, requireAdminOrReadUsers, async (req, res) => {
  try {
    console.log('Starting bulk role refresh from Auth0 using Management API...');

    const users = await User.find({ is_active: true, auth0_id: { $exists: true, $ne: null } });
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        const oldRole = user.role;

        // Use Management API to get authoritative roles (no user token needed)
        await syncUserRoleFromAuth0(user, []);

        const updated = oldRole !== user.role;
        if (updated) successCount++;

        results.push({
          email: user.email,
          auth0_id: user.auth0_id,
          oldRole: oldRole,
          newRole: user.role,
          updated: updated,
          status: 'success'
        });
      } catch (error) {
        console.error(`Error refreshing role for ${user.email}:`, error);
        errorCount++;
        results.push({
          email: user.email,
          auth0_id: user.auth0_id,
          oldRole: user.role,
          error: error.message,
          status: 'error'
        });
      }
    }

    res.json({
      message: `Role refresh completed. ${successCount} users updated, ${errorCount} errors.`,
      summary: {
        total: users.length,
        updated: successCount,
        errors: errorCount
      },
      results: results
    });
  } catch (error) {
    console.error('Error refreshing user roles:', error);
    res.status(500).json({ error: 'Failed to refresh user roles' });
  }
});

// GET /api/users/test-auth0-simple - Test Auth0 Management API (No auth required for testing)
router.get('/test-auth0-simple', async (req, res) => {
  try {
    const { management } = require('../services/auth0Management');

    // Test basic connection
    console.log('Testing Auth0 Management API connection...');

    // Try to get a specific user (your admin user)
    const testUserId = 'auth0|689c76ffd254f6d6e1bf03db'; // Your Auth0 ID

    const user = await management.getUser({ id: testUserId });
    const roles = await management.getUserRoles({ id: testUserId });

    res.json({
      success: true,
      message: 'Auth0 Management API is working!',
      testUser: {
        id: user.user_id,
        email: user.email,
        roles: roles.map(r => r.name)
      }
    });
  } catch (error) {
    console.error('Auth0 Management API test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || 'No additional details'
    });
  }
});

// GET /api/users/test-auth0 - Test Auth0 Management API (Admin only)
router.get('/test-auth0', checkJwt, extractUser, requireAdmin, async (req, res) => {
  try {
    const { getUserRoles } = require('../services/auth0Management');

    // Test with all users
    const users = await User.find({}, 'email auth0_id role');
    const results = [];

    for (const user of users) {
      try {
        const auth0Roles = await getUserRoles(user.auth0_id);
        results.push({
          email: user.email,
          auth0_id: user.auth0_id,
          currentDbRole: user.role,
          auth0Roles: auth0Roles
        });
      } catch (error) {
        results.push({
          email: user.email,
          auth0_id: user.auth0_id,
          currentDbRole: user.role,
          error: error.message
        });
      }
    }

    res.json({
      message: 'Auth0 Management API test results',
      results: results
    });
  } catch (error) {
    console.error('Test failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/users/sync - Synchronize database with Auth0
router.post('/sync', checkJwt, extractUser, requireAdmin, async (req, res) => {
  try {
    console.log('Starting database synchronization with Auth0...');
    const auth0Users = await getAllAuth0Users();
    const dbUsers = await User.find({});
    const dbUsersMap = new Map(dbUsers.map(user => [user.auth0_id, user]));

    let createdCount = 0;
    let updatedCount = 0;

    for (const auth0User of auth0Users) {
      const { user_id: auth0_id, email, name, picture, email_verified } = auth0User;
      const rolesFromAuth0 = auth0User.app_metadata?.roles || ['student']; // Default role

      if (dbUsersMap.has(auth0_id)) {
        // Update existing user
        const dbUser = dbUsersMap.get(auth0_id);
        dbUser.name = name;
        dbUser.picture = picture;
        dbUser.email_verified = email_verified || dbUser.email_verified;
        dbUser.last_login = new Date();
        dbUser.role = rolesFromAuth0[0]; // Use the first role
        await dbUser.save();
        updatedCount++;
      } else {
        // Create new user
        const newUser = new User({
          auth0_id,
          email,
          name,
          picture,
          email_verified,
          role: rolesFromAuth0[0] // Use the first role
        });
        await newUser.save();
        createdCount++;
      }
    }

    res.json({
      message: 'Database synchronization completed',
      totalAuth0Users: auth0Users.length,
      totalDbUsers: dbUsers.length,
      created: createdCount,
      updated: updatedCount
    });
  } catch (error) {
    console.error('Error synchronizing database with Auth0:', error);
    res.status(500).json({ error: 'Failed to synchronize database with Auth0' });
  }
});

module.exports = router;
