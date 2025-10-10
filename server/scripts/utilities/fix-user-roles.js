const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function fixUserRoles() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/moodle-homework-planner');
    console.log('Connected to MongoDB');

    // Define the correct role assignments
    const roleUpdates = [
      { email: 'lovely.m.2004@gmail.com', correctRole: 'student' },
      { email: 'manar.khawaled@gmail.com', correctRole: 'lecturer' },
      { email: 'aia.khaw110@gmail.com', correctRole: 'admin' } // Keep admin as is
    ];

    console.log('Starting role updates...\n');

    for (const update of roleUpdates) {
      const user = await User.findOne({ email: update.email });
      
      if (!user) {
        console.log(`❌ User not found: ${update.email}`);
        continue;
      }

      const oldRole = user.role;
      user.role = update.correctRole;
      await user.save();

      console.log(`✅ Updated ${update.email}:`);
      console.log(`   Old role: ${oldRole || 'null'}`);
      console.log(`   New role: ${update.correctRole}\n`);
    }

    // Show final status
    console.log('=== Final User Roles ===');
    const allUsers = await User.find({}, 'email role name').sort({ email: 1 });
    
    allUsers.forEach(user => {
      console.log(`${user.email} → ${user.role || 'null'}`);
    });

    console.log('\n✅ Role updates completed successfully!');

  } catch (error) {
    console.error('❌ Error fixing user roles:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the fix
fixUserRoles();
