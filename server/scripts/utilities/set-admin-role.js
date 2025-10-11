/**
 * Script to manually set a user as admin in MongoDB
 * Usage: node server/scripts/utilities/set-admin-role.js <email>
 */

const mongoose = require('mongoose');
const User = require('../../models/User');
require('dotenv').config();

const setAdminRole = async (email) => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/moodle-homework-planner';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find user by email
    const user = await User.findOne({ email: email });
    
    if (!user) {
      console.error(`❌ User not found with email: ${email}`);
      console.log('\nAvailable users:');
      const allUsers = await User.find({}).select('email role auth0_id');
      allUsers.forEach(u => {
        console.log(`  - ${u.email} (role: ${u.role || 'none'}, auth0_id: ${u.auth0_id || 'none'})`);
      });
      process.exit(1);
    }

    console.log(`\nFound user:`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Current Role: ${user.role || 'none'}`);
    console.log(`  Auth0 ID: ${user.auth0_id || 'none'}`);

    // Update role to admin
    const oldRole = user.role;
    user.role = 'admin';
    await user.save();

    console.log(`\n✅ Successfully updated role: ${oldRole} → admin`);
    console.log(`\n⚠️  IMPORTANT: The user needs to:`);
    console.log(`   1. Log out of the application`);
    console.log(`   2. Log back in to get a new JWT token`);
    console.log(`   3. Then they will have admin access`);

    // Also try to update in Auth0
    try {
      const { updateUserRoleInAuth0 } = require('../../services/auth0Management');
      if (user.auth0_id) {
        await updateUserRoleInAuth0(user.auth0_id, 'admin');
        console.log(`✅ Also updated role in Auth0`);
      } else {
        console.log(`⚠️  User has no auth0_id, couldn't update Auth0 role`);
      }
    } catch (auth0Error) {
      console.error(`⚠️  Failed to update Auth0 role:`, auth0Error.message);
      console.log(`   MongoDB role was updated successfully, but Auth0 update failed.`);
      console.log(`   The user can still use admin features after re-login.`);
    }

    console.log('\n🎉 Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide an email address');
  console.log('\nUsage: node server/scripts/utilities/set-admin-role.js <email>');
  console.log('Example: node server/scripts/utilities/set-admin-role.js aia.khaw110@gmail.com');
  process.exit(1);
}

setAdminRole(email);

