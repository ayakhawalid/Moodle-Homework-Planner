require('dotenv').config(); // Load environment variables
const mongoose = require('mongoose');
const axios = require('axios');
const { getMgmtToken } = require('./auth0Management');
const User = require('../models/User');

// Do NOT create a separate connection here. The app-level connection is managed in server.js via config/database.js
// This module assumes mongoose is already connected before startPeriodicSync() is invoked.

// Sync users from Auth0
async function syncUsers() {
  try {
    const token = await getMgmtToken();

    // Fetch users from Auth0
    const { data: auth0Users } = await axios.get(
      `https://${process.env.AUTH0_DOMAIN}/api/v2/users`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const auth0Ids = auth0Users.map(u => u.user_id);

    // Upsert users into MongoDB
    for (const auth0User of auth0Users) {
      await User.updateOne(
        { auth0_id: auth0User.user_id }, // Match by Auth0 ID only
        {
          $set: {
            email: auth0User.email,
            name: auth0User.name,
            role: auth0User.app_metadata?.role || null, // Role from app_metadata
            picture: auth0User.picture,
            email_verified: auth0User.email_verified,
            is_active: !auth0User.blocked, // Active if not blocked
            last_login: auth0User.last_login,
            metadata: auth0User.app_metadata || {}, // Additional metadata
            lastSynced: new Date(), // Timestamp of sync
          },
        },
        { upsert: true } // Insert if not found, update if exists
      );
    }

    // Optional: Remove users that no longer exist in Auth0
    await User.deleteMany({ auth0_id: { $nin: auth0Ids } });

    console.log(`✅ Synced ${auth0Users.length} users with Auth0!`);
  } catch (err) {
    console.error('❌ Error syncing users:', err.response?.data || err.message);
  }
}

// Start periodic sync
function startPeriodicSync(intervalMinutes = 10) {
  console.log(`🔄 Starting periodic sync every ${intervalMinutes} minutes`);
  setInterval(syncUsers, intervalMinutes * 60 * 1000); // Run sync every interval
}

// Export functions
module.exports = {
  syncUsers,
  startPeriodicSync, // Ensure this is exported
};