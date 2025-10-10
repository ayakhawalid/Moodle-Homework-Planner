const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Course = require('./models/Course');
const Homework = require('./models/Homework');
const Class = require('./models/Class');
const Exam = require('./models/Exam');
const Grade = require('./models/Grade');
const StudyProgress = require('./models/StudyProgress');
const Partner = require('./models/Partner');
const File = require('./models/File');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected for seeding'))
.catch(err => console.error('❌ MongoDB connection error:', err));

async function seedStudentDashboard() {
  try {
    console.log('🌱 Starting student dashboard data seeding...');

    // Create test users
    const lecturer = await User.findOneAndUpdate(
      { auth0_id: 'auth0|test-lecturer' },
      {
        auth0_id: 'auth0|test-lecturer',
        name: 'Dr. Sarah Johnson',
        email: 'sarah.johnson@university.edu',
        full_name: 'Dr. Sarah Johnson',
        role: 'lecturer',
        birth_date: new Date('1980-05-15'),
        gender: 'female'
      },
      { upsert: true, new: true }
    );

    const student1 = await User.findOneAndUpdate(
      { auth0_id: 'auth0|test-student1' },
      {
        auth0_id: 'auth0|test-student1',
        name: 'John Smith',
        email: 'john.smith@student.edu',
        full_name: 'John Smith',
        role: 'student',
        birth_date: new Date('2000-03-20'),
        gender: 'male'
      },
      { upsert: true, new: true }
    );

    const student2 = await User.findOneAndUpdate(
      { auth0_id: 'auth0|test-student2' },
      {
        auth0_id: 'auth0|test-student2',
        name: 'Emma Wilson',
        email: 'emma.wilson@student.edu',
        full_name: 'Emma Wilson',
        role: 'student',
        birth_date: new Date('2001-07-10'),
        gender: 'female'
      },
      { upsert: true, new: true }
    );

    const student3 = await User.findOneAndUpdate(
      { auth0_id: 'auth0|test-student3' },
      {
        auth0_id: 'auth0|test-student3',
        name: 'Michael Brown',
        email: 'michael.brown@student.edu',
        full_name: 'Michael Brown',
        role: 'student',
        birth_date: new Date('1999-11-05'),
        gender: 'male'
      },
      { upsert: true, new: true }
    );

    console.log('✅ Users created');

    // Create courses
    const course1 = await Course.findOneAndUpdate(
      { course_code: 'CS101' },
      {
        course_name: 'Introduction to Computer Science',
        course_code: 'CS101',
        description: 'Fundamental concepts of computer science and programming',
        credits: 3,
        semester: 'Fall',
        year: 2024,
        lecturer_id: lecturer._id,
        students: [student1._id, student2._id, student3._id],
        is_active: true
      },
      { upsert: true, new: true }
    );

    const course2 = await Course.findOneAndUpdate(
      { course_code: 'MATH201' },
      {
        course_name: 'Advanced Mathematics',
        course_code: 'MATH201',
        description: 'Advanced mathematical concepts and problem solving',
        credits: 4,
        semester: 'Fall',
        year: 2024,
        lecturer_id: lecturer._id,
        students: [student1._id, student2._id],
        is_active: true
      },
      { upsert: true, new: true }
    );

    console.log('✅ Courses created');

    // Create homework assignments
    const homework1 = await Homework.findOneAndUpdate(
      { title: 'Programming Assignment 1' },
      {
        course_id: course1._id,
        lecturer_id: lecturer._id,
        title: 'Programming Assignment 1',
        description: 'Create a simple calculator program in Python',
        due_date: new Date('2024-12-15T23:59:59Z'),
        assigned_date: new Date('2024-11-20T10:00:00Z'),
        points_possible: 100,
        instructions: 'Submit a working Python program that can perform basic arithmetic operations',
        is_active: true
      },
      { upsert: true, new: true }
    );

    const homework2 = await Homework.findOneAndUpdate(
      { title: 'Data Structures Project' },
      {
        course_id: course1._id,
        lecturer_id: lecturer._id,
        title: 'Data Structures Project',
        description: 'Implement a binary search tree',
        due_date: new Date('2024-12-20T23:59:59Z'),
        assigned_date: new Date('2024-11-25T10:00:00Z'),
        points_possible: 150,
        instructions: 'Create a complete implementation of a binary search tree with insertion, deletion, and search operations',
        is_active: true
      },
      { upsert: true, new: true }
    );

    const homework3 = await Homework.findOneAndUpdate(
      { title: 'Calculus Problem Set' },
      {
        course_id: course2._id,
        lecturer_id: lecturer._id,
        title: 'Calculus Problem Set',
        description: 'Solve differential equations problems',
        due_date: new Date('2024-12-10T23:59:59Z'),
        assigned_date: new Date('2024-11-15T10:00:00Z'),
        points_possible: 80,
        instructions: 'Complete problems 1-10 from Chapter 5',
        is_active: true
      },
      { upsert: true, new: true }
    );

    console.log('✅ Homework assignments created');

    // Create classes
    const class1 = await Class.findOneAndUpdate(
      { class_title: 'Introduction to Python' },
      {
        course_id: course1._id,
        class_date: new Date('2024-12-02T10:00:00Z'),
        room: 'Room 101',
        class_title: 'Introduction to Python',
        start_time: '10:00',
        end_time: '11:30',
        description: 'Basic Python syntax and data types',
        class_type: 'lecture'
      },
      { upsert: true, new: true }
    );

    const class2 = await Class.findOneAndUpdate(
      { class_title: 'Data Structures Overview' },
      {
        course_id: course1._id,
        class_date: new Date('2024-12-04T14:00:00Z'),
        room: 'Room 102',
        class_title: 'Data Structures Overview',
        start_time: '14:00',
        end_time: '15:30',
        description: 'Introduction to arrays, linked lists, and trees',
        class_type: 'lecture'
      },
      { upsert: true, new: true }
    );

    const class3 = await Class.findOneAndUpdate(
      { class_title: 'Calculus Review' },
      {
        course_id: course2._id,
        class_date: new Date('2024-12-03T09:00:00Z'),
        room: 'Room 201',
        class_title: 'Calculus Review',
        start_time: '09:00',
        end_time: '11:00',
        description: 'Review of differentiation and integration',
        class_type: 'lecture'
      },
      { upsert: true, new: true }
    );

    console.log('✅ Classes created');

    // Create exams
    const exam1 = await Exam.findOneAndUpdate(
      { exam_title: 'CS101 Midterm Exam' },
      {
        course_id: course1._id,
        exam_title: 'CS101 Midterm Exam',
        description: 'Midterm examination covering Python basics and algorithms',
        due_date: new Date('2024-12-08T14:00:00Z'),
        points_possible: 200,
        exam_type: 'midterm',
        is_active: true
      },
      { upsert: true, new: true }
    );

    const exam2 = await Exam.findOneAndUpdate(
      { exam_title: 'MATH201 Final Exam' },
      {
        course_id: course2._id,
        exam_title: 'MATH201 Final Exam',
        description: 'Comprehensive final examination',
        due_date: new Date('2024-12-18T10:00:00Z'),
        points_possible: 300,
        exam_type: 'final',
        is_active: true
      },
      { upsert: true, new: true }
    );

    console.log('✅ Exams created');

    // Create grades
    const grade1 = await Grade.findOneAndUpdate(
      { student_id: student1._id, homework_id: homework1._id },
      {
        student_id: student1._id,
        homework_id: homework1._id,
        grade: 85,
        points_earned: 85,
        points_possible: 100,
        letter_grade: 'B',
        feedback: 'Good work! Consider adding more error handling.',
        graded_at: new Date('2024-12-01T15:30:00Z'),
        is_late: false
      },
      { upsert: true, new: true }
    );

    const grade2 = await Grade.findOneAndUpdate(
      { student_id: student1._id, exam_id: exam1._id },
      {
        student_id: student1._id,
        exam_id: exam1._id,
        grade: 92,
        points_earned: 184,
        points_possible: 200,
        letter_grade: 'A-',
        feedback: 'Excellent performance on the exam!',
        graded_at: new Date('2024-12-09T16:00:00Z'),
        is_late: false
      },
      { upsert: true, new: true }
    );

    const grade3 = await Grade.findOneAndUpdate(
      { student_id: student2._id, homework_id: homework1._id },
      {
        student_id: student2._id,
        homework_id: homework1._id,
        grade: 78,
        points_earned: 78,
        points_possible: 100,
        letter_grade: 'C+',
        feedback: 'Good effort, but some concepts need clarification.',
        graded_at: new Date('2024-12-01T14:45:00Z'),
        is_late: false
      },
      { upsert: true, new: true }
    );

    console.log('✅ Grades created');

    // Create study progress data
    const studyProgress1 = await StudyProgress.findOneAndUpdate(
      { student_id: student1._id, date: new Date('2024-12-01') },
      {
        student_id: student1._id,
        date: new Date('2024-12-01'),
        hours_studied: 3.5,
        tasks_completed: 'Completed Python assignment, reviewed algorithms',
        goal_achieved: true,
        focus_rating: 8,
        difficulty_rating: 6,
        subjects_studied: [
          { subject: 'Computer Science', hours: 2.5 },
          { subject: 'Mathematics', hours: 1.0 }
        ]
      },
      { upsert: true, new: true }
    );

    const studyProgress2 = await StudyProgress.findOneAndUpdate(
      { student_id: student1._id, date: new Date('2024-11-30') },
      {
        student_id: student1._id,
        date: new Date('2024-11-30'),
        hours_studied: 2.0,
        tasks_completed: 'Read textbook chapters, practiced coding',
        goal_achieved: false,
        focus_rating: 6,
        difficulty_rating: 7,
        subjects_studied: [
          { subject: 'Computer Science', hours: 2.0 }
        ]
      },
      { upsert: true, new: true }
    );

    const studyProgress3 = await StudyProgress.findOneAndUpdate(
      { student_id: student2._id, date: new Date('2024-12-01') },
      {
        student_id: student2._id,
        date: new Date('2024-12-01'),
        hours_studied: 4.0,
        tasks_completed: 'Worked on calculus problems, studied for exam',
        goal_achieved: true,
        focus_rating: 9,
        difficulty_rating: 8,
        subjects_studied: [
          { subject: 'Mathematics', hours: 3.0 },
          { subject: 'Computer Science', hours: 1.0 }
        ]
      },
      { upsert: true, new: true }
    );

    console.log('✅ Study progress created');

    // Create partner relationships
    const partner1 = await Partner.findOneAndUpdate(
      { homework_id: homework2._id, student1_id: student1._id, student2_id: student2._id },
      {
        homework_id: homework2._id,
        student1_id: student1._id,
        student2_id: student2._id,
        initiated_by: student1._id,
        partnership_status: 'accepted',
        accepted_at: new Date('2024-11-26T10:00:00Z'),
        notes: 'Working together on binary search tree implementation'
      },
      { upsert: true, new: true }
    );

    console.log('✅ Partner relationships created');

    // Create files
    const file1 = await File.findOneAndUpdate(
      { original_name: 'calculator.py' },
      {
        filename: 'calculator-123456789.py',
        original_name: 'calculator.py',
        file_path: '/uploads/homework/calculator-123456789.py',
        file_size: 2048,
        mime_type: 'text/plain',
        homework_id: homework1._id,
        uploaded_by: student1._id,
        description: 'Python calculator implementation',
        file_type: 'submission',
        is_active: true
      },
      { upsert: true, new: true }
    );

    console.log('✅ Files created');

    console.log('🎉 Student dashboard data seeding completed successfully!');
    console.log('\n📊 Sample Data Summary:');
    console.log(`- Users: ${await User.countDocuments()} (1 lecturer, 3 students)`);
    console.log(`- Courses: ${await Course.countDocuments()} (CS101, MATH201)`);
    console.log(`- Homework: ${await Homework.countDocuments()} (3 assignments)`);
    console.log(`- Classes: ${await Class.countDocuments()} (3 classes)`);
    console.log(`- Exams: ${await Exam.countDocuments()} (2 exams)`);
    console.log(`- Grades: ${await Grade.countDocuments()} (3 grades)`);
    console.log(`- Study Progress: ${await StudyProgress.countDocuments()} (3 sessions)`);
    console.log(`- Partners: ${await Partner.countDocuments()} (1 partnership)`);
    console.log(`- Files: ${await File.countDocuments()} (1 file)`);

  } catch (error) {
    console.error('❌ Error seeding student dashboard data:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the seeding function
seedStudentDashboard();
