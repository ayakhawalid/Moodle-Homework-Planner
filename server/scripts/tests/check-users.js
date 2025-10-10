const mongoose = require('mongoose');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/moodle_homework_planner', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function checkUsers() {
  try {
    console.log('👥 Checking users in the database...');
    
    const users = await User.find({});
    
    if (users.length === 0) {
      console.log('❌ No users found in the database');
    } else {
      console.log(`📊 Found ${users.length} users:`);
      users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.name || user.email || user.full_name || 'Unknown'} - Role: ${user.role} - ID: ${user._id}`);
      });
    }
    
    const lecturers = await User.find({ role: 'lecturer' });
    console.log(`\n👨‍🏫 Found ${lecturers.length} lecturers`);
    
  } catch (error) {
    console.error('❌ Error checking users:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

checkUsers();
