require('dotenv').config();
const mongoose = require('mongoose');
const Partner = require('../server/models/Partner');
const Homework = require('../server/models/Homework');
const User = require('../server/models/User');

async function checkPartnerships() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Get all partnerships
    const partnerships = await Partner.find({})
      .populate('student1_id', 'name email')
      .populate('student2_id', 'name email')
      .populate('homework_id', 'title')
      .sort({ createdAt: -1 });

    console.log(`Total partnerships found: ${partnerships.length}\n`);

    // Check for issues
    const issues = {
      nullHomework: [],
      nullStudents: [],
      completedButBlockingNew: [],
      declined: [],
      byStatus: {}
    };

    partnerships.forEach(partnership => {
      const status = partnership.partnership_status;
      issues.byStatus[status] = (issues.byStatus[status] || 0) + 1;

      // Check for null homework
      if (!partnership.homework_id) {
        issues.nullHomework.push(partnership);
      }

      // Check for null students
      if (!partnership.student1_id || !partnership.student2_id) {
        issues.nullStudents.push(partnership);
      }

      // Check completed partnerships
      if (status === 'completed') {
        issues.completedButBlockingNew.push(partnership);
      }

      // Check declined partnerships
      if (status === 'declined') {
        issues.declined.push(partnership);
      }
    });

    console.log('📊 Partnership Status Distribution:');
    console.log('='.repeat(80));
    Object.entries(issues.byStatus).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    console.log('');

    // Report issues
    if (issues.nullHomework.length > 0) {
      console.log('⚠️  ISSUE: Partnerships with missing homework:');
      issues.nullHomework.forEach(p => {
        console.log(`  - Partnership ${p._id}: ${p.student1_id?.email} + ${p.student2_id?.email} (Status: ${p.partnership_status})`);
      });
      console.log('');
    }

    if (issues.nullStudents.length > 0) {
      console.log('⚠️  ISSUE: Partnerships with missing students:');
      issues.nullStudents.forEach(p => {
        console.log(`  - Partnership ${p._id}: ${p.homework_id?.title || 'Unknown homework'}`);
      });
      console.log('');
    }

    if (issues.completedButBlockingNew.length > 0) {
      console.log('ℹ️  INFO: Completed partnerships (can be cleaned up):');
      issues.completedButBlockingNew.forEach(p => {
        console.log(`  - ${p.student1_id?.email} + ${p.student2_id?.email} for ${p.homework_id?.title || 'Unknown'} (${p._id})`);
      });
      console.log('  These are now excluded from blocking new partnerships.\n');
    }

    if (issues.declined.length > 0) {
      console.log('ℹ️  INFO: Declined partnerships (can be cleaned up):');
      issues.declined.forEach(p => {
        console.log(`  - ${p.student1_id?.email} + ${p.student2_id?.email} for ${p.homework_id?.title || 'Unknown'} (${p._id})`);
      });
      console.log('');
    }

    // Show recent partnerships
    console.log('📋 Recent Partnerships (last 10):');
    console.log('='.repeat(80));
    partnerships.slice(0, 10).forEach((p, index) => {
      console.log(`${index + 1}. ${p.student1_id?.email || 'Unknown'} + ${p.student2_id?.email || 'Unknown'}`);
      console.log(`   Homework: ${p.homework_id?.title || 'DELETED/MISSING'}`);
      console.log(`   Status: ${p.partnership_status}`);
      console.log(`   Created: ${p.createdAt}`);
      console.log(`   ID: ${p._id}`);
      console.log('');
    });

    // Cleanup suggestions
    console.log('='.repeat(80));
    console.log('🧹 Cleanup Suggestions:\n');

    if (issues.nullHomework.length > 0) {
      console.log(`1. Delete ${issues.nullHomework.length} partnerships with missing homework:`);
      console.log(`   db.partners.deleteMany({ homework_id: null })\n`);
    }

    if (issues.nullStudents.length > 0) {
      console.log(`2. Delete ${issues.nullStudents.length} partnerships with missing students:`);
      console.log(`   (Requires manual inspection)\n`);
    }

    if (issues.completedButBlockingNew.length > 0) {
      console.log(`3. Optionally delete ${issues.completedButBlockingNew.length} completed partnerships:`);
      console.log(`   db.partners.deleteMany({ partnership_status: 'completed' })\n`);
    }

    if (issues.declined.length > 0) {
      console.log(`4. Delete ${issues.declined.length} declined partnerships:`);
      console.log(`   db.partners.deleteMany({ partnership_status: 'declined' })\n`);
    }

    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\nDisconnected from MongoDB');
  }
}

checkPartnerships();

