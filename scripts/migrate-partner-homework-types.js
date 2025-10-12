require('dotenv').config();
const mongoose = require('mongoose');
const Partner = require('../server/models/Partner');
const Homework = require('../server/models/Homework');
const StudentHomework = require('../server/models/StudentHomework');

async function migratePartnerTypes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Get all partnerships
    const allPartners = await Partner.find({});
    console.log(`Found ${allPartners.length} partnership records\n`);

    let traditionalCount = 0;
    let studentCount = 0;
    let missingCount = 0;
    let alreadySetCount = 0;

    for (const partner of allPartners) {
      // Skip if homework_type is already set
      if (partner.homework_type) {
        alreadySetCount++;
        continue;
      }

      // Check if homework exists in Homework collection
      const traditionalHomework = await Homework.findById(partner.homework_id);
      
      if (traditionalHomework) {
        partner.homework_type = 'traditional';
        await partner.save();
        traditionalCount++;
        console.log(`✅ Set partnership ${partner._id} to 'traditional' (homework: ${traditionalHomework.title})`);
        continue;
      }

      // Check if homework exists in StudentHomework collection
      const studentHomework = await StudentHomework.findById(partner.homework_id);
      
      if (studentHomework) {
        partner.homework_type = 'student';
        await partner.save();
        studentCount++;
        console.log(`✅ Set partnership ${partner._id} to 'student' (homework: ${studentHomework.title})`);
        continue;
      }

      // Homework not found in either collection
      console.log(`⚠️  Partnership ${partner._id} references non-existent homework ${partner.homework_id}`);
      missingCount++;
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(80));
    console.log(`Total partnerships: ${allPartners.length}`);
    console.log(`Already had homework_type set: ${alreadySetCount}`);
    console.log(`Set to 'traditional': ${traditionalCount}`);
    console.log(`Set to 'student': ${studentCount}`);
    console.log(`Missing homework (orphaned): ${missingCount}`);
    console.log('='.repeat(80));

    if (missingCount > 0) {
      console.log('\n⚠️  Warning: Found orphaned partnerships (homework deleted)');
      console.log('Run this to clean them up:');
      console.log('  node scripts/cleanup-partnerships.js\n');
    }

    console.log('\n✅ Migration complete!');

  } catch (error) {
    console.error('❌ Error during migration:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDisconnected from MongoDB');
  }
}

migratePartnerTypes();

