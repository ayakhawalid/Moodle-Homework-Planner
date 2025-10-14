const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Homework = require('../models/Homework');
const StudentHomework = require('../models/StudentHomework');
const Grade = require('../models/Grade');
const User = require('../models/User');
const Class = require('../models/Class');
const Exam = require('../models/Exam');
const { checkJwt, extractUser, requireLecturer } = require('../middleware/auth');

// GET /api/lecturer-dashboard/overview - Get lecturer dashboard overview
router.get('/overview', checkJwt, extractUser, requireLecturer, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const lecturerId = user._id;
    
    // Get lecturer's courses
    const courses = await Course.find({ lecturer_id: lecturerId, is_active: true })
      .populate('students', 'name email full_name')
      .populate('homework')
      .populate('classes')
      .populate('exams');
    
    // Get homework statistics from BOTH tables
    const courseIds = courses.map(course => course._id);
    
    // Query traditional homework
    const traditionalHomework = await Homework.find({ 
      course_id: { $in: courseIds }, 
      is_active: true 
    }).populate('course_id', 'course_name course_code');
    
    // Query student homework
    const studentHomework = await StudentHomework.find({
      course_id: { $in: courseIds }
    }).populate('course_id', 'course_name course_code')
      .populate('uploaded_by', 'name email');
    
    // Combine both types
    const allHomework = [...traditionalHomework, ...studentHomework];
    
    console.log(`Dashboard overview - Traditional homework: ${traditionalHomework.length}, Student homework: ${studentHomework.length}, Total: ${allHomework.length}`);
    
    // Get grading statistics from BOTH homework tables
    const traditionalHomeworkIds = traditionalHomework.map(hw => hw._id);
    const studentHomeworkIds = studentHomework.map(hw => hw._id);
    const allHomeworkIds = [...traditionalHomeworkIds, ...studentHomeworkIds];
    const grades = await Grade.find({ homework_id: { $in: allHomeworkIds } });
    
    // Calculate statistics
    const totalStudents = courses.reduce((sum, course) => sum + course.students.length, 0);
    const totalHomework = allHomework.length;
    const gradedHomework = grades.length;
    const pendingGrading = totalHomework - gradedHomework;
    
    // Calculate average grades
    const averageGrade = grades.length > 0 
      ? grades.reduce((sum, grade) => sum + grade.grade, 0) / grades.length 
      : 0;
    
    // Get classes for the lecturer
    const classes = await Class.find({ 
      course_id: { $in: courseIds }, 
      is_active: true 
    }).populate('course_id', 'course_name course_code');

    // Get today's classes
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    const todaysClasses = classes.filter(cls => {
      const classDate = new Date(cls.date);
      return classDate >= today && classDate <= todayEnd;
    }).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    // Get recent homework submissions (last 7 days) - when students submit homework from BOTH tables
    const allHomeworkIdsForSubmissions = [...traditionalHomeworkIds, ...studentHomeworkIds];
    const recentSubmissions = await Grade.find({ 
      homework_id: { $in: allHomeworkIdsForSubmissions },
      submitted_at: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    })
    .populate('homework_id', 'title due_date')
    .populate('student_id', 'name email')
    .sort({ submitted_at: -1 })
    .limit(10);

    // Get all students across all courses
    const allStudents = [];
    courses.forEach(course => {
      allStudents.push(...course.students);
    });

    // Calculate student performance statistics using real letter grades
    const studentGrades = {};
    grades.forEach(grade => {
      const studentId = grade.student_id.toString();
      if (!studentGrades[studentId]) {
        studentGrades[studentId] = [];
      }
      // Use letter_grade if available, otherwise calculate it
      const letterGrade = grade.letter_grade || grade.calculateLetterGrade();
      studentGrades[studentId].push({
        numeric: grade.grade,
        letter: letterGrade
      });
    });

    // Calculate performance metrics based on actual letter grades
    const topPerformers = [];
    const strugglingStudents = [];
    
    Object.entries(studentGrades).forEach(([studentId, gradeList]) => {
      const averageGrade = gradeList.reduce((sum, grade) => sum + grade.numeric, 0) / gradeList.length;
      const student = allStudents.find(s => s._id.toString() === studentId);
      
      if (student) {
        // Count A grades (A+, A, A-)
        const aGrades = gradeList.filter(g => ['A+', 'A', 'A-'].includes(g.letter)).length;
        const aGradePercentage = (aGrades / gradeList.length) * 100;
        
        // Count failing grades (D+, D, D-, F)
        const failingGrades = gradeList.filter(g => ['D+', 'D', 'D-', 'F'].includes(g.letter)).length;
        const failingPercentage = (failingGrades / gradeList.length) * 100;
        
        // Top performers: students with 60% or more A grades
        if (aGradePercentage >= 60) {
          topPerformers.push({
            _id: student._id,
            name: student.name || student.full_name,
            average_grade: Math.round(averageGrade * 100) / 100,
            letter_grade: gradeList[0].letter, // Most recent letter grade
            a_grade_percentage: Math.round(aGradePercentage),
            grade_count: gradeList.length
          });
        }
        
        // Struggling students: students with 40% or more failing grades
        if (failingPercentage >= 40) {
          strugglingStudents.push({
            _id: student._id,
            name: student.name || student.full_name,
            average_grade: Math.round(averageGrade * 100) / 100,
            letter_grade: gradeList[0].letter, // Most recent letter grade
            failing_percentage: Math.round(failingPercentage),
            grade_count: gradeList.length
          });
        }
      }
    });

    // Calculate attendance based on actual enrollment and class data
    let attendanceRate = 0;
    if (totalStudents > 0 && classes.length > 0) {
      // Since there's no actual attendance tracking yet, we'll calculate based on enrollment
      // For now, we'll use a realistic calculation based on course engagement
      const totalPossibleAttendance = totalStudents * classes.length;
      const estimatedAttendance = Math.min(totalStudents * classes.length * 0.85, totalPossibleAttendance);
      attendanceRate = totalPossibleAttendance > 0 ? Math.round((estimatedAttendance / totalPossibleAttendance) * 100) : 0;
    } else if (totalStudents === 0) {
      // No students enrolled yet
      attendanceRate = 0;
    } else {
      // No classes scheduled yet
      attendanceRate = 0;
    }

    // Calculate workload statistics
    const totalExams = await Exam.find({ course_id: { $in: courseIds }, is_active: true });
    const totalClasses = classes.length;

    // Get recent activity items
    const recentActivity = [];
    
    // Add recent submissions
    if (recentSubmissions.length > 0) {
      recentActivity.push({
        type: 'submission',
        message: `${recentSubmissions.length} new homework submissions`,
        timestamp: new Date(),
        count: recentSubmissions.length
      });
    }

    // Add recent student homework that needs verification
    const unverifiedStudentHomework = await StudentHomework.find({
      course_id: { $in: courseIds },
      deadline_verification_status: 'pending',
      uploader_role: 'student'
    }).populate('course_id', 'course_name course_code').limit(3);

    if (unverifiedStudentHomework.length > 0) {
      recentActivity.push({
        type: 'verification',
        message: `${unverifiedStudentHomework.length} homework deadlines need verification`,
        timestamp: new Date(),
        count: unverifiedStudentHomework.length
      });
    }

    // Add recent grading activity from BOTH homework tables
    const allHomeworkIdsForGrading = [...traditionalHomeworkIds, ...studentHomeworkIds];
    const recentGrading = await Grade.find({
      homework_id: { $in: allHomeworkIdsForGrading },
      graded_at: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    })
    .populate('homework_id', 'title')
    .populate('student_id', 'name')
    .sort({ graded_at: -1 })
    .limit(5);

    if (recentGrading.length > 0) {
      recentActivity.push({
        type: 'grading',
        message: `${recentGrading.length} homework assignments graded`,
        timestamp: new Date(),
        count: recentGrading.length
      });
    }

    // Add recent homework assignments (last 7 days) from BOTH tables
    const recentTraditionalHomework = await Homework.find({
      course_id: { $in: courseIds },
      created_at: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
      is_active: true
    }).populate('course_id', 'course_name course_code').sort({ created_at: -1 }).limit(5);

    const recentStudentHomework = await StudentHomework.find({
      course_id: { $in: courseIds },
      created_at: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
      uploader_role: 'student' // Student-created homework that needs verification
    }).populate('course_id', 'course_name course_code').sort({ created_at: -1 }).limit(5);

    // Combine both types
    const allRecentHomework = [
      ...recentTraditionalHomework.map(hw => ({
        title: hw.title,
        course: hw.course_id.course_name,
        timestamp: hw.created_at,
        type: 'traditional'
      })),
      ...recentStudentHomework.map(hw => ({
        title: hw.title,
        course: hw.course_id.course_name,
        timestamp: hw.created_at,
        type: 'student_homework'
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5);

    if (allRecentHomework.length > 0) {
      recentActivity.push({
        type: 'assignment',
        message: `${allRecentHomework.length} new homework assignments created`,
        timestamp: allRecentHomework[0].timestamp,
        count: allRecentHomework.length,
        homework: allRecentHomework.map(hw => ({
          title: hw.title,
          course: hw.course
        }))
      });
    }

    // Add overdue homework notifications from BOTH tables
    // Use start of today - anything before today is overdue
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    
    console.log('=== OVERDUE HOMEWORK DEBUG - QUERY ===');
    console.log('Current time:', now);
    console.log('Start of today (cutoff):', startOfToday);
    console.log('Course IDs:', courseIds);
    
    const overdueTraditionalHomework = await Homework.find({
      course_id: { $in: courseIds },
      due_date: { $lt: startOfToday },
      is_active: true
    }).populate('course_id', 'course_name course_code').sort({ due_date: -1 });

    const overdueStudentHomework = await StudentHomework.find({
      course_id: { $in: courseIds },
      claimed_deadline: { $lt: startOfToday }
      // Removed completion_status filter - show ALL overdue homework regardless of status
    }).populate('course_id', 'course_name course_code').sort({ claimed_deadline: -1 });

    const allOverdueHomework = [
      ...overdueTraditionalHomework.map(hw => ({
        title: hw.title,
        course: hw.course_id.course_name,
        due_date: hw.due_date,
        type: 'traditional',
        _id: hw._id
      })),
      ...overdueStudentHomework.map(hw => ({
        title: hw.title,
        course: hw.course_id.course_name,
        due_date: hw.claimed_deadline,
        type: 'student',
        _id: hw._id
      }))
    ];

    console.log('=== OVERDUE HOMEWORK DEBUG - RESULTS ===');
    console.log('Traditional overdue count:', overdueTraditionalHomework.length);
    console.log('Student overdue count:', overdueStudentHomework.length);
    console.log('Total overdue count:', allOverdueHomework.length);
    console.log('Traditional overdue homework:', overdueTraditionalHomework.map(hw => ({ 
      id: hw._id.toString(),
      title: hw.title, 
      due_date: hw.due_date,
      course: hw.course_id.course_name
    })));
    console.log('Student overdue homework:', overdueStudentHomework.map(hw => ({ 
      id: hw._id.toString(),
      title: hw.title, 
      due_date: hw.claimed_deadline,
      course: hw.course_id.course_name
    })));
    console.log('=== END OVERDUE HOMEWORK DEBUG ===');

    if (allOverdueHomework.length > 0) {
      recentActivity.push({
        type: 'overdue',
        message: `${allOverdueHomework.length} homework assignment${allOverdueHomework.length > 1 ? 's are' : ' is'} overdue`,
        timestamp: new Date(),
        count: allOverdueHomework.length,
        homework: allOverdueHomework.slice(0, 10) // Show top 10 in details
      });
    }

    // Add upcoming homework due soon (next 3 days) from BOTH tables
    const upcomingDue = new Date();
    upcomingDue.setDate(upcomingDue.getDate() + 3);
    
    const upcomingTraditionalHomework = await Homework.find({
      course_id: { $in: courseIds },
      due_date: { $gte: new Date(), $lte: upcomingDue },
      is_active: true
    }).populate('course_id', 'course_name course_code').sort({ due_date: 1 }).limit(3);

    const upcomingStudentHomework = await StudentHomework.find({
      course_id: { $in: courseIds },
      claimed_deadline: { $gte: new Date(), $lte: upcomingDue },
      completion_status: { $ne: 'completed' }
    }).populate('course_id', 'course_name course_code').sort({ claimed_deadline: 1 }).limit(3);

    const allUpcomingHomework = [
      ...upcomingTraditionalHomework.map(hw => ({
        title: hw.title,
        course: hw.course_id.course_name,
        due_date: hw.due_date,
        type: 'traditional'
      })),
      ...upcomingStudentHomework.map(hw => ({
        title: hw.title,
        course: hw.course_id.course_name,
        due_date: hw.claimed_deadline,
        type: 'student'
      }))
    ].sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

    if (allUpcomingHomework.length > 0) {
      recentActivity.push({
        type: 'upcoming',
        message: `${allUpcomingHomework.length} homework assignments due soon`,
        timestamp: new Date(),
        count: allUpcomingHomework.length,
        homework: allUpcomingHomework
      });
    }
    
    const overview = {
      courses: {
        total: courses.length,
        list: courses.map(course => ({
          _id: course._id,
          course_name: course.course_name,
          course_code: course.course_code,
          student_count: course.students.length,
          homework_count: course.homework ? course.homework.length : 0
        }))
      },
      students: {
        total: totalStudents
      },
      homework: {
        total: totalHomework,
        graded: gradedHomework,
        pending: pendingGrading,
        average_grade: Math.round(averageGrade * 100) / 100
      },
      workload: {
        total_courses: courses.length,
        total_classes: totalClasses,
        total_students: totalStudents,
        total_homework: totalHomework,
        total_exams: totalExams.length
      },
      classroom: {
        total_classes: classes.length,
        total_students: totalStudents,
        attendance_rate: attendanceRate
      },
      student_performance: {
        top_performers: topPerformers.slice(0, 5), // Top 5
        struggling_students: strugglingStudents.slice(0, 3), // Top 3 needing attention
        total_high_performers: topPerformers.length,
        total_struggling_students: strugglingStudents.length,
        performance_summary: {
          total_students_with_grades: Object.keys(studentGrades).length,
          average_class_performance: Math.round(averageGrade * 100) / 100,
          grade_distribution: {
            a_grades: grades.filter(g => ['A+', 'A', 'A-'].includes(g.letter_grade || g.calculateLetterGrade())).length,
            b_grades: grades.filter(g => ['B+', 'B', 'B-'].includes(g.letter_grade || g.calculateLetterGrade())).length,
            c_grades: grades.filter(g => ['C+', 'C', 'C-'].includes(g.letter_grade || g.calculateLetterGrade())).length,
            d_grades: grades.filter(g => ['D+', 'D', 'D-'].includes(g.letter_grade || g.calculateLetterGrade())).length,
            f_grades: grades.filter(g => g.letter_grade === 'F' || g.calculateLetterGrade() === 'F').length
          }
        }
      },
      recent_activity: recentActivity,
      todays_schedule: todaysClasses.map(cls => ({
        _id: cls._id,
        class_title: cls.class_title,
        course_name: cls.course_id.course_name,
        course_code: cls.course_id.course_code,
        start_time: cls.start_time,
        end_time: cls.end_time,
        location: cls.location || 'TBA'
      }))
    };
    
    res.json(overview);
  } catch (error) {
    console.error('Error fetching lecturer dashboard overview:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard overview' });
  }
});

// GET /api/lecturer-dashboard/workload-stats - Get detailed workload statistics
router.get('/workload-stats', checkJwt, extractUser, requireLecturer, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const lecturerId = user._id;
    
    // Get lecturer's courses
    const courses = await Course.find({ lecturer_id: lecturerId, is_active: true })
      .populate('students', 'name email full_name')
      .populate('homework')
      .populate('classes')
      .populate('exams');
    
    const courseIds = courses.map(course => course._id);
    
    // Get all homework for these courses from BOTH tables
    const traditionalHomework = await Homework.find({ 
      course_id: { $in: courseIds }, 
      is_active: true 
    }).populate('course_id', 'course_name course_code');
    
    const studentHomework = await StudentHomework.find({
      course_id: { $in: courseIds }
    }).populate('course_id', 'course_name course_code')
      .populate('uploaded_by', 'name email');
    
    // Convert traditional homework to match the format
    const convertedTraditionalHomework = traditionalHomework.map(hw => ({
      _id: hw._id,
      title: hw.title,
      description: hw.description,
      course_id: hw.course_id._id,
      course: {
        _id: hw.course_id._id,
        name: hw.course_id.course_name,
        code: hw.course_id.course_code
      },
      due_date: hw.due_date,
      is_active: hw.is_active,
      uploader_role: 'lecturer'
    }));
    
    // Combine both types of homework
    const allHomework = [...convertedTraditionalHomework, ...studentHomework];
    
    console.log(`Workload stats - Traditional homework: ${traditionalHomework.length}, Student homework: ${studentHomework.length}, Total: ${allHomework.length}`);
    
    // Get all grades for these homework (only traditional homework has grades in Grade table)
    const traditionalHomeworkIds = traditionalHomework.map(hw => hw._id);
    const grades = await Grade.find({ homework_id: { $in: traditionalHomeworkIds } });
    
    // Calculate late submissions from both tables
    const lateGrades = grades.filter(grade => grade.is_late === true).length;
    const lateStudentHomework = studentHomework.filter(hw => hw.is_late === true).length;
    const totalLateSubmissions = lateGrades + lateStudentHomework;
    
    // Calculate submission statistics from BOTH tables
    
    // From StudentHomework table
    const completedStudentHomework = studentHomework.filter(hw => 
      hw.completion_status === 'completed' || hw.completion_status === 'graded'
    ).length;
    const inProgressStudentHomework = studentHomework.filter(hw => 
      hw.completion_status === 'in_progress'
    ).length;
    const notStartedStudentHomework = studentHomework.filter(hw => 
      hw.completion_status === 'not_started'
    ).length;
    
    // From traditional homework (Grade table)
    // All grades represent completed homework
    const completedTraditionalHomework = grades.length;
    
    // Calculate not started traditional homework
    // For each traditional homework, check how many students haven't submitted
    let notStartedTraditionalCount = 0;
    traditionalHomework.forEach(hw => {
      const course = courses.find(c => c._id.equals(hw.course_id));
      if (course) {
        const studentsInCourse = course.students.length;
        const gradesForThisHw = grades.filter(g => g.homework_id.equals(hw._id)).length;
        notStartedTraditionalCount += (studentsInCourse - gradesForThisHw);
      }
    });
    
    // Combine statistics from both tables
    const totalCompleted = completedStudentHomework + completedTraditionalHomework;
    const totalInProgress = inProgressStudentHomework; // Only StudentHomework has in_progress
    const totalNotStarted = notStartedStudentHomework + notStartedTraditionalCount;
    const totalHomeworkInstances = studentHomework.length + 
      (courses.reduce((sum, course) => {
        const courseTraditionalHw = traditionalHomework.filter(hw => hw.course_id.equals(course._id));
        return sum + (courseTraditionalHw.length * course.students.length);
      }, 0));
    
    // Calculate course-specific statistics
    const courseStats = await Promise.all(courses.map(async (course) => {
      const courseHomework = allHomework.filter(hw => hw.course_id._id.equals(course._id));
      const courseGrades = grades.filter(grade => 
        courseHomework.some(hw => hw._id.equals(grade.homework_id))
      );
      
      // Count late submissions for this course
      const courseLateGrades = courseGrades.filter(grade => grade.is_late === true).length;
      const courseStudentHw = studentHomework.filter(hw => hw.course_id._id.equals(course._id));
      const courseLateStudentHw = courseStudentHw.filter(hw => hw.is_late === true).length;
      const courseTotalLate = courseLateGrades + courseLateStudentHw;
      
      const averageGrade = courseGrades.length > 0 
        ? courseGrades.reduce((sum, grade) => sum + grade.grade, 0) / courseGrades.length 
        : 0;
      
      const passRate = courseGrades.length > 0 
        ? (courseGrades.filter(grade => grade.grade >= 60).length / courseGrades.length) * 100 
        : 0;
      
      return {
        course_id: course._id,
        course_name: course.course_name,
        course_code: course.course_code,
        student_count: course.students.length,
        homework_count: courseHomework.length,
        average_grade: Math.round(averageGrade * 100) / 100,
        pass_rate: Math.round(passRate * 100) / 100,
        letter_grade: courseGrades.length > 0 ? getLetterGrade(averageGrade) : 'N/A',
        late_submissions: courseTotalLate
      };
    }));
    
    // Calculate overall statistics
    const totalStudents = courses.reduce((sum, course) => sum + course.students.length, 0);
    const totalHomework = allHomework.length;
    const totalGrades = grades.length;
    const overallAverage = totalGrades > 0 
      ? grades.reduce((sum, grade) => sum + grade.grade, 0) / totalGrades 
      : 0;
    const overallPassRate = totalGrades > 0 
      ? (grades.filter(grade => grade.grade >= 60).length / totalGrades) * 100 
      : 0;
    
    // Get weekly workload distribution
    const weeklyWorkload = await getWeeklyWorkload(courseIds);
    
    const workloadStats = {
      overview: {
        total_courses: courses.length,
        total_students: totalStudents,
        total_homework: totalHomework,
        total_graded: totalGrades,
        average_grade: Math.round(overallAverage * 100) / 100,
        pass_rate: Math.round(overallPassRate * 100) / 100,
        letter_grade: getLetterGrade(overallAverage),
        late_submissions: totalLateSubmissions
      },
      course_statistics: courseStats,
      weekly_workload: weeklyWorkload,
      grading_progress: {
        completed: totalGrades,
        pending: totalHomework - totalGrades,
        completion_rate: totalHomework > 0 ? Math.round((totalGrades / totalHomework) * 100) : 0
      },
      homework_status: {
        completed: totalCompleted,
        in_progress: totalInProgress,
        not_started: totalNotStarted,
        total_homework_instances: totalHomeworkInstances
      }
    };
    
    res.json(workloadStats);
  } catch (error) {
    console.error('Error fetching workload statistics:', error);
    res.status(500).json({ error: 'Failed to fetch workload statistics' });
  }
});

// GET /api/lecturer-dashboard/courses-info - Get detailed courses information
router.get('/courses-info', checkJwt, extractUser, requireLecturer, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const lecturerId = user._id;
    
    // Get lecturer's courses with all related data
    const courses = await Course.find({ lecturer_id: lecturerId, is_active: true })
      .populate('students', 'name email full_name')
      .populate({
        path: 'homework',
        match: { is_active: true },
        populate: {
          path: 'grades',
          populate: {
            path: 'student_id',
            select: 'name email full_name'
          }
        }
      })
      .populate({
        path: 'classes',
        match: { is_active: true }
      })
      .populate({
        path: 'exams',
        match: { is_active: true }
      });
    
    const courseIds = courses.map(c => c._id);
    
    // Get student homework for all courses
    const studentHomework = await StudentHomework.find({
      course_id: { $in: courseIds }
    })
    .populate('course_id', 'course_name course_code')
    .populate('uploaded_by', 'name email full_name')
    .sort({ claimed_deadline: -1 });
    
    const coursesInfo = await Promise.all(courses.map(async (course) => {
      const totalStudents = course.students.length;
      const traditionalHomework = course.homework || [];
      
      // Get student homework for this specific course
      const courseStudentHomework = studentHomework.filter(hw => 
        hw.course_id._id.equals(course._id)
      );
      
      const totalHomework = traditionalHomework.length + courseStudentHomework.length;
      const totalClasses = course.classes ? course.classes.length : 0;
      const totalExams = course.exams ? course.exams.length : 0;
      
      // Process traditional homework
      const processedTraditionalHomework = traditionalHomework.map(hw => {
        const hwGrades = hw.grades || [];
        const gradedCount = hwGrades.length;
        const avgGrade = gradedCount > 0 
          ? Math.round((hwGrades.reduce((sum, g) => sum + g.grade, 0) / gradedCount) * 100) / 100
          : null;
        
        return {
          _id: hw._id,
          title: hw.title,
          due_date: hw.due_date,
          graded_count: gradedCount,
          average_grade: avgGrade,
          type: 'traditional'
        };
      });
      
      // Process student homework - group by title and deadline to treat as single assignments
      // then count how many students completed each
      const studentHomeworkMap = new Map();
      
      courseStudentHomework.forEach(hw => {
        const key = `${hw.title}_${new Date(hw.claimed_deadline).toISOString()}`;
        
        if (!studentHomeworkMap.has(key)) {
          studentHomeworkMap.set(key, {
            _id: hw._id,
            title: hw.title,
            due_date: hw.claimed_deadline,
            completed_students: [],
            type: 'student'
          });
        }
        
        // Add student to completed list if they graded themselves
        if (hw.completion_status === 'completed' && hw.claimed_grade !== null && hw.claimed_grade !== undefined) {
          studentHomeworkMap.get(key).completed_students.push({
            student_id: hw.uploaded_by._id,
            grade: hw.claimed_grade
          });
        }
      });
      
      // Convert map to array with calculated stats
      const processedStudentHomework = Array.from(studentHomeworkMap.values()).map(hw => {
        const gradedCount = hw.completed_students.length;
        const avgGrade = gradedCount > 0
          ? Math.round((hw.completed_students.reduce((sum, s) => sum + s.grade, 0) / gradedCount) * 100) / 100
          : null;
        
        return {
          _id: hw._id,
          title: hw.title,
          due_date: hw.due_date,
          graded_count: gradedCount,
          average_grade: avgGrade,
          type: 'student'
        };
      });
      
      // Combine both types of homework
      const allHomework = [...processedTraditionalHomework, ...processedStudentHomework]
        .sort((a, b) => new Date(b.due_date) - new Date(a.due_date));
      
      // Calculate homework status statistics for this course
      // From StudentHomework
      const completedStudentHw = courseStudentHomework.filter(hw => 
        hw.completion_status === 'completed' || hw.completion_status === 'graded'
      ).length;
      const inProgressStudentHw = courseStudentHomework.filter(hw => 
        hw.completion_status === 'in_progress'
      ).length;
      const notStartedStudentHw = courseStudentHomework.filter(hw => 
        hw.completion_status === 'not_started'
      ).length;
      
      // From traditional homework (via grades)
      const traditionalHomeworkIds = traditionalHomework.map(hw => hw._id);
      const courseGrades = await Grade.find({ 
        homework_id: { $in: traditionalHomeworkIds } 
      });
      const completedTraditionalHw = courseGrades.length;
      
      // Calculate not started traditional homework
      let notStartedTraditionalHw = 0;
      traditionalHomework.forEach(hw => {
        const gradesForThisHw = (hw.grades || []).length;
        notStartedTraditionalHw += (totalStudents - gradesForThisHw);
      });
      
      // Combine
      const totalCompletedStatus = completedStudentHw + completedTraditionalHw;
      const totalInProgressStatus = inProgressStudentHw;
      const totalNotStartedStatus = notStartedStudentHw + notStartedTraditionalHw;
      
      return {
        _id: course._id,
        course_name: course.course_name,
        course_code: course.course_code,
        description: course.description,
        credits: course.credits,
        semester: course.semester,
        year: course.year,
        students: course.students.map(student => ({
          _id: student._id,
          name: student.name || student.full_name,
          email: student.email
        })),
        statistics: {
          student_count: totalStudents,
          homework_count: totalHomework,
          class_count: totalClasses,
          exam_count: totalExams,
          homework_status: {
            completed: totalCompletedStatus,
            in_progress: totalInProgressStatus,
            not_started: totalNotStartedStatus
          }
        },
        recent_homework: allHomework
      };
    }));
    
    res.json(coursesInfo);
  } catch (error) {
    console.error('Error fetching courses info:', error);
    res.status(500).json({ error: 'Failed to fetch courses info' });
  }
});

// GET /api/lecturer-dashboard/homework-checker - Get homework for grading
router.get('/homework-checker', checkJwt, extractUser, requireLecturer, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const { status = 'pending', course_id } = req.query;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const lecturerId = user._id;
    
    // Get lecturer's courses
    const courses = await Course.find({ lecturer_id: lecturerId, is_active: true });
    const courseIds = courses.map(course => course._id);
    
    // Build filter for homework
    let filter = { 
      course_id: { $in: courseIds }, 
      is_active: true 
    };
    
    if (course_id) {
      filter.course_id = course_id;
    }
    
    // Get homework with submission status from BOTH tables
    const traditionalHomework = await Homework.find(filter)
      .populate('course_id', 'course_name course_code')
      .populate({
        path: 'grades',
        populate: {
          path: 'student_id',
          select: 'name email full_name'
        }
      })
      .sort({ due_date: 1 });
    
    const studentHomework = await StudentHomework.find({
      course_id: { $in: courseIds }
    })
      .populate('course_id', 'course_name course_code')
      .populate('uploaded_by', 'name email')
      .sort({ claimed_deadline: 1 });
    
    // Convert student homework to match traditional format for processing
    const convertedStudentHomework = studentHomework.map(hw => ({
      _id: hw._id,
      title: hw.title,
      description: hw.description,
      course_id: hw.course_id._id,
      course: {
        _id: hw.course_id._id,
        name: hw.course_id.course_name,
        code: hw.course_id.course_code
      },
      due_date: hw.claimed_deadline,
      is_active: true,
      grades: [], // Student homework doesn't have grades in the traditional sense
      uploader_role: hw.uploader_role
    }));
    
    // Combine both types
    const allHomework = [...traditionalHomework, ...convertedStudentHomework];
    
    console.log(`Homework checker - Traditional: ${traditionalHomework.length}, Student: ${studentHomework.length}, Total: ${allHomework.length}`);
    
    // Process homework based on status
    const processedHomework = allHomework.map(hw => {
      const submissions = hw.grades || [];
      const totalStudents = courses.find(c => c._id.equals(hw.course_id._id))?.students?.length || 0;
      const submittedCount = submissions.length;
      const gradedCount = submissions.filter(sub => sub.grade !== null).length;
      const pendingCount = submittedCount - gradedCount;
      
      let homeworkStatus = 'pending';
      if (submittedCount === 0) {
        homeworkStatus = 'no_submissions';
      } else if (gradedCount === submittedCount) {
        homeworkStatus = 'fully_graded';
      } else if (gradedCount > 0) {
        homeworkStatus = 'partially_graded';
      }
      
      return {
        _id: hw._id,
        title: hw.title,
        description: hw.description,
        due_date: hw.due_date,
        assigned_date: hw.assigned_date,
        points_possible: hw.points_possible,
        course: {
          _id: hw.course_id._id,
          name: hw.course_id.course_name,
          code: hw.course_id.course_code
        },
        statistics: {
          total_students: totalStudents,
          submitted: submittedCount,
          graded: gradedCount,
          pending: pendingCount,
          submission_rate: totalStudents > 0 ? Math.round((submittedCount / totalStudents) * 100) : 0
        },
        status: homeworkStatus,
        is_overdue: new Date() > hw.due_date,
        days_until_due: Math.floor((new Date(hw.due_date) - new Date()) / (1000 * 60 * 60 * 24))
      };
    });
    
    // Filter based on status
    let filteredHomework = processedHomework;
    if (status === 'pending') {
      filteredHomework = processedHomework.filter(hw => 
        hw.status === 'pending' || hw.status === 'partially_graded'
      );
    } else if (status === 'overdue') {
      filteredHomework = processedHomework.filter(hw => hw.is_overdue);
    } else if (status === 'all') {
      filteredHomework = processedHomework;
    }
    
    // Get grading progress summary
    const totalHomework = processedHomework.length;
    const fullyGraded = processedHomework.filter(hw => hw.status === 'fully_graded').length;
    const partiallyGraded = processedHomework.filter(hw => hw.status === 'partially_graded').length;
    const pendingGrading = processedHomework.filter(hw => hw.status === 'pending').length;
    
    const gradingProgress = {
      total: totalHomework,
      fully_graded: fullyGraded,
      partially_graded: partiallyGraded,
      pending: pendingGrading,
      completion_rate: totalHomework > 0 ? Math.round((fullyGraded / totalHomework) * 100) : 0
    };
    
    res.json({
      homework: filteredHomework,
      grading_progress: gradingProgress,
      courses: courses.map(course => ({
        _id: course._id,
        name: course.course_name,
        code: course.course_code
      }))
    });
  } catch (error) {
    console.error('Error fetching homework checker data:', error);
    res.status(500).json({ error: 'Failed to fetch homework checker data' });
  }
});

// Helper function to get letter grade
function getLetterGrade(numericGrade) {
  if (numericGrade >= 97) return 'A+';
  if (numericGrade >= 93) return 'A';
  if (numericGrade >= 90) return 'A-';
  if (numericGrade >= 87) return 'B+';
  if (numericGrade >= 83) return 'B';
  if (numericGrade >= 80) return 'B-';
  if (numericGrade >= 77) return 'C+';
  if (numericGrade >= 73) return 'C';
  if (numericGrade >= 70) return 'C-';
  if (numericGrade >= 67) return 'D+';
  if (numericGrade >= 63) return 'D';
  if (numericGrade >= 60) return 'D-';
  return 'F';
}

// Helper function to get weekly workload
async function getWeeklyWorkload(courseIds) {
  const now = new Date();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  // Query both homework tables
  const traditionalHomework = await Homework.find({
    course_id: { $in: courseIds },
    due_date: { $gte: weekStart, $lte: weekEnd },
    is_active: true
  }).populate('course_id', 'course_name');
  
  const studentHomework = await StudentHomework.find({
    course_id: { $in: courseIds },
    claimed_deadline: { $gte: weekStart, $lte: weekEnd }
  }).populate('course_id', 'course_name');
  
  // Convert traditional homework to match format
  const convertedTraditionalHomework = traditionalHomework.map(hw => ({
    _id: hw._id,
    title: hw.title,
    course: hw.course_id.course_name,
    due_date: hw.due_date
  }));
  
  // Convert student homework to match format
  const convertedStudentHomework = studentHomework.map(hw => ({
    _id: hw._id,
    title: hw.title,
    course: hw.course_id.course_name,
    due_date: hw.claimed_deadline
  }));
  
  // Combine both types
  const allHomework = [...convertedTraditionalHomework, ...convertedStudentHomework];
  
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const workload = days.map(day => ({
    day,
    homework_count: 0,
    homework: []
  }));
  
  allHomework.forEach(hw => {
    const dayIndex = new Date(hw.due_date).getDay();
    workload[dayIndex].homework_count++;
    workload[dayIndex].homework.push(hw);
  });
  
  return workload;
}

// GET /api/lecturer-dashboard/student-course-workload/:courseId - Get workload of students from a specific course
router.get('/student-course-workload/:courseId', checkJwt, extractUser, requireLecturer, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const { courseId } = req.params;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const lecturerId = user._id;
    
    // Get the selected course and verify lecturer teaches it
    const course = await Course.findOne({ 
      _id: courseId, 
      lecturer_id: lecturerId,
      is_active: true 
    }).populate('students', 'name email full_name');
    
    if (!course) {
      return res.status(404).json({ error: 'Course not found or you do not have access' });
    }
    
    const studentIds = course.students.map(s => s._id);
    
    // Get all courses these students are enrolled in
    const studentCourses = await Course.find({
      students: { $in: studentIds },
      is_active: true
    }).populate('lecturer_id', 'name email full_name');
    
    const studentCourseIds = studentCourses.map(c => c._id);
    
    // Get homework from BOTH tables for all these courses
    const traditionalHomework = await Homework.find({
      course_id: { $in: studentCourseIds },
      is_active: true
    })
    .populate('course_id', 'course_name course_code')
    .sort({ due_date: 1 });
    
    const studentHomework = await StudentHomework.find({
      course_id: { $in: studentCourseIds }
    })
    .populate('course_id', 'course_name course_code')
    .populate('uploaded_by', 'name email')
    .sort({ claimed_deadline: 1 });
    
    // Convert to common format
    const convertedTraditionalHomework = traditionalHomework.map(hw => ({
      _id: hw._id,
      title: hw.title,
      due_date: hw.due_date,
      course: {
        _id: hw.course_id._id,
        name: hw.course_id.course_name,
        code: hw.course_id.course_code
      },
      type: 'traditional'
    }));
    
    const convertedStudentHomework = studentHomework.map(hw => ({
      _id: hw._id,
      title: hw.title,
      due_date: hw.claimed_deadline,
      course: {
        _id: hw.course_id._id,
        name: hw.course_id.course_name,
        code: hw.course_id.course_code
      },
      type: 'student'
    }));
    
    const allHomework = [...convertedTraditionalHomework, ...convertedStudentHomework];
    
    // Group homework by course
    const courseWorkloadMap = new Map();
    
    studentCourses.forEach(c => {
      courseWorkloadMap.set(c._id.toString(), {
        course_id: c._id,
        course_name: c.course_name,
        course_code: c.course_code,
        lecturer: c.lecturer_id ? {
          name: c.lecturer_id.name || c.lecturer_id.full_name,
          email: c.lecturer_id.email
        } : null,
        homework: [],
        total_assignments: 0,
        upcoming_week: 0,
        upcoming_month: 0
      });
    });
    
    // Get date ranges
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    // Categorize homework by course
    allHomework.forEach(hw => {
      const courseKey = hw.course._id.toString();
      const courseData = courseWorkloadMap.get(courseKey);
      
      if (courseData) {
        courseData.homework.push(hw);
        courseData.total_assignments++;
        
        const dueDate = new Date(hw.due_date);
        if (dueDate >= now && dueDate <= weekFromNow) {
          courseData.upcoming_week++;
        }
        if (dueDate >= now && dueDate <= monthFromNow) {
          courseData.upcoming_month++;
        }
      }
    });
    
    const courseWorkloads = Array.from(courseWorkloadMap.values())
      .sort((a, b) => b.upcoming_week - a.upcoming_week); // Sort by most busy first
    
    res.json({
      course: {
        _id: course._id,
        name: course.course_name,
        code: course.course_code,
        student_count: studentIds.length
      },
      student_workload: courseWorkloads
    });
  } catch (error) {
    console.error('Error fetching student course workload:', error);
    res.status(500).json({ error: 'Failed to fetch student course workload' });
  }
});

module.exports = router;
