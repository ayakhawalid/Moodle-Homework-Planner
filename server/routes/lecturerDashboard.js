const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Homework = require('../models/Homework');
const StudentHomework = require('../models/StudentHomework');
const Grade = require('../models/Grade');
const User = require('../models/User');
const Class = require('../models/Class');
const Exam = require('../models/Exam');
const Partner = require('../models/Partner');
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
    const allHomeworkIds = allHomework.map(hw => hw._id);
    
    // Calculate statistics
    const totalStudents = courses.reduce((sum, course) => sum + course.students.length, 0);
    const totalHomework = allHomework.length;
    const totalClasses = courses.reduce((sum, course) => sum + course.classes.length, 0);
    const totalExams = courses.reduce((sum, course) => sum + course.exams.length, 0);
    
    // Calculate upcoming deadlines (next 7 days)
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const upcomingDeadlines = allHomework.filter(hw => {
      const deadline = hw.due_date || hw.claimed_deadline;
      return deadline && deadline >= now && deadline <= nextWeek;
    }).length;
    
    // Calculate overdue homework
    const overdueHomework = allHomework.filter(hw => {
      const deadline = hw.due_date || hw.claimed_deadline;
      return deadline && deadline < now;
    }).length;
    
    // Build recent activity (last updates across homework and grades)
    const recentTraditional = await Homework.find({ course_id: { $in: courseIds } })
      .populate('course_id', 'course_name')
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean();

    const recentStudentCreated = await StudentHomework.find({ course_id: { $in: courseIds } })
      .populate('course_id', 'course_name')
      .populate('uploaded_by', 'name email')
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean();

    const recent_activity = [
      ...recentTraditional.map(hw => ({
        type: 'homework_updated',
        timestamp: hw.updatedAt || hw.createdAt,
        message: `Homework updated: ${hw.title} (${hw.course_id?.course_name || 'Unknown Course'})`,
      })),
      ...recentStudentCreated.map(hw => ({
        type: 'student_homework_updated',
        timestamp: hw.updatedAt || hw.createdAt,
        message: `Student homework updated: ${hw.title || 'Untitled'} (${hw.course_id?.course_name || 'Unknown Course'})` + (hw.uploaded_by ? ` by ${hw.uploaded_by.name || hw.uploaded_by.email}` : ''),
      }))
    ]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10);
    
    res.json({
      courses: courses.map(course => ({
        _id: course._id,
        course_name: course.course_name,
        course_code: course.course_code,
        student_count: course.students.length,
        homework_count: course.homework.length,
        class_count: course.classes.length,
        exam_count: course.exams.length
      })),
      statistics: {
        total_courses: courses.length,
        total_students: totalStudents,
        total_homework: totalHomework,
        total_classes: totalClasses,
        total_exams: totalExams,
        upcoming_deadlines: upcomingDeadlines,
        overdue_homework: overdueHomework
      },
      recent_activity
    });
  } catch (error) {
    console.error('Error fetching lecturer dashboard overview:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard overview' });
  }
});

// GET /api/lecturer-dashboard/homework-status/:courseId - Get detailed homework status breakdown for a course
router.get('/homework-status/:courseId', checkJwt, extractUser, requireLecturer, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const { courseId } = req.params;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const lecturerId = user._id;
    
    // Verify the lecturer teaches this course
    const course = await Course.findOne({ 
      _id: courseId, 
      lecturer_id: lecturerId, 
      is_active: true 
    }).populate('students', 'name email full_name');
    
    if (!course) {
      return res.status(404).json({ error: 'Course not found or access denied' });
    }
    
    const studentIds = course.students.map(student => student._id);
    
    // Get traditional homework for this course
    const traditionalHomework = await Homework.find({ 
      course_id: courseId, 
      is_active: true 
    }).populate('course_id', 'course_name course_code');
    
    // Get student homework for this course
    const studentHomework = await StudentHomework.find({
      course_id: courseId
    }).populate('course_id', 'course_name course_code')
      .populate('uploaded_by', 'name email');
    
    // Get all grades for this course's homework
    const traditionalHomeworkIds = traditionalHomework.map(hw => hw._id);
    const studentHomeworkIds = studentHomework.map(hw => hw._id);
    const allHomeworkIds = [...traditionalHomeworkIds, ...studentHomeworkIds];
    
    const grades = await Grade.find({ 
      homework_id: { $in: allHomeworkIds },
      student_id: { $in: studentIds }
    }).populate('student_id', 'name email');
    
    // Process traditional homework status using Grade table
    const traditionalHomeworkStatus = traditionalHomework.map(hw => {
      const homeworkGrades = grades.filter(grade => 
        grade.homework_id && 
        grade.homework_id.toString() === hw._id.toString()
      );
      
      const statusCounts = {
        not_started: 0,
        in_progress: 0,
        completed: 0,
        graded: 0
      };
      
      // Count students by completion status from Grade table
      homeworkGrades.forEach(grade => {
        if (grade.completion_status && statusCounts.hasOwnProperty(grade.completion_status)) {
          statusCounts[grade.completion_status]++;
        }
      });

      // Derive not_started as students without any grade record/status
      const recorded = statusCounts.in_progress + statusCounts.completed + statusCounts.graded;
      statusCounts.not_started = Math.max(0, studentIds.length - recorded);
      
      // Calculate average grade for graded homework
      let averageGrade = null;
      const gradedGrades = homeworkGrades.filter(grade => grade.completion_status === 'graded' && grade.grade);
      if (gradedGrades.length > 0) {
        averageGrade = gradedGrades.reduce((sum, grade) => sum + grade.grade, 0) / gradedGrades.length;
      }
      
      return {
        _id: hw._id,
        title: hw.title,
        description: hw.description,
        due_date: hw.due_date,
        course: hw.course_id,
        homework_type: 'traditional',
        status_counts: statusCounts,
        average_grade: averageGrade,
        total_students: studentIds.length
      };
    });
    
    // Process student homework status using Grade table
    const studentHomeworkStatus = studentHomework.map(hw => {
      const homeworkGrades = grades.filter(grade => 
        grade.homework_id && 
        grade.homework_id.toString() === hw._id.toString()
      );
      
      const statusCounts = {
        not_started: 0,
        in_progress: 0,
        completed: 0,
        graded: 0
      };
      
      // Count students by completion status from Grade table
      homeworkGrades.forEach(grade => {
        if (grade.completion_status && statusCounts.hasOwnProperty(grade.completion_status)) {
          statusCounts[grade.completion_status]++;
        }
      });

      // Derive not_started as students without any grade record/status
      const recorded = statusCounts.in_progress + statusCounts.completed + statusCounts.graded;
      statusCounts.not_started = Math.max(0, studentIds.length - recorded);
      
      // Calculate average grade for graded homework
      let averageGrade = null;
      const gradedGrades = homeworkGrades.filter(grade => grade.completion_status === 'graded' && grade.grade);
      if (gradedGrades.length > 0) {
        averageGrade = gradedGrades.reduce((sum, grade) => sum + grade.grade, 0) / gradedGrades.length;
      }
      
      return {
        _id: hw._id,
        title: hw.title,
        description: hw.description,
        claimed_deadline: hw.claimed_deadline,
        course: hw.course_id,
        uploaded_by: hw.uploaded_by,
        homework_type: 'student',
        status_counts: statusCounts,
        average_grade: averageGrade,
        total_students: studentIds.length
      };
    });
    
    // Combine both types
    const allHomeworkStatus = [...traditionalHomeworkStatus, ...studentHomeworkStatus];
    
    // Calculate overall statistics
    const totalHomework = allHomeworkStatus.length;
    const totalGraded = allHomeworkStatus.reduce((sum, hw) => sum + (hw.status_counts?.graded || 0), 0);
    const totalNotGraded = allHomeworkStatus.reduce((sum, hw) => sum + (hw.status_counts?.completed || 0), 0);

    // Calculate overall average grade from graded entries
    const allGradedAverages = allHomeworkStatus
      .map(hw => hw.average_grade)
      .filter(v => typeof v === 'number');
    const averageGrade = allGradedAverages.length > 0
      ? (allGradedAverages.reduce((s, v) => s + v, 0) / allGradedAverages.length)
      : null;
    
    res.json({
      course: {
        _id: course._id,
        course_name: course.course_name,
        course_code: course.course_code,
        student_count: course.students.length
      },
      homework_status: allHomeworkStatus,
      overall_stats: {
        total_homework: totalHomework,
        total_graded: totalGraded,
        total_not_graded: totalNotGraded,
        average_grade: averageGrade
      }
    });
  } catch (error) {
    console.error('Error fetching homework status:', error);
    res.status(500).json({ error: 'Failed to fetch homework status' });
  }
});

// GET /api/lecturer-dashboard/homework-status-any/:courseId - Get homework status for any course (not just lecturer's courses)
router.get('/homework-status-any/:courseId', checkJwt, extractUser, requireLecturer, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const { courseId } = req.params;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    // Get the course (no lecturer verification needed)
    const course = await Course.findOne({ 
      _id: courseId, 
      is_active: true 
    }).populate('students', 'name email full_name');
    
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    const studentIds = course.students.map(student => student._id);
    
    // Get traditional homework for this course
    const traditionalHomework = await Homework.find({ 
      course_id: courseId, 
      is_active: true 
    }).populate('course_id', 'course_name course_code');
    
    // Get student homework for this course
    const studentHomework = await StudentHomework.find({
      course_id: courseId
    }).populate('course_id', 'course_name course_code')
      .populate('uploaded_by', 'name email');
    
    // Get all grades for this course's homework
    const traditionalHomeworkIds = traditionalHomework.map(hw => hw._id);
    const studentHomeworkIds = studentHomework.map(hw => hw._id);
    const allHomeworkIds = [...traditionalHomeworkIds, ...studentHomeworkIds];
    
    const grades = await Grade.find({ 
      homework_id: { $in: allHomeworkIds },
      student_id: { $in: studentIds }
    }).populate('student_id', 'name email');
    
    // Process traditional homework status using Grade table
    const traditionalHomeworkStatus = traditionalHomework.map(hw => {
      const homeworkGrades = grades.filter(grade => 
        grade.homework_id && 
        grade.homework_id.toString() === hw._id.toString()
      );
      
      const statusCounts = {
        not_started: 0,
        in_progress: 0,
        completed: 0,
        graded: 0
      };
      
      // Count students by completion status from Grade table
      homeworkGrades.forEach(grade => {
        if (grade.completion_status && statusCounts.hasOwnProperty(grade.completion_status)) {
          statusCounts[grade.completion_status]++;
        }
      });

      // Derive not_started
      const recorded = statusCounts.in_progress + statusCounts.completed + statusCounts.graded;
      statusCounts.not_started = Math.max(0, studentIds.length - recorded);
      
      // Calculate average grade for graded homework
      let averageGrade = null;
      const gradedGrades = homeworkGrades.filter(grade => grade.completion_status === 'graded' && grade.grade);
      if (gradedGrades.length > 0) {
        averageGrade = gradedGrades.reduce((sum, grade) => sum + grade.grade, 0) / gradedGrades.length;
      }
      
      return {
        _id: hw._id,
        title: hw.title,
        description: hw.description,
        due_date: hw.due_date,
        course: hw.course_id,
        homework_type: 'traditional',
        status_counts: statusCounts,
        average_grade: averageGrade,
        total_students: studentIds.length
      };
    });
    
    // Process student homework status using Grade table
    const studentHomeworkStatus = studentHomework.map(hw => {
      const homeworkGrades = grades.filter(grade => 
        grade.homework_id && 
        grade.homework_id.toString() === hw._id.toString()
      );
      
      const statusCounts = {
        not_started: 0,
        in_progress: 0,
        completed: 0,
        graded: 0
      };
      
      // Count students by completion status from Grade table
      homeworkGrades.forEach(grade => {
        if (grade.completion_status && statusCounts.hasOwnProperty(grade.completion_status)) {
          statusCounts[grade.completion_status]++;
        }
      });

      // Derive not_started
      const recorded = statusCounts.in_progress + statusCounts.completed + statusCounts.graded;
      statusCounts.not_started = Math.max(0, studentIds.length - recorded);
      
      // Calculate average grade for graded homework
      let averageGrade = null;
      const gradedGrades = homeworkGrades.filter(grade => grade.completion_status === 'graded' && grade.grade);
      if (gradedGrades.length > 0) {
        averageGrade = gradedGrades.reduce((sum, grade) => sum + grade.grade, 0) / gradedGrades.length;
      }
      
      return {
        _id: hw._id,
        title: hw.title,
        description: hw.description,
        claimed_deadline: hw.claimed_deadline,
        course: hw.course_id,
        uploaded_by: hw.uploaded_by,
        homework_type: 'student',
        status_counts: statusCounts,
        average_grade: averageGrade,
        total_students: studentIds.length
      };
    });
    
    // Combine both types
    const allHomeworkStatus = [...traditionalHomeworkStatus, ...studentHomeworkStatus];
    
    res.json({
      course: {
        _id: course._id,
        course_name: course.course_name,
        course_code: course.course_code,
        student_count: course.students.length
      },
      homework_status: allHomeworkStatus
    });
  } catch (error) {
    console.error('Error fetching homework status for any course:', error);
    res.status(500).json({ error: 'Failed to fetch homework status for any course' });
  }
});

// GET /api/lecturer-dashboard/all-homework-status - Get homework status for all lecturer's courses
router.get('/all-homework-status', checkJwt, extractUser, requireLecturer, async (req, res) => {
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
      .populate('students', 'name email full_name');
    
    const courseIds = courses.map(course => course._id);
    
    // Get traditional homework for all courses
    const traditionalHomework = await Homework.find({ 
      course_id: { $in: courseIds }, 
      is_active: true 
    }).populate('course_id', 'course_name course_code');
    
    // Get student homework for all courses
    const studentHomework = await StudentHomework.find({
      course_id: { $in: courseIds }
    }).populate('course_id', 'course_name course_code')
      .populate('uploaded_by', 'name email');
    
    // Get all grades for all homework
    const traditionalHomeworkIds = traditionalHomework.map(hw => hw._id);
    const studentHomeworkIds = studentHomework.map(hw => hw._id);
    const allHomeworkIds = [...traditionalHomeworkIds, ...studentHomeworkIds];
    
    // Get all student IDs from all courses
    const allStudentIds = courses.reduce((acc, course) => {
      return acc.concat(course.students.map(student => student._id));
    }, []);
    
    const grades = await Grade.find({ 
      homework_id: { $in: allHomeworkIds },
      student_id: { $in: allStudentIds }
    }).populate('student_id', 'name email');
    
    // Process courses with their homework status
    const coursesWithStatus = await Promise.all(courses.map(async course => {
      const courseStudentIds = course.students.map(student => student._id);
      
      // Get traditional homework for this course
      const courseTraditionalHomework = traditionalHomework.filter(hw => 
        hw.course_id._id.toString() === course._id.toString()
      );
      
      // Get student homework for this course
      const courseStudentHomework = studentHomework.filter(hw => 
        hw.course_id._id.toString() === course._id.toString()
      );
      
      // Process traditional homework status
      const traditionalHomeworkStatus = courseTraditionalHomework.map(hw => {
        const homeworkGrades = grades.filter(grade => 
          grade.homework_id && 
          grade.homework_id.toString() === hw._id.toString() &&
          grade.homework_type === 'traditional' &&
          courseStudentIds.some(studentId => studentId.toString() === grade.student_id._id.toString())
        );
        
        const statusCounts = {
          not_started: 0,
          in_progress: 0,
          completed: 0,
          graded: 0
        };
        
        // Count students by completion status from Grade table
        homeworkGrades.forEach(grade => {
          if (grade.completion_status && statusCounts.hasOwnProperty(grade.completion_status)) {
            statusCounts[grade.completion_status]++;
          }
        });

        // Derive not_started
        const recorded = statusCounts.in_progress + statusCounts.completed + statusCounts.graded;
        statusCounts.not_started = Math.max(0, courseStudentIds.length - recorded);
        
        // Calculate average grade for graded homework
        let averageGrade = null;
        const gradedGrades = homeworkGrades.filter(grade => grade.completion_status === 'graded' && grade.grade);
        if (gradedGrades.length > 0) {
          averageGrade = gradedGrades.reduce((sum, grade) => sum + grade.grade, 0) / gradedGrades.length;
        }
        
        return {
          _id: hw._id,
          title: hw.title,
          description: hw.description,
          due_date: hw.due_date,
          homework_type: 'traditional',
          status_counts: statusCounts,
          average_grade: averageGrade,
          total_students: courseStudentIds.length
        };
      });
      
      // Process student homework status
      const studentHomeworkStatus = courseStudentHomework.map(hw => {
        const homeworkGrades = grades.filter(grade => 
          grade.homework_id && 
          grade.homework_id.toString() === hw._id.toString() &&
          grade.homework_type === 'student' &&
          courseStudentIds.some(studentId => studentId.toString() === grade.student_id._id.toString())
        );
        
        const statusCounts = {
          not_started: 0,
          in_progress: 0,
          completed: 0,
          graded: 0
        };
        
        // Count students by completion status from Grade table
        homeworkGrades.forEach(grade => {
          if (grade.completion_status && statusCounts.hasOwnProperty(grade.completion_status)) {
            statusCounts[grade.completion_status]++;
          }
        });

        // Derive not_started
        const recorded = statusCounts.in_progress + statusCounts.completed + statusCounts.graded;
        statusCounts.not_started = Math.max(0, courseStudentIds.length - recorded);
        
        // Calculate average grade for graded homework
        let averageGrade = null;
        const gradedGrades = homeworkGrades.filter(grade => grade.completion_status === 'graded' && grade.grade);
        if (gradedGrades.length > 0) {
          averageGrade = gradedGrades.reduce((sum, grade) => sum + grade.grade, 0) / gradedGrades.length;
        }
        
        return {
          _id: hw._id,
          title: hw.title,
          description: hw.description,
          claimed_deadline: hw.claimed_deadline,
          uploaded_by: hw.uploaded_by,
          homework_type: 'student',
          status_counts: statusCounts,
          average_grade: averageGrade,
          total_students: courseStudentIds.length
        };
      });
      
      // Combine both types
      const allHomeworkStatus = [...traditionalHomeworkStatus, ...studentHomeworkStatus];
      
      return {
        _id: course._id,
        course_name: course.course_name,
        course_code: course.course_code,
        student_count: course.students.length,
        homework_status: allHomeworkStatus
      };
    }));
    
    res.json({
      courses: coursesWithStatus
    });
  } catch (error) {
    console.error('Error fetching all homework status:', error);
    res.status(500).json({ error: 'Failed to fetch all homework status' });
  }
});

// GET /api/lecturer-dashboard/all-homework - Get ALL homework from ALL courses in the system
router.get('/all-homework', checkJwt, extractUser, requireLecturer, async (req, res) => {
  try {
    // Get ALL traditional homework from ALL courses
    const traditionalHomework = await Homework.find({ 
      is_active: true 
    }).populate('course_id', 'course_name course_code');
    
    // Get ALL student homework from ALL courses
    const studentHomework = await StudentHomework.find({})
      .populate('course_id', 'course_name course_code')
      .populate('uploaded_by', 'name email');
    
    // Get ALL active courses
    const allCourses = await Course.find({ is_active: true })
      .select('_id course_name course_code');
    
    // Combine both types
    const allHomework = [...traditionalHomework, ...studentHomework];
    
    res.json({
      homework: allHomework,
      courses: allCourses
    });
  } catch (error) {
    console.error('Error fetching all homework:', error);
    res.status(500).json({ error: 'Failed to fetch all homework' });
  }
});

// GET /api/lecturer-dashboard/student-course-workload/:courseId - Get student workload for a specific course
router.get('/student-course-workload/:courseId', checkJwt, extractUser, requireLecturer, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const { courseId } = req.params;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    // Get the course
    const course = await Course.findOne({ 
      _id: courseId, 
      is_active: true 
    }).populate('students', 'name email full_name');
    
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    const studentIds = course.students.map(student => student._id);
    
    // Get all courses that students from the selected course are taking
    const allCourses = await Course.find({ 
      is_active: true,
      students: { $in: studentIds }
    }).select('_id course_name course_code students');
    
    // Calculate workload for each course
    const studentWorkload = await Promise.all(allCourses.map(async otherCourse => {
      // Count how many students from the selected course are taking this other course
      const studentsInOtherCourse = otherCourse.students.filter(otherStudentId => 
        studentIds.some(selectedStudentId => selectedStudentId.toString() === otherStudentId.toString())
      );
      
      const studentCount = studentsInOtherCourse.length;
      
      // Get homework for this course
      const traditionalHomework = await Homework.find({ 
        course_id: otherCourse._id, 
        is_active: true 
      });
      
      const studentHomework = await StudentHomework.find({
        course_id: otherCourse._id
      });
      
      const totalHomework = traditionalHomework.length + studentHomework.length;
      
      // Calculate upcoming deadlines
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const nextQuarter = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      
      const upcomingWeek = [...traditionalHomework, ...studentHomework].filter(hw => {
        const deadline = hw.due_date || hw.claimed_deadline;
        return deadline && deadline >= now && deadline <= nextWeek;
      }).length;
      
      const upcomingMonth = [...traditionalHomework, ...studentHomework].filter(hw => {
        const deadline = hw.due_date || hw.claimed_deadline;
        return deadline && deadline >= now && deadline <= nextMonth;
      }).length;
      
      const upcomingQuarter = [...traditionalHomework, ...studentHomework].filter(hw => {
        const deadline = hw.due_date || hw.claimed_deadline;
        return deadline && deadline >= now && deadline <= nextQuarter;
      }).length;
      
      return {
        course_id: otherCourse._id,
        course_name: otherCourse.course_name,
        course_code: otherCourse.course_code,
        total_homework: totalHomework,
        upcoming_week: upcomingWeek,
        upcoming_month: upcomingMonth,
        upcoming_quarter: upcomingQuarter,
        student_count: studentCount
      };
    }));
    
    res.json({
      selected_course: {
        _id: course._id,
        course_name: course.course_name,
        course_code: course.course_code,
        student_count: course.students.length
      },
      student_workload: studentWorkload
    });
  } catch (error) {
    console.error('Error fetching student course workload:', error);
    res.status(500).json({ error: 'Failed to fetch student course workload' });
  }
});

// GET /api/lecturer-dashboard/workload-stats - Get workload statistics for lecturer
router.get('/workload-stats', checkJwt, extractUser, requireLecturer, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }

    // Get all courses taught by this lecturer
    const courses = await Course.find({ lecturer_id: user._id });
    const courseIds = courses.map(course => course._id);

    // Get total unique students across all courses (from Course.students array)
    const totalStudents = (() => {
      const allStudentIds = courses.flatMap(c => c.students || []);
      const uniqueIds = new Set(allStudentIds.map(id => id.toString()));
      return uniqueIds.size;
    })();

    // Get total homework (both traditional and student-created) - no is_active filter
    const traditionalHomeworkCount = await Homework.countDocuments({
      course_id: { $in: courseIds }
    });

    const studentHomeworkCount = await StudentHomework.countDocuments({
      course_id: { $in: courseIds }
    });

    const totalHomework = traditionalHomeworkCount + studentHomeworkCount;

    // Upcoming and overdue counts based on dates
    const now = new Date();

    // Traditional by due_date
    const upcomingTraditional = await Homework.countDocuments({
      course_id: { $in: courseIds },
      due_date: { $gte: now }
    });
    const overdueTraditional = await Homework.countDocuments({
      course_id: { $in: courseIds },
      due_date: { $lt: now }
    });

    // Student homework: use verified_deadline when verified, otherwise claimed_deadline
    const upcomingStudent = await StudentHomework.countDocuments({
      course_id: { $in: courseIds },
      $or: [
        {
          deadline_verification_status: 'verified',
          verified_deadline: { $gte: now }
        },
        {
          $or: [
            { deadline_verification_status: { $exists: false } },
            { deadline_verification_status: { $ne: 'verified' } }
          ],
          claimed_deadline: { $gte: now }
        }
      ]
    });

    const overdueStudent = await StudentHomework.countDocuments({
      course_id: { $in: courseIds },
      $or: [
        {
          deadline_verification_status: 'verified',
          verified_deadline: { $lt: now }
        },
        {
          $or: [
            { deadline_verification_status: { $exists: false } },
            { deadline_verification_status: { $ne: 'verified' } }
          ],
          claimed_deadline: { $lt: now }
        }
      ]
    });

    const upcoming = upcomingTraditional + upcomingStudent;
    const overdue = overdueTraditional + overdueStudent;

    // Student homework needing deadline verification
    const needsVerification = await StudentHomework.countDocuments({
      course_id: { $in: courseIds },
      $or: [
        { deadline_verification_status: { $exists: false } },
        { deadline_verification_status: { $ne: 'verified' } }
      ]
    });

    // Get course statistics
    const courseStatistics = await Promise.all(courses.map(async (course) => {
      const courseTraditionalHomework = await Homework.countDocuments({
        course_id: course._id
      });

      const courseStudentHomework = await StudentHomework.countDocuments({
        course_id: course._id
      });

      return {
        course_id: course._id,
        course_name: course.course_name,
        course_code: course.course_code,
        student_count: (course.students || []).length,
        homework_count: courseTraditionalHomework + courseStudentHomework
      };
    }));

    // Generate weekly workload data from real deadlines for the next 7 days
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const sevenDaysLater = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Fetch homework with deadlines in the next 7 days
    const [upcomingTraditionalHw, upcomingStudentHw] = await Promise.all([
      Homework.find({
        course_id: { $in: courseIds },
        due_date: { $gte: startOfToday, $lt: sevenDaysLater }
      }).populate('course_id', 'course_name'),
      StudentHomework.find({
        course_id: { $in: courseIds },
        $or: [
          { deadline_verification_status: 'verified', verified_deadline: { $gte: startOfToday, $lt: sevenDaysLater } },
          { $or: [
              { deadline_verification_status: { $exists: false } },
              { deadline_verification_status: { $ne: 'verified' } }
            ],
            claimed_deadline: { $gte: startOfToday, $lt: sevenDaysLater }
          }
        ]
      }).populate('course_id', 'course_name')
    ]);

    const allUpcoming = [
      ...upcomingTraditionalHw.map(hw => ({
        _id: hw._id,
        title: hw.title,
        course: hw.course_id?.course_name || 'Unknown Course',
        date: hw.due_date
      })),
      ...upcomingStudentHw.map(hw => ({
        _id: hw._id,
        title: hw.title || 'Student Homework',
        course: hw.course_id?.course_name || 'Unknown Course',
        date: hw.verified_deadline || hw.claimed_deadline
      }))
    ];

    // Initialize structure for each day starting today
    const weeklyBuckets = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(startOfToday.getTime() + i * 24 * 60 * 60 * 1000);
      return { day: dayNames[d.getDay()], dateKey: d.toISOString().slice(0, 10), homework: [] };
    });

    // Assign homework to buckets by date (YYYY-MM-DD)
    allUpcoming.forEach(item => {
      if (!item.date) return;
      const key = new Date(item.date).toISOString().slice(0, 10);
      const bucket = weeklyBuckets.find(b => b.dateKey === key);
      if (bucket) bucket.homework.push({ _id: item._id, title: item.title, course: item.course });
    });

    // Format final weekly workload
    const weeklyWorkload = weeklyBuckets.map(b => ({
      day: b.day,
      homework_count: b.homework.length,
      homework: b.homework
    }));

    // Recent activity: latest homework created/updated for lecturer courses
    const recentTraditional = await Homework.find({ course_id: { $in: courseIds } })
      .populate('course_id', 'course_name')
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean();

    const recentStudentCreated = await StudentHomework.find({ course_id: { $in: courseIds } })
      .populate('course_id', 'course_name')
      .populate('uploaded_by', 'name email')
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean();

    const recent_activity = [
      ...recentTraditional.map(hw => ({
        type: 'homework_updated',
        timestamp: hw.updatedAt || hw.createdAt,
        message: `Homework updated: ${hw.title} (${hw.course_id?.course_name || 'Unknown Course'})`,
      })),
      ...recentStudentCreated.map(hw => ({
        type: 'student_homework_updated',
        timestamp: hw.updatedAt || hw.createdAt,
        message: `Student homework updated: ${hw.title || 'Untitled'} (${hw.course_id?.course_name || 'Unknown Course'}) by ${hw.uploaded_by?.name || hw.uploaded_by?.email || 'Student'}`,
      }))
    ]
    // Sort by timestamp desc and take top 10
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10);

    res.json({
      overview: {
        total_courses: courses.length,
        total_students: totalStudents,
        total_homework: totalHomework,
        upcoming,
        overdue,
        needs_verification: needsVerification,
        total_traditional: traditionalHomeworkCount,
        total_student: studentHomeworkCount
      },
      course_statistics: courseStatistics,
      weekly_workload: weeklyWorkload,
      recent_activity
    });
  } catch (error) {
    console.error('Error fetching workload stats:', error);
    res.status(500).json({ error: 'Failed to fetch workload statistics' });
  }
});

// GET /api/lecturer-dashboard/courses-info - Get courses information for lecturer
router.get('/courses-info', checkJwt, extractUser, requireLecturer, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }

    // Get all courses taught by this lecturer
    const courses = await Course.find({ lecturer_id: user._id })
      .select('_id course_name course_code students')
      .populate('students', 'name email');

    // Format the response
    const coursesInfo = courses.map(course => ({
      _id: course._id,
      course_name: course.course_name,
      course_code: course.course_code,
      student_count: course.students.length,
      students: course.students.map(student => ({
        _id: student._id,
        name: student.name,
        email: student.email
      }))
    }));

    res.json(coursesInfo);
  } catch (error) {
    console.error('Error fetching courses info:', error);
    res.status(500).json({ error: 'Failed to fetch courses information' });
  }
});

module.exports = router;
