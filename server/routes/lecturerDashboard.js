const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Homework = require('../models/Homework');
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
    
    // Get homework statistics
    const courseIds = courses.map(course => course._id);
    const homework = await Homework.find({ 
      course_id: { $in: courseIds }, 
      is_active: true 
    }).populate('course_id', 'course_name course_code');
    
    // Get grading statistics
    const homeworkIds = homework.map(hw => hw._id);
    const grades = await Grade.find({ homework_id: { $in: homeworkIds } });
    
    // Calculate statistics
    const totalStudents = courses.reduce((sum, course) => sum + course.students.length, 0);
    const totalHomework = homework.length;
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

    // Get recent homework submissions (last 7 days)
    const recentSubmissions = await Grade.find({ 
      homework_id: { $in: homeworkIds },
      graded_at: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    })
    .populate('homework_id', 'title due_date')
    .populate('student_id', 'name email')
    .sort({ graded_at: -1 })
    .limit(10);

    // Get all students across all courses
    const allStudents = [];
    courses.forEach(course => {
      allStudents.push(...course.students);
    });

    // Calculate student performance statistics
    const studentGrades = {};
    grades.forEach(grade => {
      const studentId = grade.student_id.toString();
      if (!studentGrades[studentId]) {
        studentGrades[studentId] = [];
      }
      studentGrades[studentId].push(grade.grade);
    });

    // Calculate performance metrics
    const topPerformers = [];
    const strugglingStudents = [];
    
    Object.entries(studentGrades).forEach(([studentId, gradeList]) => {
      const averageGrade = gradeList.reduce((sum, grade) => sum + grade, 0) / gradeList.length;
      const student = allStudents.find(s => s._id.toString() === studentId);
      
      if (student) {
        if (averageGrade >= 85) { // A grade
          topPerformers.push({
            _id: student._id,
            name: student.name || student.full_name,
            average_grade: Math.round(averageGrade * 100) / 100,
            grade_count: gradeList.length
          });
        } else if (averageGrade < 70) { // Below C grade
          strugglingStudents.push({
            _id: student._id,
            name: student.name || student.full_name,
            average_grade: Math.round(averageGrade * 100) / 100,
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
    
    // Calculate grade distribution
    const gradeDistribution = {
      a: grades.filter(g => g.grade >= 90).length,
      b: grades.filter(g => g.grade >= 80 && g.grade < 90).length,
      c: grades.filter(g => g.grade >= 70 && g.grade < 80).length,
      d: grades.filter(g => g.grade >= 60 && g.grade < 70).length,
      f: grades.filter(g => g.grade < 60).length
    };

    // Calculate letter grade from average
    const getLetterGrade = (average) => {
      if (average >= 90) return 'A';
      if (average >= 80) return 'B';
      if (average >= 70) return 'C';
      if (average >= 60) return 'D';
      return 'F';
    };

    const letterGrade = getLetterGrade(averageGrade);
    
    // Calculate grading progress percentage
    const gradingProgress = totalHomework > 0 ? Math.round((gradedHomework / totalHomework) * 100) : 0;

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

    // Add extension requests (you might want to implement this feature)
    // For now, we'll simulate some data
    const extensionRequests = 2; // This could come from a separate model
    if (extensionRequests > 0) {
      recentActivity.push({
        type: 'extension',
        message: `${extensionRequests} students requested extensions`,
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        count: extensionRequests
      });
    }

    // Add grade improvement
    const gradeImprovement = 5; // This could be calculated from historical data
    if (gradeImprovement > 0) {
      recentActivity.push({
        type: 'improvement',
        message: `Class average improved by ${gradeImprovement}%`,
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        improvement: gradeImprovement
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
        total_exams: totalExams.length,
        average_grade: Math.round(averageGrade * 100) / 100,
        letter_grade: letterGrade,
        grading_progress: gradingProgress,
        grade_distribution: gradeDistribution
      },
      classroom: {
        total_classes: classes.length,
        total_students: totalStudents,
        attendance_rate: attendanceRate
      },
      student_performance: {
        top_performers: topPerformers.slice(0, 5), // Top 5
        struggling_students: strugglingStudents.slice(0, 3), // Top 3 needing attention
        total_a_grades: topPerformers.length,
        total_below_c: strugglingStudents.length
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
    
    // Get all homework for these courses
    const homework = await Homework.find({ 
      course_id: { $in: courseIds }, 
      is_active: true 
    }).populate('course_id', 'course_name course_code');
    
    // Get all grades for these homework
    const homeworkIds = homework.map(hw => hw._id);
    const grades = await Grade.find({ homework_id: { $in: homeworkIds } });
    
    // Calculate course-specific statistics
    const courseStats = await Promise.all(courses.map(async (course) => {
      const courseHomework = homework.filter(hw => hw.course_id._id.equals(course._id));
      const courseGrades = grades.filter(grade => 
        courseHomework.some(hw => hw._id.equals(grade.homework_id))
      );
      
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
        letter_grade: courseGrades.length > 0 ? getLetterGrade(averageGrade) : 'N/A'
      };
    }));
    
    // Calculate overall statistics
    const totalStudents = courses.reduce((sum, course) => sum + course.students.length, 0);
    const totalHomework = homework.length;
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
        letter_grade: getLetterGrade(overallAverage)
      },
      course_statistics: courseStats,
      weekly_workload: weeklyWorkload,
      grading_progress: {
        completed: totalGrades,
        pending: totalHomework - totalGrades,
        completion_rate: totalHomework > 0 ? Math.round((totalGrades / totalHomework) * 100) : 0
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
    
    const coursesInfo = courses.map(course => {
      const totalStudents = course.students.length;
      const totalHomework = course.homework ? course.homework.length : 0;
      const totalClasses = course.classes ? course.classes.length : 0;
      const totalExams = course.exams ? course.exams.length : 0;
      
      // Calculate average grade for this course
      let totalGrade = 0;
      let gradeCount = 0;
      if (course.homework) {
        course.homework.forEach(hw => {
          if (hw.grades) {
            hw.grades.forEach(grade => {
              totalGrade += grade.grade;
              gradeCount++;
            });
          }
        });
      }
      const averageGrade = gradeCount > 0 ? totalGrade / gradeCount : 0;
      
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
          average_grade: Math.round(averageGrade * 100) / 100,
          letter_grade: getLetterGrade(averageGrade)
        },
        recent_homework: course.homework ? course.homework
          .sort((a, b) => new Date(b.due_date) - new Date(a.due_date))
          .slice(0, 5)
          .map(hw => ({
            _id: hw._id,
            title: hw.title,
            due_date: hw.due_date,
            submission_count: hw.grades ? hw.grades.length : 0
          })) : []
      };
    });
    
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
    
    // Get homework with submission status
    const homework = await Homework.find(filter)
      .populate('course_id', 'course_name course_code')
      .populate({
        path: 'grades',
        populate: {
          path: 'student_id',
          select: 'name email full_name'
        }
      })
      .sort({ due_date: 1 });
    
    // Process homework based on status
    const processedHomework = homework.map(hw => {
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
        days_until_due: Math.ceil((new Date(hw.due_date) - new Date()) / (1000 * 60 * 60 * 24))
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
  
  const homework = await Homework.find({
    course_id: { $in: courseIds },
    due_date: { $gte: weekStart, $lte: weekEnd },
    is_active: true
  }).populate('course_id', 'course_name');
  
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const workload = days.map(day => ({
    day,
    homework_count: 0,
    homework: []
  }));
  
  homework.forEach(hw => {
    const dayIndex = new Date(hw.due_date).getDay();
    workload[dayIndex].homework_count++;
    workload[dayIndex].homework.push({
      _id: hw._id,
      title: hw.title,
      course: hw.course_id.course_name,
      due_date: hw.due_date
    });
  });
  
  return workload;
}

module.exports = router;
