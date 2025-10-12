require('dotenv').config();
const mongoose = require('mongoose');
const Partner = require('../server/models/Partner');
const Homework = require('../server/models/Homework');
const StudentHomework = require('../server/models/StudentHomework');

async function cleanupPartnerships() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    let totalDeleted = 0;

    // 1. Delete partnerships with null homework_id
    console.log('🧹 Step 1: Removing partnerships with null homework_id...');
    const nullHomeworkResult = await Partner.deleteMany({ homework_id: null });
    console.log(`   Deleted ${nullHomeworkResult.deletedCount} partnerships\n`);
    totalDeleted += nullHomeworkResult.deletedCount;

    // 2. Delete partnerships where homework no longer exists in either collection
    console.log('🧹 Step 2: Removing partnerships with deleted homework...');
    const allPartners = await Partner.find({});
    let orphanedCount = 0;

    for (const partner of allPartners) {
      if (!partner.homework_id) continue;

      // Check if homework exists in Homework collection
      const traditionalHomework = await Homework.findById(partner.homework_id);
      
      // Check if homework exists in StudentHomework collection
      const studentHomework = await StudentHomework.findById(partner.homework_id);

      // If not found in either collection, delete the partnership
      if (!traditionalHomework && !studentHomework) {
        console.log(`   Deleting orphaned partnership: ${partner._id} (homework ${partner.homework_id} not found)`);
        await Partner.findByIdAndDelete(partner._id);
        orphanedCount++;
      }
    }
    console.log(`   Deleted ${orphanedCount} orphaned partnerships\n`);
    totalDeleted += orphanedCount;

    // 3. Delete declined partnerships (they're just clutter)
    console.log('🧹 Step 3: Removing declined partnerships...');
    const declinedResult = await Partner.deleteMany({ partnership_status: 'declined' });
    console.log(`   Deleted ${declinedResult.deletedCount} declined partnerships\n`);
    totalDeleted += declinedResult.deletedCount;

    // 4. Optionally delete completed partnerships (uncomment if needed)
    // console.log('🧹 Step 4: Removing completed partnerships...');
    // const completedResult = await Partner.deleteMany({ partnership_status: 'completed' });
    // console.log(`   Deleted ${completedResult.deletedCount} completed partnerships\n`);
    // totalDeleted += completedResult.deletedCount;

    console.log('='.repeat(80));
    console.log(`✅ Cleanup complete! Total partnerships deleted: ${totalDeleted}`);
    console.log('='.repeat(80));

    // Show remaining partnerships
    const remainingPartnerships = await Partner.find({})
      .populate('student1_id', 'name email')
      .populate('student2_id', 'name email')
      .populate('homework_id', 'title');

    console.log(`\n📊 Remaining partnerships: ${remainingPartnerships.length}\n`);

    if (remainingPartnerships.length > 0) {
      console.log('Status breakdown:');
      const statusCounts = {};
      remainingPartnerships.forEach(p => {
        statusCounts[p.partnership_status] = (statusCounts[p.partnership_status] || 0) + 1;
      });
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

cleanupPartnerships();

