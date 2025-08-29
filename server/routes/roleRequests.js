const express = require('express');
const router = express.Router();
const RoleRequest = require('../models/RoleRequest');
const User = require('../models/User');
const { checkJwt, extractUser, requireAdminOrReadStats } = require('../middleware/auth');

// GET /api/role-requests - Get all role requests (Admin only)
router.get('/', checkJwt, extractUser, requireAdminOrReadStats, async (req, res) => {
  try {
    const { status } = req.query;
    
    // First, clean up orphaned role requests (requests for users that no longer exist)
    const orphanedRequests = await RoleRequest.find({}).populate('user');
    const validRequests = orphanedRequests.filter(rr => rr.user !== null);
    const orphanedIds = orphanedRequests
      .filter(rr => rr.user === null)
      .map(rr => rr._id);
    
    if (orphanedIds.length > 0) {
      await RoleRequest.deleteMany({ _id: { $in: orphanedIds } });
      console.log(`[RoleRequest] Cleaned up ${orphanedIds.length} orphaned role requests`);
    }

    // Build query filter
    const filter = status ? { status } : {};

    // Get filtered role requests
    const requests = await RoleRequest.find(filter)
      .populate('user', 'name email role')
      .sort({ created_at: -1 });
    
    res.json(requests);
  } catch (error) {
    console.error('Error getting role requests:', error);
    res.status(500).json({ error: 'Failed to get role requests' });
  }
});

// GET /api/role-requests/my - Get current user's role requests
router.get('/my', checkJwt, extractUser, async (req, res) => {
  try {
    const user = await User.findOne({ auth0_id: req.auth.sub });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const requests = await RoleRequest.find({ user: user._id })
      .sort({ created_at: -1 });
    
    res.json(requests);
  } catch (error) {
    console.error('Error getting user role requests:', error);
    res.status(500).json({ error: 'Failed to get role requests' });
  }
});

// POST /api/role-requests - Submit a role request
router.post('/', checkJwt, extractUser, async (req, res) => {
  try {
    const { role } = req.body;
    console.log(`[RoleRequest] Received request for role: ${role} from Auth0 ID: ${req.auth.sub}`); // Added log
    
    if (!['student','lecturer','admin'].includes(role)) {
      console.warn(`[RoleRequest] Invalid role requested: ${role}`); // Added log
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    const user = await User.findOne({ auth0_id: req.auth.sub });
    if (!user) {
      console.error(`[RoleRequest] User not found in DB for Auth0 ID: ${req.auth.sub}`); // Added log
      return res.status(404).json({ error: 'User not found' });
    }
    console.log(`[RoleRequest] Found user: ${user.email} (DB ID: ${user._id})`); // Added log

    // Close previous pending requests
    await RoleRequest.updateMany(
      { user: user._id, status: 'pending' }, 
      { $set: { status: 'rejected', note: 'Superseded by new request' } }
    );
    console.log(`[RoleRequest] Closed previous pending requests for user ${user._id}`); // Added log

    const rr = await RoleRequest.create({ user: user._id, desired_role: role });
    console.log(`[RoleRequest] Created new role request: ${rr._id} for user ${user._id} to be ${role}`); // Added log

    // Notify admins via email if SMTP is configured
    // TODO: Implement email notification

    res.json({ message: 'Role request submitted', request: rr });
  } catch (e) {
    console.error('[RoleRequest] Failed to submit role request', e); // Added log
    res.status(500).json({ error: 'Failed to submit role request' });
  }
});

// POST /api/role-requests/:id/approve - Approve a role request (Admin only)
router.post('/:id/approve', checkJwt, extractUser, requireAdminOrReadStats, async (req, res) => {
  try {
    const request = await RoleRequest.findById(req.params.id).populate('user');
    if (!request) {
      return res.status(404).json({ error: 'Role request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request is not pending' });
    }

    // Update user role in database
    const user = request.user;
    const oldRole = user.role;
    user.role = request.desired_role;
    await user.save();

    // Update role in Auth0 if user has auth0_id
    if (user.auth0_id) {
      try {
        const { updateUserRoleInAuth0 } = require('../services/auth0Management');
        await updateUserRoleInAuth0(user.auth0_id, request.desired_role);
        console.log(`✅ Successfully updated role in Auth0 for ${user.email}: ${oldRole} → ${request.desired_role}`);
      } catch (auth0Error) {
        console.error(`⚠️ Failed to update role in Auth0 for ${user.email}:`, auth0Error.message);
        // Don't fail the request if Auth0 update fails, but log it
      }
    } else {
      console.log(`⚠️ User ${user.email} has no auth0_id, skipping Auth0 role update`);
    }

    // Update request status
    request.status = 'approved';
    request.note = req.body.note || 'Approved by admin';
    await request.save();

    console.log(`✅ Role request approved for ${user.email}: ${oldRole} → ${request.desired_role}`);
    res.json({ 
      message: 'Role request approved', 
      user,
      oldRole,
      newRole: request.desired_role
    });
  } catch (error) {
    console.error('Error approving role request:', error);
    res.status(500).json({ error: 'Failed to approve role request' });
  }
});

// POST /api/role-requests/:id/reject - Reject a role request (Admin only)
router.post('/:id/reject', checkJwt, extractUser, requireAdminOrReadStats, async (req, res) => {
  try {
    const request = await RoleRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Role request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request is not pending' });
    }

    request.status = 'rejected';
    request.note = req.body.note || 'Rejected by admin';
    await request.save();

    res.json({ message: 'Role request rejected' });
  } catch (error) {
    console.error('Error rejecting role request:', error);
    res.status(500).json({ error: 'Failed to reject role request' });
  }
});

module.exports = router;
