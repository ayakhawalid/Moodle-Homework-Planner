const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function fixRolesManually() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/moodle-homework-planner');
    console.log('Connected to MongoDB');

    // Define the correct role assignments
    const correctRoles = [
      { email: 'aia.khaw110@gmail.com', role: 'admin' },
      { email: 'manar.khawaled@gmail.com', role: 'lecturer' },
      { email: 'lovely.m.2004@gmail.com', role: 'student' }
    ];

    console.log('=== BEFORE: Current roles ===');
    const beforeUsers = await User.find({}, 'email role').sort({ email: 1 });
    beforeUsers.forEach(user => {
      console.log(`${user.email} → ${user.role || 'null'}`);
    });

    console.log('\n=== UPDATING ROLES ===');
    
    for (const { email, role } of correctRoles) {
      const user = await User.findOne({ email });
      
      if (!user) {
        console.log(`❌ User not found: ${email}`);
        continue;
      }

      const oldRole = user.role;
      user.role = role;
      await user.save();

      console.log(`✅ ${email}: ${oldRole || 'null'} → ${role}`);
    }

    console.log('\n=== AFTER: Updated roles ===');
    const afterUsers = await User.find({}, 'email role').sort({ email: 1 });
    afterUsers.forEach(user => {
      console.log(`${user.email} → ${user.role || 'null'}`);
    });

    console.log('\n✅ Role update completed!');

  } catch (error) {
    console.error('❌ Error fixing roles:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the fix
fixRolesManually();
