#!/usr/bin/env node

/**
 * User Role Sync Utility
 * 
 * This script manually syncs a specific user's role from Auth0 to the database.
 * Useful for testing and troubleshooting role synchronization issues.
 * 
 * Usage: 
 *   node sync-user-role.js lovely.m.2004@gmail.com
 *   node sync-user-role.js --all
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const { syncUserRoleFromAuth0 } = require('./services/auth0Management');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

async function syncUserRole(email) {
  try {
    log(colors.blue, `🔄 Syncing role for user: ${email}`);
    
    // Find user in database
    const user = await User.findOne({ email: email });
    if (!user) {
      log(colors.red, `❌ User not found in database: ${email}`);
      return false;
    }

    log(colors.blue, `📋 Current user info:`);
    log(colors.blue, `   Email: ${user.email}`);
    log(colors.blue, `   Auth0 ID: ${user.auth0_id}`);
    log(colors.blue, `   Current role in DB: ${user.role || 'null'}`);
    log(colors.blue, `   Last updated: ${user.updatedAt}`);

    // Sync role from Auth0
    const oldRole = user.role;
    const newRole = await syncUserRoleFromAuth0(user, []);

    if (oldRole !== newRole) {
      log(colors.green, `✅ Role updated successfully!`);
      log(colors.green, `   Old role: ${oldRole || 'null'}`);
      log(colors.green, `   New role: ${newRole}`);
    } else {
      log(colors.yellow, `ℹ️  Role unchanged: ${newRole}`);
    }

    return true;

  } catch (error) {
    log(colors.red, `❌ Error syncing role for ${email}: ${error.message}`);
    return false;
  }
}

async function syncAllUsers() {
  try {
    log(colors.blue, `🔄 Syncing roles for all users...`);
    
    const users = await User.find({ is_active: true });
    log(colors.blue, `📋 Found ${users.length} active users`);

    let successCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        const oldRole = user.role;
        const newRole = await syncUserRoleFromAuth0(user, []);
        
        if (oldRole !== newRole) {
          log(colors.green, `✅ ${user.email}: ${oldRole || 'null'} → ${newRole}`);
          successCount++;
        } else {
          log(colors.blue, `ℹ️  ${user.email}: ${newRole} (unchanged)`);
        }
      } catch (error) {
        log(colors.red, `❌ ${user.email}: ${error.message}`);
        errorCount++;
      }
    }

    log(colors.bold + colors.green, `\n🎉 Sync completed!`);
    log(colors.green, `   Updated: ${successCount} users`);
    log(colors.green, `   Errors: ${errorCount} users`);
    log(colors.green, `   Total processed: ${users.length} users`);

    return true;

  } catch (error) {
    log(colors.red, `❌ Error syncing all users: ${error.message}`);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    log(colors.yellow, 'Usage:');
    log(colors.yellow, '  node sync-user-role.js <email>     # Sync specific user');
    log(colors.yellow, '  node sync-user-role.js --all       # Sync all users');
    log(colors.yellow, '');
    log(colors.yellow, 'Examples:');
    log(colors.yellow, '  node sync-user-role.js lovely.m.2004@gmail.com');
    log(colors.yellow, '  node sync-user-role.js --all');
    process.exit(1);
  }

  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/moodle-homework-planner');
    log(colors.green, '✅ Connected to MongoDB');

    let success = false;

    if (args[0] === '--all') {
      success = await syncAllUsers();
    } else {
      const email = args[0];
      success = await syncUserRole(email);
    }

    if (success) {
      log(colors.bold + colors.green, '\n🎉 Operation completed successfully!');
    } else {
      log(colors.bold + colors.red, '\n❌ Operation failed!');
      process.exit(1);
    }

  } catch (error) {
    log(colors.red, `❌ Unexpected error: ${error.message}`);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log(colors.blue, '📝 Disconnected from MongoDB');
  }
}

// Run the script if executed directly
if (require.main === module) {
  main();
}

module.exports = { syncUserRole, syncAllUsers };
