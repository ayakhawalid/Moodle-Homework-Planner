const mongoose = require('mongoose');
const Course = require('./models/Course');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/moodle-homework-planner', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const courses = [
  {
    course_code: "104166",
    course_name: "Introduction to Computer Science",
    credits: 4.0,
    description: "Introduction to programming and problem solving: variables, control structures, functions, basic data types and simple algorithms.",
    semester: "fall",
    year: 2024,
    is_active: true
  },
  {
    course_code: "104101",
    course_name: "Programming I (Introduction to Programming)",
    credits: 4.0,
    description: "Fundamentals of programming in a high-level language: syntax, control flow, functions, debugging and basic software tools.",
    semester: "fall",
    year: 2024,
    is_active: true
  },
  {
    course_code: "104102",
    course_name: "Programming II (Object-Oriented Programming)",
    credits: 3.0,
    description: "Object-oriented design, classes, inheritance, polymorphism, exception handling and introductory design patterns.",
    semester: "spring",
    year: 2025,
    is_active: true
  },
  {
    course_code: "104134",
    course_name: "Data Structures",
    credits: 3.0,
    description: "Arrays, linked lists, stacks, queues, trees, hash tables, graphs and complexity analysis.",
    semester: "spring",
    year: 2025,
    is_active: true
  },
  {
    course_code: "104135",
    course_name: "Algorithms",
    credits: 3.0,
    description: "Algorithm design and analysis: divide-and-conquer, dynamic programming, greedy methods, graph algorithms and asymptotic analysis.",
    semester: "fall",
    year: 2025,
    is_active: true
  },
  {
    course_code: "104120",
    course_name: "Discrete Mathematics for Computer Science",
    credits: 3.0,
    description: "Logic, sets, relations, functions, combinatorics, proofs and basic graph theory.",
    semester: "fall",
    year: 2024,
    is_active: true
  },
  {
    course_code: "104271",
    course_name: "Operating Systems",
    credits: 3.0,
    description: "Processes and threads, CPU scheduling, memory management, concurrency and synchronization, file systems.",
    semester: "fall",
    year: 2025,
    is_active: true
  },
  {
    course_code: "104251",
    course_name: "Computer Networks",
    credits: 3.0,
    description: "Network models and protocols including OSI and TCP/IP, routing, switching and socket programming basics.",
    semester: "spring",
    year: 2025,
    is_active: true
  },
  {
    course_code: "104285",
    course_name: "Databases",
    credits: 3.0,
    description: "Relational model, SQL, schema design, normalization, transactions and basics of NoSQL systems.",
    semester: "spring",
    year: 2025,
    is_active: true
  },
  {
    course_code: "104210",
    course_name: "Software Engineering",
    credits: 3.0,
    description: "Software development lifecycle, requirements engineering, design, testing, version control and team projects.",
    semester: "fall",
    year: 2025,
    is_active: true
  },
  {
    course_code: "104312",
    course_name: "Machine Learning",
    credits: 3.0,
    description: "Supervised and unsupervised learning algorithms, model evaluation, feature selection and basic neural networks.",
    semester: "fall",
    year: 2025,
    is_active: true
  },
  {
    course_code: "104330",
    course_name: "Artificial Intelligence",
    credits: 3.0,
    description: "Search algorithms, knowledge representation, planning, reasoning and introduction to learning methods.",
    semester: "spring",
    year: 2026,
    is_active: true
  },
  {
    course_code: "104322",
    course_name: "Cryptography",
    credits: 3.0,
    description: "Classical and modern cryptographic primitives: symmetric/asymmetric encryption, hashing and protocols.",
    semester: "fall",
    year: 2025,
    is_active: true
  },
  {
    course_code: "104340",
    course_name: "Computer Security",
    credits: 3.0,
    description: "Security principles, threats, risk assessment, authentication, access control and basic secure coding practices.",
    semester: "spring",
    year: 2026,
    is_active: true
  },
  {
    course_code: "104350",
    course_name: "Human–Computer Interaction",
    credits: 2.0,
    description: "Designing usable interfaces, user-centered design methods, prototyping and evaluation techniques.",
    semester: "fall",
    year: 2025,
    is_active: true
  },
  {
    course_code: "104360",
    course_name: "Computer Graphics",
    credits: 3.0,
    description: "2D/3D graphics pipeline, transformations, rendering, shading and basic modeling techniques.",
    semester: "spring",
    year: 2026,
    is_active: true
  },
  {
    course_code: "104370",
    course_name: "Compilers",
    credits: 3.0,
    description: "Lexical analysis, parsing, semantic analysis, intermediate representations and code generation.",
    semester: "fall",
    year: 2025,
    is_active: true
  },
  {
    course_code: "104380",
    course_name: "Parallel and Distributed Computing",
    credits: 3.0,
    description: "Principles of parallel algorithms, concurrency, distributed systems concepts and performance issues.",
    semester: "spring",
    year: 2026,
    is_active: true
  },
  {
    course_code: "104390",
    course_name: "Embedded Systems",
    credits: 3.0,
    description: "Microcontrollers, real-time programming, hardware–software interfacing and embedded software design.",
    semester: "fall",
    year: 2025,
    is_active: true
  },
  {
    course_code: "104400",
    course_name: "Mobile Application Development",
    credits: 2.0,
    description: "Design and development of mobile applications, platform APIs, UI guidelines and deployment.",
    semester: "spring",
    year: 2026,
    is_active: true
  },
  {
    course_code: "104410",
    course_name: "Web Programming",
    credits: 2.0,
    description: "Client–server model, HTML/CSS/JavaScript, backend basics and RESTful APIs.",
    semester: "fall",
    year: 2024,
    is_active: true
  },
  {
    course_code: "104420",
    course_name: "Numerical Methods",
    credits: 3.0,
    description: "Numerical solution of linear systems, interpolation, root-finding, numerical integration and differential equations.",
    semester: "spring",
    year: 2025,
    is_active: true
  },
  {
    course_code: "104430",
    course_name: "Theory of Computation",
    credits: 3.0,
    description: "Automata, formal languages, Turing machines, decidability and complexity classes.",
    semester: "fall",
    year: 2025,
    is_active: true
  },
  {
    course_code: "104440",
    course_name: "Computer Vision",
    credits: 3.0,
    description: "Image formation, feature detection, segmentation, recognition and basic learning approaches for vision.",
    semester: "spring",
    year: 2026,
    is_active: true
  },
  {
    course_code: "104450",
    course_name: "Capstone Project / Final Project",
    credits: 6.0,
    description: "Team project integrating knowledge across the curriculum, from specification through implementation and evaluation.",
    semester: "spring",
    year: 2026,
    is_active: true
  }
];

async function seedCourses() {
  try {
    console.log('🌱 Starting to seed Computer Science courses...');
    
    // Wait for connection to be ready
    await mongoose.connection.asPromise();
    console.log('✅ Connected to MongoDB');
    
    // Find the lecturer (assuming there's one lecturer in the system)
    const lecturer = await User.findOne({ role: 'lecturer' });
    
    if (!lecturer) {
      console.log('⚠️  No lecturer found. Let me check all users...');
      const allUsers = await User.find({});
      console.log(`Found ${allUsers.length} users:`);
      allUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.name || user.email || 'Unknown'} - Role: ${user.role} - ID: ${user._id}`);
      });
      
      if (allUsers.length === 0) {
        console.error('❌ No users found in the database. Please create a lecturer first.');
        process.exit(1);
      } else {
        console.error('❌ No lecturer found. Please create a user with role "lecturer" first.');
        process.exit(1);
      }
    }
    
    console.log(`👨‍🏫 Found lecturer: ${lecturer.name || lecturer.email}`);
    
    // Clear existing courses for this lecturer (optional - comment out if you want to keep existing courses)
    // await Course.deleteMany({ lecturer_id: lecturer._id });
    // console.log('🗑️  Cleared existing courses for the lecturer');
    
    let createdCount = 0;
    let skippedCount = 0;
    
    // Add each course
    for (const courseData of courses) {
      // Check if course already exists
      const existingCourse = await Course.findOne({ 
        course_code: courseData.course_code,
        lecturer_id: lecturer._id 
      });
      
      if (existingCourse) {
        console.log(`⏭️  Skipping ${courseData.course_code} - ${courseData.course_name} (already exists)`);
        skippedCount++;
        continue;
      }
      
      const course = new Course({
        ...courseData,
        lecturer_id: lecturer._id,
        students: [], // Start with no students enrolled
        created_at: new Date(),
        updated_at: new Date()
      });
      
      await course.save();
      console.log(`✅ Created: ${courseData.course_code} - ${courseData.course_name}`);
      createdCount++;
    }
    
    console.log('\n🎉 Course seeding completed!');
    console.log(`📊 Summary:`);
    console.log(`   • Created: ${createdCount} courses`);
    console.log(`   • Skipped: ${skippedCount} courses (already exist)`);
    console.log(`   • Total courses for lecturer: ${createdCount + skippedCount}`);
    
    // Display course distribution by semester
    const courseStats = await Course.aggregate([
      { $match: { lecturer_id: lecturer._id } },
      { $group: { 
        _id: { semester: "$semester", year: "$year" }, 
        count: { $sum: 1 },
        totalCredits: { $sum: "$credits" }
      }},
      { $sort: { "_id.year": 1, "_id.semester": 1 } }
    ]);
    
    console.log('\n📅 Course Distribution:');
    courseStats.forEach(stat => {
      console.log(`   • ${stat._id.semester} ${stat._id.year}: ${stat.count} courses (${stat.totalCredits} credits)`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding courses:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the seeding
seedCourses();
