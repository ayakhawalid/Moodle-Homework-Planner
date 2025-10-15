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
      }
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
        grade.homework_id.toString() === hw._id.toString() &&
        grade.homework_type === 'traditional'
      );
      
      const statusCounts = {
        not_started: 0,
        in_progress: 0,
        completed: 0,
        graded: 0
      };
      
      // Count students by completion status from Grade table
      homeworkGrades.forEach(grade => {
        if (grade.completion_status) {
          statusCounts[grade.completion_status]++;
        }
      });
      
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
        grade.homework_id.toString() === hw._id.toString() &&
        grade.homework_type === 'student'
      );
      
      const statusCounts = {
        not_started: 0,
        in_progress: 0,
        completed: 0,
        graded: 0
      };
      
      // Count students by completion status from Grade table
      homeworkGrades.forEach(grade => {
        if (grade.completion_status) {
          statusCounts[grade.completion_status]++;
        }
      });
      
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
        grade.homework_id.toString() === hw._id.toString() &&
        grade.homework_type === 'traditional'
      );
      
      const statusCounts = {
        not_started: 0,
        in_progress: 0,
        completed: 0,
        graded: 0
      };
      
      // Count students by completion status from Grade table
      homeworkGrades.forEach(grade => {
        if (grade.completion_status) {
          statusCounts[grade.completion_status]++;
        }
      });
      
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
        grade.homework_id.toString() === hw._id.toString() &&
        grade.homework_type === 'student'
      );
      
      const statusCounts = {
        not_started: 0,
        in_progress: 0,
        completed: 0,
        graded: 0
      };
      
      // Count students by completion status from Grade table
      homeworkGrades.forEach(grade => {
        if (grade.completion_status) {
          statusCounts[grade.completion_status]++;
        }
      });
      
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
          if (grade.completion_status) {
            statusCounts[grade.completion_status]++;
          }
        });
        
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
          if (grade.completion_status) {
            statusCounts[grade.completion_status]++;
          }
        });
        
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
    }).select('_id course_name course_code');
    
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

module.exports = router;
