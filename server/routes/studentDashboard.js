const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Homework = require('../models/Homework');
const StudentHomework = require('../models/StudentHomework');
const Grade = require('../models/Grade');
const User = require('../models/User');
const StudyProgress = require('../models/StudyProgress');
const Exam = require('../models/Exam');
const Class = require('../models/Class');
const { checkJwt, extractUser, requireStudent } = require('../middleware/auth');

// GET /api/student-dashboard/overview - Get student dashboard overview
router.get('/overview', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const studentId = user._id;
    
    // Get student's enrolled courses
    const courses = await Course.find({ 
      students: studentId, 
      is_active: true 
    })
    .populate('lecturer_id', 'name email full_name')
    .populate('homework')
    .populate('classes')
    .populate('exams');
    
    // Get homework from BOTH tables
    const courseIds = courses.map(course => course._id);
    console.log('Student enrolled in courses:', courseIds.map(id => id.toString()));
    
    const traditionalHomework = await Homework.find({ 
      course_id: { $in: courseIds }, 
      is_active: true 
    })
    .populate('course_id', 'course_name course_code')
    .sort({ due_date: 1 });
    
    const studentHomework = await StudentHomework.find({
      course_id: { $in: courseIds },
      $or: [
        // Student's own homework
        { uploaded_by: studentId },
        // Lecturer-created homework
        { uploader_role: 'lecturer' },
        // Other students' homework (both verified and unverified)
        { 
          uploader_role: 'student',
          uploaded_by: { $ne: studentId }
        }
      ]
    })
    .populate('course_id', 'course_name course_code')
    .populate('uploaded_by', 'name email')
    .sort({ claimed_deadline: 1 });
    
    // Convert traditional homework to consistent format
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
      is_active: true,
      uploader_role: 'lecturer'
    }));
    
    // Convert student homework to match traditional format
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
      uploader_role: hw.uploader_role,
      completion_status: hw.completion_status,
      deadline_verification_status: hw.deadline_verification_status
    }));
    
    // Combine both types
    const allHomework = [...convertedTraditionalHomework, ...convertedStudentHomework];
    
    console.log(`Student dashboard overview - Traditional: ${traditionalHomework.length}, Student: ${studentHomework.length}, Total: ${allHomework.length}`);
    console.log('Traditional homework filter:', { course_id: { $in: courseIds }, is_active: true });
    console.log('Traditional homework details:', traditionalHomework.map(hw => ({
      id: hw._id,
      title: hw.title,
      course_id: hw.course_id._id,
      course_name: hw.course_id.course_name,
      is_active: hw.is_active,
      due_date: hw.due_date
    })));
    console.log('Student homework breakdown:', {
      own_homework: studentHomework.filter(hw => hw.uploaded_by.equals(studentId)).length,
      lecturer_homework: studentHomework.filter(hw => hw.uploader_role === 'lecturer').length,
      other_student_homework: studentHomework.filter(hw => hw.uploader_role === 'student' && !hw.uploaded_by.equals(studentId)).length,
      verified_other_homework: studentHomework.filter(hw => hw.uploader_role === 'student' && !hw.uploaded_by.equals(studentId) && hw.deadline_verification_status === 'verified').length
    });
    
    // Get student's grades
    const grades = await Grade.find({ student_id: studentId })
      .populate('homework_id', 'title due_date points_possible')
      .populate('exam_id', 'exam_title due_date points_possible');
    
    // Get exams for enrolled courses
    const exams = await Exam.find({ 
      course_id: { $in: courseIds }, 
      is_active: true 
    })
    .populate('course_id', 'course_name course_code')
    .sort({ due_date: 1 });

    // Get study progress for the last 7 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    const studyProgress = await StudyProgress.find({ 
      student_id: studentId,
      date: { $gte: startDate, $lte: endDate }
    })
    .sort({ date: 1 }); // Sort by date ascending for weekly chart
    
    console.log('=== DASHBOARD OVERVIEW STUDY PROGRESS DEBUG ===');
    console.log('Student ID:', studentId);
    console.log('Date range:', startDate, 'to', endDate);
    console.log('Found study progress records:', studyProgress.length);
    console.log('Study progress data:', studyProgress);
    console.log('=== END DASHBOARD OVERVIEW STUDY PROGRESS DEBUG ===');
    
    // Calculate statistics
    const totalCourses = courses.length;
    const totalHomework = allHomework.length;
    const totalExams = exams.length;
    // Count completed homework from both sources:
    // 1. Traditional homework with grades in Grade table
    const traditionalCompletedHomework = grades.filter(grade => grade.homework_id).length;
    
    // 2. StudentHomework with completion_status: 'completed'
    const studentCompletedHomework = allHomework.filter(hw => hw.completion_status === 'completed').length;
    
    const completedHomework = traditionalCompletedHomework + studentCompletedHomework;
    const upcomingHomework = allHomework.filter(hw => {
      const dueDate = new Date(hw.due_date);
      const today = new Date();
      const isUpcoming = dueDate > today;
      
      // Check if homework is completed from both sources:
      // 1. Traditional homework with grades in Grade table
      const isTraditionalCompleted = grades.some(grade => grade.homework_id && grade.homework_id.equals(hw._id));
      
      // 2. StudentHomework with completion_status: 'completed'
      const isStudentHomeworkCompleted = hw.completion_status === 'completed';
      
      return isUpcoming && !isTraditionalCompleted && !isStudentHomeworkCompleted;
    }).length;
    
    // Debug logging for upcoming homework calculation
    console.log('Upcoming homework calculation:', {
      total_homework: allHomework.length,
      upcoming_count: upcomingHomework,
      traditional_completed: traditionalCompletedHomework,
      student_completed: studentCompletedHomework,
      total_completed: completedHomework,
      homework_breakdown: allHomework.map(hw => ({
        id: hw._id,
        title: hw.title,
        due_date: hw.due_date,
        is_upcoming: new Date(hw.due_date) > new Date(),
        has_grade: grades.some(grade => grade.homework_id && grade.homework_id.equals(hw._id)),
        completion_status: hw.completion_status,
        is_completed: grades.some(grade => grade.homework_id && grade.homework_id.equals(hw._id)) || hw.completion_status === 'completed'
      }))
    });
    
    const overdueHomework = allHomework.filter(hw => new Date(hw.due_date) < new Date() && 
      !grades.some(grade => grade.homework_id && grade.homework_id._id.equals(hw._id))).length;
    
    // Calculate exam statistics
    const upcomingExams = exams.filter(exam => new Date(exam.due_date) > new Date());
    const overdueExams = exams.filter(exam => new Date(exam.due_date) < new Date() && 
      !grades.some(grade => grade.exam_id && grade.exam_id.equals(exam._id)));
    
    // Calculate average grade (null if no grades to avoid showing 0% trend)
    const averageGrade = grades.length > 0 
      ? grades.reduce((sum, grade) => sum + grade.grade, 0) / grades.length 
      : null;
    
    // Calculate study hours for the week
    const weeklyStudyHours = studyProgress.reduce((sum, progress) => sum + progress.hours_studied, 0);
    
    // Get today's classes
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
    
    const allClasses = await Class.find({
      course_id: { $in: courseIds },
      class_date: { $gte: startOfDay, $lte: endOfDay },
      is_cancelled: false
    })
    .populate('course_id', 'course_name course_code')
    .sort({ start_time: 1 });
    
    const overview = {
      courses: {
        total: totalCourses,
        list: courses.map(course => ({
          _id: course._id,
          course_name: course.course_name,
          course_code: course.course_code,
          lecturer: course.lecturer_id ? {
            name: course.lecturer_id.name || course.lecturer_id.full_name,
            email: course.lecturer_id.email
          } : null,
          homework_count: course.homework ? course.homework.length : 0
        }))
      },
      homework: {
        total: totalHomework,
        completed: completedHomework,
        upcoming: upcomingHomework,
        overdue: overdueHomework,
        average_grade: averageGrade !== null ? Math.round(averageGrade * 100) / 100 : null,
        upcoming_list: allHomework
          .filter(hw => {
            const dueDate = new Date(hw.due_date);
            const today = new Date();
            // Use Math.floor for proper negative number handling
            const daysUntilDue = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));
            return daysUntilDue >= 0 && 
                   !grades.some(grade => grade.homework_id && grade.homework_id.equals(hw._id));
          })
          .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
          .slice(0, 5)
          .map(hw => ({
            _id: hw._id,
            title: hw.title,
            due_date: hw.due_date,
            course: hw.course, // Use the already formatted course object from conversion
            days_until_due: Math.floor((new Date(hw.due_date) - new Date()) / (1000 * 60 * 60 * 24))
          }))
      },
      exams: {
        total: totalExams,
        upcoming: upcomingExams.length,
        overdue: overdueExams.length,
        upcoming_list: upcomingExams.slice(0, 3).map(exam => ({
          _id: exam._id,
          exam_title: exam.exam_title,
          due_date: exam.due_date,
          exam_type: exam.exam_type,
          course: {
            name: exam.course_id.course_name,
            code: exam.course_id.course_code
          },
          days_until_due: Math.floor((new Date(exam.due_date) - new Date()) / (1000 * 60 * 60 * 24))
        }))
      },
      study_progress: {
        weekly_hours: weeklyStudyHours,
        daily_average: studyProgress.length > 0 ? Math.round((weeklyStudyHours / studyProgress.length) * 10) / 10 : null,
        goal_achieved_days: studyProgress.filter(progress => progress.goal_achieved).length,
        weekly_breakdown: (() => {
          // Create array for the current week (Monday to Sunday) with study hours
          const weeklyData = [];
          const today = new Date();
          
          // Get the current day of week (0 = Sunday, 1 = Monday, etc.)
          const currentDay = today.getDay();
          
          // Calculate days since Monday (Monday = 0, Sunday = 6)
          // If today is Sunday (0), it's 6 days since Monday
          // If today is Monday (1), it's 0 days since Monday
          const daysSinceMonday = currentDay === 0 ? 6 : currentDay - 1;
          
          // Start from Monday of current week
          for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - daysSinceMonday + i);
            date.setHours(0, 0, 0, 0); // Normalize to start of day
            
            const dayProgress = studyProgress.find(progress => {
              const progressDate = new Date(progress.date);
              progressDate.setHours(0, 0, 0, 0);
              return progressDate.getTime() === date.getTime();
            });
            
            weeklyData.push(dayProgress ? dayProgress.hours_studied : 0);
          }
          
          return weeklyData;
        })()
      },
      todays_classes: allClasses.map(cls => ({
        _id: cls._id,
        class_title: cls.class_title,
        course: {
          name: cls.course_id.course_name,
          code: cls.course_id.course_code
        },
        start_time: cls.start_time,
        end_time: cls.end_time,
        room: cls.room,
        class_type: cls.class_type,
        is_online: cls.is_online,
        meeting_link: cls.meeting_link
      })),
      recent_activity: {
        recent_grades: grades.slice(0, 5).map(grade => ({
          _id: grade._id,
          grade: grade.grade,
          type: grade.homework_id ? 'homework' : 'exam',
          title: grade.homework_id ? grade.homework_id.title : (grade.exam_id ? grade.exam_id.exam_title : 'Unknown'),
          date: grade.graded_at
        })),
        recent_study_sessions: studyProgress.slice(0, 3).map(progress => ({
          date: progress.date,
          hours: progress.hours_studied,
          tasks: progress.tasks_completed
        }))
      }
    };
    
    res.json(overview);
  } catch (error) {
    console.error('Error fetching student dashboard overview:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard overview' });
  }
});

// GET /api/student-dashboard/homework-planner - Get homework planner data
router.get('/homework-planner', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const { status = 'all', course_id, upcoming_days = 7 } = req.query;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const studentId = user._id;
    
    // Get student's enrolled courses
    const courses = await Course.find({ 
      students: studentId, 
      is_active: true 
    });
    const courseIds = courses.map(course => course._id);
    console.log('Student enrolled in courses:', courseIds.map(id => id.toString()));
    
    // Build filter for homework
    let filter = { 
      course_id: { $in: courseIds }, 
      is_active: true 
    };
    
    // If specific course is requested, ensure student is enrolled in it
    if (course_id) {
      if (courseIds.some(id => id.equals(course_id))) {
      filter.course_id = course_id;
      } else {
        // Student not enrolled in requested course, return empty result
        return res.json({ homework: [] });
      }
    }
    
    // Get homework from BOTH tables
    const traditionalHomework = await Homework.find(filter)
      .populate('course_id', 'course_name course_code')
      .sort({ due_date: 1 });
    
    const studentHomeworkFilter = {
      course_id: { $in: courseIds },
      $or: [
        // Student's own homework
        { uploaded_by: studentId },
        // Lecturer-created homework
        { uploader_role: 'lecturer' },
        // Other students' homework (both verified and unverified)
        { 
          uploader_role: 'student',
          uploaded_by: { $ne: studentId }
        }
      ]
    };
    
    // If specific course is requested, filter to that course
    if (course_id && courseIds.some(id => id.equals(course_id))) {
      studentHomeworkFilter.course_id = course_id;
    }
    
    const studentHomework = await StudentHomework.find(studentHomeworkFilter)
      .populate('course_id', 'course_name course_code')
      .populate('uploaded_by', 'name email')
      .sort({ claimed_deadline: 1 });
    
    // Convert traditional homework to consistent format
    const convertedTraditionalHomework = traditionalHomework.map(hw => ({
      _id: hw._id,
      title: hw.title,
      description: hw.description,
      assigned_date: hw.assigned_date,
      points_possible: hw.points_possible,
      course_id: {
        _id: hw.course_id._id,
        course_name: hw.course_id.course_name,
        course_code: hw.course_id.course_code
      },
      due_date: hw.due_date,
      is_active: true,
      uploader_role: 'lecturer'
    }));
    
    // Convert student homework to match traditional format for processing
    const convertedStudentHomework = studentHomework.map(hw => ({
      _id: hw._id,
      title: hw.title,
      description: hw.description,
      course_id: {
        _id: hw.course_id._id,
        course_name: hw.course_id.course_name,
        course_code: hw.course_id.course_code
      },
      due_date: hw.claimed_deadline,
      is_active: true,
      uploader_role: hw.uploader_role,
      completion_status: hw.completion_status,
      deadline_verification_status: hw.deadline_verification_status
    }));
    
    // Combine both types
    const allHomework = [...convertedTraditionalHomework, ...convertedStudentHomework];
    
    console.log(`Student homework planner - Traditional: ${traditionalHomework.length}, Student: ${studentHomework.length}, Total: ${allHomework.length}`);
    console.log('Filter used for traditional homework:', filter);
    console.log('StudentHomework filter used:', studentHomeworkFilter);
    console.log('Traditional homework details:', traditionalHomework.map(hw => ({
      id: hw._id,
      title: hw.title,
      course_id: hw.course_id._id,
      course_name: hw.course_id.course_name,
      is_active: hw.is_active,
      due_date: hw.due_date
    })));
    console.log('Student homework breakdown:', {
      own_homework: studentHomework.filter(hw => hw.uploaded_by.equals(studentId)).length,
      lecturer_homework: studentHomework.filter(hw => hw.uploader_role === 'lecturer').length,
      other_student_homework: studentHomework.filter(hw => hw.uploader_role === 'student' && !hw.uploaded_by.equals(studentId)).length,
      verified_other_homework: studentHomework.filter(hw => hw.uploader_role === 'student' && !hw.uploaded_by.equals(studentId) && hw.deadline_verification_status === 'verified').length
    });
    console.log('Lecturer homework details:', studentHomework.filter(hw => hw.uploader_role === 'lecturer').map(hw => ({
      id: hw._id,
      title: hw.title,
      course_id: hw.course_id._id,
      uploaded_by: hw.uploaded_by._id,
      deadline_status: hw.deadline_verification_status
    })));
    
    // Get student's grades for traditional homework only
    const traditionalHomeworkIds = traditionalHomework.map(hw => hw._id);
    const grades = await Grade.find({ 
      student_id: studentId,
      homework_id: { $in: traditionalHomeworkIds }
    });
    
    // Process homework with submission status
    const processedHomework = allHomework.map(hw => {
      const grade = grades.find(g => g.homework_id && g.homework_id.equals(hw._id));
      const isSubmitted = !!grade;
      const isGraded = isSubmitted && grade.grade !== null;
      
      // Check completion status from both sources:
      // 1. Traditional homework with grades
      const isTraditionalCompleted = isGraded;
      
      // 2. StudentHomework with completion_status: 'completed'
      const isStudentHomeworkCompleted = hw.completion_status === 'completed';
      
      const isCompleted = isTraditionalCompleted || isStudentHomeworkCompleted;
      const isOverdue = new Date() > hw.due_date && !isCompleted;
      
      let status = 'pending';
      if (isCompleted) {
        status = 'graded'; // Use 'graded' for consistency with existing logic
      } else if (isSubmitted) {
        status = 'submitted';
      } else if (isOverdue) {
        status = 'overdue';
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
        status: status,
        is_submitted: isSubmitted,
        is_graded: isGraded,
        is_overdue: isOverdue,
        grade: isGraded ? grade.grade : null,
        days_until_due: Math.floor((new Date(hw.due_date) - new Date()) / (1000 * 60 * 60 * 24))
      };
    });
    
    // Filter based on status
    let filteredHomework = processedHomework;
    if (status === 'pending') {
      filteredHomework = processedHomework.filter(hw => hw.status === 'pending');
    } else if (status === 'overdue') {
      filteredHomework = processedHomework.filter(hw => hw.status === 'overdue');
    } else if (status === 'upcoming') {
      const days = parseInt(upcoming_days);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      const now = new Date();
      filteredHomework = processedHomework.filter(hw => 
        new Date(hw.due_date) <= futureDate && 
        new Date(hw.due_date) >= now && 
        hw.status !== 'graded'
      );
    }
    
    // Get summary statistics
    const totalHomework = processedHomework.length;
    const completedHomework = processedHomework.filter(hw => hw.status === 'graded').length;
    const pendingHomework = processedHomework.filter(hw => hw.status === 'pending').length;
    const overdueHomework = processedHomework.filter(hw => hw.status === 'overdue').length;
    
    const homeworkSummary = {
      total: totalHomework,
      completed: completedHomework,
      pending: pendingHomework,
      overdue: overdueHomework,
      completion_rate: totalHomework > 0 ? Math.round((completedHomework / totalHomework) * 100) : 0
    };
    
    res.json({
      homework: filteredHomework,
      summary: homeworkSummary,
      courses: courses.map(course => ({
        _id: course._id,
        name: course.course_name,
        code: course.course_code
      }))
    });
  } catch (error) {
    console.error('Error fetching homework planner data:', error);
    res.status(500).json({ error: 'Failed to fetch homework planner data' });
  }
});

// GET /api/student-dashboard/courses-info - Get student's course information
router.get('/courses-info', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const studentId = user._id;
    
    // Get student's enrolled courses with all related data
    const courses = await Course.find({ 
      students: studentId, 
      is_active: true 
    })
    .populate('lecturer_id', 'name email full_name')
    .populate({
      path: 'homework',
      match: { is_active: true },
      populate: {
        path: 'grades',
        match: { student_id: studentId }
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
      const totalHomework = course.homework ? course.homework.length : 0;
      const totalClasses = course.classes ? course.classes.length : 0;
      const totalExams = course.exams ? course.exams.length : 0;
      
      // Calculate student's average grade for this course
      let totalGrade = 0;
      let gradeCount = 0;
      if (course.homework) {
        course.homework.forEach(hw => {
          if (hw.grades && hw.grades.length > 0) {
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
        lecturer: course.lecturer_id ? {
          _id: course.lecturer_id._id,
          name: course.lecturer_id.name || course.lecturer_id.full_name,
          email: course.lecturer_id.email
        } : null,
        statistics: {
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
            is_submitted: hw.grades && hw.grades.length > 0,
            grade: hw.grades && hw.grades.length > 0 ? hw.grades[0].grade : null
          })) : []
      };
    });
    
    res.json(coursesInfo);
  } catch (error) {
    console.error('Error fetching courses info:', error);
    res.status(500).json({ error: 'Failed to fetch courses info' });
  }
});

// GET /api/student-dashboard/student-courses - Get student's enrolled courses for dropdowns
router.get('/student-courses', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const studentId = user._id;
    
    // Get student's enrolled courses (simplified for dropdowns)
    const courses = await Course.find({ 
      students: studentId, 
      is_active: true 
    })
    .select('_id course_name course_code')
    .sort({ course_code: 1 });
    
    res.json(courses);
  } catch (error) {
    console.error('Error fetching student courses:', error);
    res.status(500).json({ error: 'Failed to fetch student courses' });
  }
});

// POST /api/student-dashboard/add-class - Add a new class
router.post('/add-class', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const { course_id, topic, date, start_time, end_time, location, description } = req.body;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const studentId = user._id;
    
    // Verify the student is enrolled in the course
    const course = await Course.findOne({ 
      _id: course_id, 
      students: studentId, 
      is_active: true 
    });
    
    if (!course) {
      return res.status(403).json({ error: 'You are not enrolled in this course' });
    }
    
    // Create the class
    const newClass = new Class({
      course_id,
      class_title: topic,
      class_date: new Date(date),
      start_time,
      end_time,
      room: location,
      description,
      class_type: 'lecture', // Default type
      is_active: true
    });
    
    await newClass.save();
    
    // No need to add to course.classes since it's a virtual field
    // The class is already linked to the course via course_id
    
    res.status(201).json({ 
      message: 'Class added successfully', 
      class: newClass 
    });
  } catch (error) {
    console.error('Error adding class:', error);
    res.status(500).json({ error: 'Failed to add class' });
  }
});

// POST /api/student-dashboard/add-exam - Add a new exam
router.post('/add-exam', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const { course_id, title, exam_date, exam_time, duration, location, description, exam_type } = req.body;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const studentId = user._id;
    
    // Verify the student is enrolled in the course
    const course = await Course.findOne({ 
      _id: course_id, 
      students: studentId, 
      is_active: true 
    });
    
    if (!course) {
      return res.status(403).json({ error: 'You are not enrolled in this course' });
    }
    
    // Create the exam
    const newExam = new Exam({
      course_id,
      exam_title: title,
      due_date: new Date(exam_date),
      start_time: exam_time,
      duration_minutes: parseInt(duration),
      room: location,
      description,
      exam_type,
      is_active: true,
      is_published: true
    });
    
    await newExam.save();
    
    // No need to add to course.exams since it's a virtual field
    // The exam is already linked to the course via course_id
    
    res.status(201).json({ 
      message: 'Exam added successfully', 
      exam: newExam 
    });
  } catch (error) {
    console.error('Error adding exam:', error);
    res.status(500).json({ error: 'Failed to add exam' });
  }
});

// GET /api/student-dashboard/study-progress - Get study progress data
router.get('/study-progress', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const { days = 30 } = req.query;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const studentId = user._id;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    // Get study progress for the specified period
    const studyProgress = await StudyProgress.find({
      student_id: studentId,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });
    
    console.log('=== STUDY PROGRESS FETCH DEBUG ===');
    console.log('Student ID:', studentId);
    console.log('Date range:', startDate, 'to', endDate);
    console.log('Found study progress records:', studyProgress.length);
    console.log('Study progress data:', studyProgress);
    console.log('=== END STUDY PROGRESS FETCH DEBUG ===');
    
    // Calculate statistics
    const totalHours = studyProgress.reduce((sum, progress) => sum + progress.hours_studied, 0);
    const averageHoursPerDay = studyProgress.length > 0 ? totalHours / studyProgress.length : 0;
    const goalAchievedDays = studyProgress.filter(progress => progress.goal_achieved).length;
    const totalStudyDays = studyProgress.length;
    
    // Get weekly breakdown
    const weeklyData = [];
    const currentWeek = new Date(startDate);
    while (currentWeek <= endDate) {
      const weekStart = new Date(currentWeek);
      const weekEnd = new Date(currentWeek);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const weekProgress = studyProgress.filter(progress => 
        progress.date >= weekStart && progress.date <= weekEnd
      );
      
      const weekHours = weekProgress.reduce((sum, progress) => sum + progress.hours_studied, 0);
      const weekGoalDays = weekProgress.filter(progress => progress.goal_achieved).length;
      
      weeklyData.push({
        week_start: weekStart,
        week_end: weekEnd,
        total_hours: weekHours,
        goal_achieved_days: weekGoalDays,
        study_days: weekProgress.length
      });
      
      currentWeek.setDate(currentWeek.getDate() + 7);
    }
    
    // Get subject breakdown
    const subjectStats = {};
    studyProgress.forEach(progress => {
      if (progress.subjects_studied) {
        progress.subjects_studied.forEach(subject => {
          if (!subjectStats[subject.subject]) {
            subjectStats[subject.subject] = { hours: 0, sessions: 0 };
          }
          subjectStats[subject.subject].hours += subject.hours || 0;
          subjectStats[subject.subject].sessions += 1;
        });
      }
    });
    
    const studyProgressData = {
      overview: {
        total_hours: totalHours,
        average_hours_per_day: Math.round(averageHoursPerDay * 10) / 10,
        goal_achieved_days: goalAchievedDays,
        total_study_days: totalStudyDays,
        study_consistency: totalStudyDays > 0 ? Math.round((totalStudyDays / parseInt(days)) * 100) : 0,
        weekly_goal: user.weekly_study_goal || 20 // Default 20 hours
      },
      weekly_breakdown: weeklyData,
      subject_breakdown: Object.entries(subjectStats).map(([subject, stats]) => ({
        subject: subject,
        total_hours: stats.hours,
        sessions: stats.sessions,
        average_hours_per_session: stats.sessions > 0 ? Math.round((stats.hours / stats.sessions) * 10) / 10 : 0
      })),
      recent_sessions: studyProgress
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10)
        .map(progress => ({
          date: progress.date,
          hours_studied: progress.hours_studied,
          tasks_completed: progress.tasks_completed,
          goal_achieved: progress.goal_achieved,
          focus_rating: progress.focus_rating,
          difficulty_rating: progress.difficulty_rating
        }))
    };
    
    res.json(studyProgressData);
  } catch (error) {
    console.error('Error fetching study progress data:', error);
    res.status(500).json({ error: 'Failed to fetch study progress data' });
  }
});

// GET /api/student-dashboard/grades - Get student's grades
router.get('/grades', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const { course_id } = req.query;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const studentId = user._id;
    
    // Build filter for grades
    let filter = { student_id: studentId };
    
    if (course_id) {
      // If course_id is provided, get grades for homework/exams in that course
      const homework = await Homework.find({ course_id: course_id }).select('_id');
      const exams = await Exam.find({ course_id: course_id }).select('_id');
      
      const homeworkIds = homework.map(hw => hw._id);
      const examIds = exams.map(exam => exam._id);
      
      filter.$or = [
        { homework_id: { $in: homeworkIds } },
        { exam_id: { $in: examIds } }
      ];
    }
    
    // Get grades with populated data
    const grades = await Grade.find(filter)
      .populate('homework_id', 'title due_date points_possible course_id')
      .populate('exam_id', 'exam_title due_date points_possible course_id')
      .populate({
        path: 'homework_id',
        populate: {
          path: 'course_id',
          select: 'course_name course_code'
        }
      })
      .populate({
        path: 'exam_id',
        populate: {
          path: 'course_id',
          select: 'course_name course_code'
        }
      })
      .sort({ graded_at: -1 });
    
    // Process grades
    const processedGrades = grades.map(grade => {
      const isHomework = !!grade.homework_id;
      const assignment = isHomework ? grade.homework_id : grade.exam_id;
      const course = assignment.course_id;
      
      return {
        _id: grade._id,
        type: isHomework ? 'homework' : 'exam',
        title: isHomework ? assignment.title : assignment.exam_title,
        course: {
          _id: course._id,
          name: course.course_name,
          code: course.course_code
        },
        grade: grade.grade,
        points_earned: grade.points_earned,
        points_possible: grade.points_possible || assignment.points_possible,
        letter_grade: grade.letter_grade || getLetterGrade(grade.grade),
        feedback: grade.feedback,
        graded_at: grade.graded_at,
        due_date: assignment.due_date,
        is_late: grade.is_late
      };
    });
    
    // Calculate statistics
    const totalGrades = processedGrades.length;
    const averageGrade = totalGrades > 0 
      ? processedGrades.reduce((sum, grade) => sum + grade.grade, 0) / totalGrades 
      : 0;
    
    const gradeDistribution = {
      'A+': processedGrades.filter(g => g.letter_grade === 'A+').length,
      'A': processedGrades.filter(g => g.letter_grade === 'A').length,
      'A-': processedGrades.filter(g => g.letter_grade === 'A-').length,
      'B+': processedGrades.filter(g => g.letter_grade === 'B+').length,
      'B': processedGrades.filter(g => g.letter_grade === 'B').length,
      'B-': processedGrades.filter(g => g.letter_grade === 'B-').length,
      'C+': processedGrades.filter(g => g.letter_grade === 'C+').length,
      'C': processedGrades.filter(g => g.letter_grade === 'C').length,
      'C-': processedGrades.filter(g => g.letter_grade === 'C-').length,
      'D+': processedGrades.filter(g => g.letter_grade === 'D+').length,
      'D': processedGrades.filter(g => g.letter_grade === 'D').length,
      'D-': processedGrades.filter(g => g.letter_grade === 'D-').length,
      'F': processedGrades.filter(g => g.letter_grade === 'F').length
    };
    
    const gradesData = {
      grades: processedGrades,
      statistics: {
        total_grades: totalGrades,
        average_grade: Math.round(averageGrade * 100) / 100,
        letter_grade: getLetterGrade(averageGrade),
        grade_distribution: gradeDistribution
      }
    };
    
    res.json(gradesData);
  } catch (error) {
    console.error('Error fetching grades data:', error);
    res.status(500).json({ error: 'Failed to fetch grades data' });
  }
});

// GET /api/student-dashboard/classes-planner - Get classes planner data
router.get('/classes-planner', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const { week_start } = req.query;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const studentId = user._id;
    
    // Get student's enrolled courses
    const courses = await Course.find({ 
      students: studentId
    });
    const courseIds = courses.map(course => course._id);
    
    // Calculate week range
    let weekStartDate;
    if (week_start) {
      weekStartDate = new Date(week_start);
    } else {
      // Default to current week
      const now = new Date();
      const dayOfWeek = now.getDay();
      weekStartDate = new Date(now);
      weekStartDate.setDate(now.getDate() - dayOfWeek);
      weekStartDate.setHours(0, 0, 0, 0);
    }
    
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6);
    weekEndDate.setHours(23, 59, 59, 999);
    
    console.log('Classes planner query - Week range:', weekStartDate, 'to', weekEndDate);
    console.log('Classes planner query - Course IDs:', courseIds);
    
    // Get classes for the week
    const classes = await Class.find({
      course_id: { $in: courseIds },
      class_date: { $gte: weekStartDate, $lte: weekEndDate }
    })
    .populate('course_id', 'course_name course_code')
    .sort({ class_date: 1 });
    
    console.log('Classes found:', classes.length);
    classes.forEach(cls => {
      console.log('- Class:', cls.class_title, 'Date:', cls.class_date, 'Course:', cls.course_id?.course_name);
    });
    
    // Group classes by day
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weeklySchedule = daysOfWeek.map((day, index) => {
      const dayDate = new Date(weekStartDate);
      dayDate.setDate(weekStartDate.getDate() + index);
      
      const dayClasses = classes.filter(cls => {
        const classDate = new Date(cls.class_date);
        return classDate.toDateString() === dayDate.toDateString();
      });
      
              return {
          day: day,
          date: dayDate,
          classes: dayClasses.map(cls => ({
            _id: cls._id,
            topic: cls.class_title,
            description: cls.description,
            room: cls.room,
            start_time: cls.start_time,
            end_time: cls.end_time,
            duration_minutes: cls.getDurationMinutes ? cls.getDurationMinutes() : 90,
            class_date: cls.class_date,
            course: {
              _id: cls.course_id._id,
              name: cls.course_id.course_name,
              code: cls.course_id.course_code
            }
          }))
        };
    });
    
    // Calculate statistics
    const totalClasses = classes.length;
    const totalHours = classes.reduce((sum, cls) => {
      const duration = cls.getDurationMinutes ? cls.getDurationMinutes() : 90;
      return sum + duration;
    }, 0) / 60;
    
    const classesData = {
      week_start: weekStartDate,
      week_end: weekEndDate,
      schedule: weeklySchedule,
      statistics: {
        total_classes: totalClasses,
        total_hours: Math.round(totalHours * 10) / 10,
        average_classes_per_day: totalClasses > 0 ? Math.round((totalClasses / 7) * 10) / 10 : 0
      }
    };
    
    res.json(classesData);
  } catch (error) {
    console.error('Error fetching classes planner data:', error);
    res.status(500).json({ error: 'Failed to fetch classes planner data' });
  }
});

// GET /api/student-dashboard/exams - Get exams data
router.get('/exams', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const { status = 'all', course_id } = req.query;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const studentId = user._id;
    
    // Get student's enrolled courses
    const courses = await Course.find({ 
      students: studentId, 
      is_active: true 
    });
    const courseIds = courses.map(course => course._id);
    
    // Build filter for exams
    let filter = { 
      course_id: { $in: courseIds }, 
      is_active: true 
    };
    
    if (course_id) {
      filter.course_id = course_id;
    }
    
    // Get exams
    const exams = await Exam.find(filter)
      .populate('course_id', 'course_name course_code')
      .sort({ due_date: 1 });
    
    // Get student's grades for these exams
    const examIds = exams.map(exam => exam._id);
    const grades = await Grade.find({ 
      student_id: studentId,
      exam_id: { $in: examIds }
    });
    
    // Process exams with status
    const processedExams = exams.map(exam => {
      const grade = grades.find(g => g.exam_id && g.exam_id.equals(exam._id));
      const isCompleted = !!grade;
      const isGraded = isCompleted && grade.grade !== null;
      const isOverdue = new Date() > exam.due_date && !isCompleted;
      
      let status = 'upcoming';
      if (isGraded) {
        status = 'graded';
      } else if (isCompleted) {
        status = 'completed';
      } else if (isOverdue) {
        status = 'overdue';
      }
      
      return {
        _id: exam._id,
        exam_title: exam.exam_title,
        description: exam.description,
        due_date: exam.due_date,
        points_possible: exam.points_possible,
        exam_type: exam.exam_type,
        course: {
          _id: exam.course_id._id,
          name: exam.course_id.course_name,
          code: exam.course_id.course_code
        },
        status: status,
        is_completed: isCompleted,
        is_graded: isGraded,
        is_overdue: isOverdue,
        grade: isGraded ? grade.grade : null,
        days_until_due: Math.floor((new Date(exam.due_date) - new Date()) / (1000 * 60 * 60 * 24))
      };
    });
    
    // Filter based on status
    let filteredExams = processedExams;
    if (status === 'upcoming') {
      filteredExams = processedExams.filter(exam => exam.status === 'upcoming');
    } else if (status === 'overdue') {
      filteredExams = processedExams.filter(exam => exam.status === 'overdue');
    } else if (status === 'completed') {
      filteredExams = processedExams.filter(exam => exam.status === 'completed' || exam.status === 'graded');
    }
    
    // Get summary statistics
    const totalExams = processedExams.length;
    const completedExams = processedExams.filter(exam => exam.status === 'graded').length;
    const upcomingExams = processedExams.filter(exam => exam.status === 'upcoming').length;
    const overdueExams = processedExams.filter(exam => exam.status === 'overdue').length;
    
    const examsSummary = {
      total: totalExams,
      completed: completedExams,
      upcoming: upcomingExams,
      overdue: overdueExams,
      completion_rate: totalExams > 0 ? Math.round((completedExams / totalExams) * 100) : 0
    };
    
    res.json({
      exams: filteredExams,
      summary: examsSummary,
      courses: courses.map(course => ({
        _id: course._id,
        name: course.course_name,
        code: course.course_code
      }))
    });
  } catch (error) {
    console.error('Error fetching exams data:', error);
    res.status(500).json({ error: 'Failed to fetch exams data' });
  }
});

// GET /api/student-dashboard/study-timer - Get study timer data
router.get('/study-timer', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const { days = 7 } = req.query;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const studentId = user._id;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    // Get study progress for the specified period
    const studyProgress = await StudyProgress.find({
      student_id: studentId,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: -1 });
    
    // Calculate statistics
    const totalHours = studyProgress.reduce((sum, progress) => sum + progress.hours_studied, 0);
    const averageHoursPerDay = studyProgress.length > 0 ? totalHours / studyProgress.length : 0;
    const goalAchievedDays = studyProgress.filter(progress => progress.goal_achieved).length;
    const totalStudyDays = studyProgress.length;
    
    // Get daily breakdown
    const dailyData = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayProgress = studyProgress.find(progress => 
        new Date(progress.date).toDateString() === currentDate.toDateString()
      );
      
      dailyData.push({
        date: new Date(currentDate),
        hours_studied: dayProgress ? dayProgress.hours_studied : 0,
        goal_achieved: dayProgress ? dayProgress.goal_achieved : false,
        tasks_completed: dayProgress ? dayProgress.tasks_completed : '',
        focus_rating: dayProgress ? dayProgress.focus_rating : null,
        difficulty_rating: dayProgress ? dayProgress.difficulty_rating : null
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Calculate today's specific data
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    const todayProgress = studyProgress.find(progress => {
      const progressDate = new Date(progress.date);
      return progressDate >= today && progressDate <= todayEnd;
    });
    
    const todayHours = todayProgress ? todayProgress.hours_studied : 0;
    const sessionsToday = studyProgress.filter(progress => {
      const progressDate = new Date(progress.date);
      return progressDate >= today && progressDate <= todayEnd;
    }).length;

    const studyTimerData = {
      today_hours: todayHours,
      sessions_today: sessionsToday,
      total_hours: totalHours,
      average_hours_per_day: Math.round(averageHoursPerDay * 10) / 10,
      goal_achieved_days: goalAchievedDays,
      total_study_days: totalStudyDays,
      study_consistency: totalStudyDays > 0 ? Math.round((totalStudyDays / parseInt(days)) * 100) : 0,
      daily_breakdown: dailyData,
      recent_sessions: studyProgress.slice(0, 5).map(progress => ({
        duration: Math.round(progress.hours_studied * 60), // Convert hours to minutes
        completed_at: progress.date,
        tasks_completed: progress.tasks_completed,
        goal_achieved: progress.goal_achieved,
        focus_rating: progress.focus_rating,
        difficulty_rating: progress.difficulty_rating
      }))
    };
    
    res.json(studyTimerData);
  } catch (error) {
    console.error('Error fetching study timer data:', error);
    res.status(500).json({ error: 'Failed to fetch study timer data' });
  }
});

// POST /api/student-dashboard/study-timer/session - Save study session
router.post('/study-timer/session', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const { date, hours_studied, tasks_completed, goal_achieved, focus_rating, difficulty_rating, subjects_studied } = req.body;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const studentId = user._id;
    
    console.log('=== STUDY SESSION SAVE DEBUG ===');
    console.log('Auth0 ID:', auth0Id);
    console.log('Student ID:', studentId);
    console.log('Date:', date);
    console.log('Hours studied:', hours_studied);
    console.log('Tasks completed:', tasks_completed);
    
    // Validate required fields
    if (!date || !hours_studied || !tasks_completed) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['date', 'hours_studied', 'tasks_completed'],
        received: { date, hours_studied, tasks_completed }
      });
    }
    
    // Check if study progress already exists for this date
    let existingProgress;
    try {
      existingProgress = await StudyProgress.findOne({
      student_id: studentId,
      date: new Date(date)
    });
      console.log('Existing progress found:', !!existingProgress);
    } catch (findError) {
      console.error('Error finding existing progress:', findError);
      throw findError;
    }
    
    let studyProgress;
    if (existingProgress) {
      // Update existing progress
      studyProgress = await StudyProgress.findByIdAndUpdate(
        existingProgress._id,
        {
          hours_studied: hours_studied,
          tasks_completed: tasks_completed,
          goal_achieved: goal_achieved,
          focus_rating: focus_rating,
          difficulty_rating: difficulty_rating,
          subjects_studied: subjects_studied
        },
        { new: true }
      );
    } else {
      // Create new study progress
      try {
      studyProgress = new StudyProgress({
        student_id: studentId,
        date: new Date(date),
        hours_studied: hours_studied,
        tasks_completed: tasks_completed,
        goal_achieved: goal_achieved,
        focus_rating: focus_rating,
        difficulty_rating: difficulty_rating,
        subjects_studied: subjects_studied
      });
      
        console.log('StudyProgress object created:', studyProgress);
      await studyProgress.save();
        console.log('New study progress created:', studyProgress._id);
      } catch (saveError) {
        console.error('Error saving new study progress:', saveError);
        console.error('Save error details:', {
          message: saveError.message,
          name: saveError.name,
          code: saveError.code,
          errors: saveError.errors
        });
        throw saveError;
      }
    }
    
    console.log('Final study progress:', studyProgress);
    console.log('=== END STUDY SESSION SAVE DEBUG ===');
    
    res.status(201).json({
      message: 'Study session saved successfully',
      study_progress: studyProgress
    });
  } catch (error) {
    console.error('Error saving study session:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code
    });
    res.status(500).json({ 
      error: 'Failed to save study session',
      details: error.message,
      stack: error.stack
    });
  }
});

// GET /api/student-dashboard/choose-partner - Get partner selection data
router.get('/choose-partner', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const { course_id, homework_id } = req.query;
    
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const studentId = user._id;
    
    // Get student's enrolled courses with partner settings
    const courses = await Course.find({ 
      students: studentId, 
      is_active: true 
    });
    
    // Import Partner model
    const Partner = require('../models/Partner');
    
    let potentialPartners = [];
    let selectedCourse = null;
    let selectedHomework = null;
    let currentPartners = [];
    
    if (course_id) {
      // Get potential partners for specific course
      selectedCourse = await Course.findById(course_id)
        .populate('students', 'name email full_name picture')
        .populate('lecturer_id', 'name email full_name');
      
      if (selectedCourse) {
        // Partner functionality is now controlled at homework level
        
        // Get current partners for this student in this course (exclude completed partnerships)
        const existingPartners = await Partner.find({
          $or: [
            { student1_id: studentId },
            { student2_id: studentId }
          ],
          partnership_status: { $in: ['pending', 'accepted', 'active'] }
        })
        .populate('student1_id', 'name email full_name picture')
        .populate('student2_id', 'name email full_name picture')
        .populate('homework_id', 'title course_id')
        .populate({
          path: 'homework_id',
          populate: {
            path: 'course_id',
            select: 'course_name course_code'
          }
        });
        
        // Filter partners for the current course (exclude null homework_id)
        currentPartners = existingPartners.filter(partner => 
          partner.homework_id && 
          partner.homework_id.course_id && 
          partner.homework_id.course_id._id && 
          partner.homework_id.course_id._id.toString() === course_id
        );
        
        // Get IDs of students who already have partnerships with current student
        const existingPartnerIds = new Set();
        currentPartners.forEach(partner => {
          if (partner.student1_id.equals(studentId)) {
            existingPartnerIds.add(partner.student2_id.toString());
          } else {
            existingPartnerIds.add(partner.student1_id.toString());
          }
        });
        
        // Check if student already has max partners for this course (default max is 1)
        const maxPartnersPerStudent = 1; // Default max partners
        if (currentPartners.length >= maxPartnersPerStudent) {
          potentialPartners = []; // No more partners allowed
        } else {
          // Get students who don't already have max partners
          const studentsWithMaxPartners = new Set();
          
          for (const student of selectedCourse.students) {
            if (student._id.equals(studentId)) continue;
            
            const studentPartners = await Partner.find({
              $or: [
                { student1_id: student._id },
                { student2_id: student._id }
              ],
              partnership_status: { $in: ['pending', 'accepted', 'active'] }
            }).populate('homework_id', 'course_id');
            
            const coursePartners = studentPartners.filter(partner => 
              partner.homework_id && 
              partner.homework_id.course_id && 
              partner.homework_id.course_id._id &&
              partner.homework_id.course_id._id.toString() === course_id
            );
            
            if (coursePartners.length >= maxPartnersPerStudent) {
              studentsWithMaxPartners.add(student._id.toString());
            }
          }
          
          potentialPartners = selectedCourse.students.filter(student => 
            !student._id.equals(studentId) && 
            !studentsWithMaxPartners.has(student._id.toString()) &&
            !existingPartnerIds.has(student._id.toString())
          );
        }
      }
      
      if (homework_id) {
        // Get specific homework details
        selectedHomework = await Homework.findById(homework_id)
          .populate('course_id', 'course_name course_code');
      }
    } else {
      // Get all courses with potential partners
      const maxPartnersPerStudent = 1; // Default max partners
      const coursesWithPartners = await Promise.all(
        courses.map(async (course) => {
          // Partners are now enabled at homework level
          
          const populatedCourse = await Course.findById(course._id)
            .populate('students', 'name email full_name picture');
          
          // Get current partners for this student in this course (exclude completed partnerships)
          const existingPartners = await Partner.find({
            $or: [
              { student1_id: studentId },
              { student2_id: studentId }
            ],
            partnership_status: { $in: ['pending', 'accepted', 'active'] }
          })
          .populate('student1_id', 'name email full_name picture')
          .populate('student2_id', 'name email full_name picture')
          .populate('homework_id', 'title course_id')
          .populate({
            path: 'homework_id',
            populate: {
              path: 'course_id',
              select: 'course_name course_code'
            }
          });
          
          const coursePartners = existingPartners.filter(partner => 
            partner.homework_id && 
            partner.homework_id.course_id && 
            partner.homework_id.course_id._id &&
            partner.homework_id.course_id._id.toString() === course._id.toString()
          );
          
          // Get IDs of students who already have partnerships with current student
          const existingPartnerIds = new Set();
          coursePartners.forEach(partner => {
            if (partner.student1_id.equals(studentId)) {
              existingPartnerIds.add(partner.student2_id.toString());
            } else {
              existingPartnerIds.add(partner.student1_id.toString());
            }
          });
          
          let coursePotentialPartners = [];
          if (coursePartners.length < maxPartnersPerStudent) {
            // Get students who don't already have max partners
            const studentsWithMaxPartners = new Set();
            
            for (const student of populatedCourse.students) {
              if (student._id.equals(studentId)) continue;
              
              const studentPartners = await Partner.find({
                $or: [
                  { student1_id: student._id },
                  { student2_id: student._id }
                ],
                partnership_status: { $in: ['pending', 'accepted', 'active'] }
              }).populate('homework_id', 'course_id');
              
              const studentCoursePartners = studentPartners.filter(partner => 
                partner.homework_id && 
                partner.homework_id.course_id && 
                partner.homework_id.course_id._id &&
                partner.homework_id.course_id._id.toString() === course._id.toString()
              );
              
              if (studentCoursePartners.length >= maxPartnersPerStudent) {
                studentsWithMaxPartners.add(student._id.toString());
              }
            }
            
            coursePotentialPartners = populatedCourse.students.filter(student => 
              !student._id.equals(studentId) && 
              !studentsWithMaxPartners.has(student._id.toString()) &&
              !existingPartnerIds.has(student._id.toString())
            );
          }
          
          return {
            _id: course._id,
            course_name: course.course_name,
            course_code: course.course_code,
            partner_enabled: true,
            current_partners: coursePartners.length,
            max_partners: maxPartnersPerStudent,
            potential_partners: coursePotentialPartners
          };
        })
      );
      
      potentialPartners = coursesWithPartners.flatMap(course => course.potential_partners);
    }
    
    // Get homework assignments for the selected course (from both traditional and student-created homework)
    let homeworkAssignments = [];
    if (course_id) {
      
      // Import StudentHomework model
      const StudentHomework = require('../models/StudentHomework');
      
      // Convert course_id to ObjectId for proper database query
      const mongoose = require('mongoose');
      const courseObjectId = new mongoose.Types.ObjectId(course_id);
      
      // Fetch traditional homework (only those that allow partners)
      const traditionalHomework = await Homework.find({
        course_id: courseObjectId,
        is_active: true,
        allow_partners: true  // Only show homework that allows partnerships
      })
      .populate('course_id', 'course_name course_code')
      .sort({ due_date: 1 });

      // Filter out traditional homework that the student has already completed
      const completedTraditionalHomework = await Grade.find({
        student_id: studentId,
        homework_id: { $in: traditionalHomework.map(hw => hw._id) },
        status: 'completed'
      }).select('homework_id');

      const completedTraditionalIds = new Set(completedTraditionalHomework.map(g => g.homework_id.toString()));
      const activeTraditionalHomework = traditionalHomework.filter(hw => !completedTraditionalIds.has(hw._id.toString()));

      // Fetch student-created homework for this course (only those that allow partners)
      const studentHomework = await StudentHomework.find({
        'course_id': courseObjectId,
        'completion_status': { $ne: 'completed' }, // Only show active homework
        'allow_partners': true  // Only show homework that allows partnerships
      })
      .populate('course_id', 'course_name course_code')
      .sort({ claimed_deadline: 1 });


      // Combine both types of homework
      homeworkAssignments = [
        ...activeTraditionalHomework.map(hw => ({
          _id: hw._id,
          title: hw.title,
          due_date: hw.due_date,
          points_possible: hw.points_possible,
          allow_partners: hw.allow_partners,
          max_partners: hw.max_partners,
          course: {
            _id: hw.course_id._id,
            name: hw.course_id.course_name,
            code: hw.course_id.course_code
          },
          type: 'traditional'
        })),
        ...studentHomework.map(hw => ({
          _id: hw._id,
          title: hw.title,
          due_date: hw.claimed_deadline || hw.verified_deadline,
          points_possible: hw.claimed_grade || 100,
          allow_partners: hw.allow_partners,
          max_partners: hw.max_partners,
          course: {
            _id: hw.course_id._id,
            name: hw.course_id.course_name,
            code: hw.course_id.course_code
          },
          type: 'student_created'
        }))
      ].sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
      
      // Filter out homework that already has completed partnerships
      const homeworkWithCompletedPartnerships = await Partner.find({
        $or: [
          { student1_id: studentId },
          { student2_id: studentId }
        ],
        partnership_status: 'completed',
        homework_id: { $in: homeworkAssignments.map(hw => hw._id) }
      }).select('homework_id');

      const completedPartnershipHomeworkIds = new Set(homeworkWithCompletedPartnerships.map(p => p.homework_id.toString()));
      homeworkAssignments = homeworkAssignments.filter(hw => !completedPartnershipHomeworkIds.has(hw._id.toString()));

    }

    const partnerData = {
      user_id: studentId,
      courses: courses.map(course => ({
        _id: course._id,
        course_name: course.course_name,
        course_code: course.course_code,
        partner_enabled: true, // Partners controlled at homework level
        max_partners: 1 // Default max partners
      })),
      potential_partners: potentialPartners,
      current_partners: currentPartners,
      homework_assignments: homeworkAssignments,
      selected_course: selectedCourse ? {
        _id: selectedCourse._id,
        course_name: selectedCourse.course_name,
        course_code: selectedCourse.course_code,
        partner_enabled: selectedCourse.partner_settings?.enabled || false,
        max_partners: selectedCourse.partner_settings?.max_partners_per_student || 1,
        lecturer: selectedCourse.lecturer_id ? {
          name: selectedCourse.lecturer_id.name || selectedCourse.lecturer_id.full_name,
          email: selectedCourse.lecturer_id.email
        } : null
      } : null,
      selected_homework: selectedHomework ? {
        _id: selectedHomework._id,
        title: selectedHomework.title,
        due_date: selectedHomework.due_date,
        course: {
          _id: selectedHomework.course_id._id,
          name: selectedHomework.course_id.course_name,
          code: selectedHomework.course_id.course_code
        }
      } : null
    };
    
    res.json(partnerData);
  } catch (error) {
    console.error('Error fetching partner selection data:', error);
    res.status(500).json({ error: 'Failed to fetch partner selection data' });
  }
});

// GET /api/student-dashboard/partner-requests - Get partnership requests for student
router.get('/partner-requests', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const studentId = user._id;
    
    // Import Partner model
    const Partner = require('../models/Partner');
    
    // Import StudentHomework model
    const StudentHomework = require('../models/StudentHomework');
    
    // Helper function to manually populate homework from correct collection
    const populateHomework = async (partnerships) => {
      const results = [];
      for (const partnership of partnerships) {
        const populated = partnership.toObject();
        
        // Try to populate from Homework first (traditional)
        let homework = await Homework.findById(partnership.homework_id)
          .populate('course_id', 'course_name course_code');
        
        if (!homework) {
          // Try StudentHomework (student-created)
          homework = await StudentHomework.findById(partnership.homework_id)
            .populate('course_id', 'course_name course_code');
        }
        
        populated.homework_id = homework;
        results.push(populated);
      }
      return results;
    };
    
    // Get partnership requests where this student is the target (student2_id) and status is pending
    const pendingRequestsRaw = await Partner.find({
      student2_id: studentId,
      partnership_status: 'pending'
    })
    .populate('student1_id', 'name email full_name picture');
    
    const pendingRequests = await populateHomework(pendingRequestsRaw);
    
    // Get partnerships where this student initiated (student1_id) and status is pending
    const sentRequestsRaw = await Partner.find({
      student1_id: studentId,
      partnership_status: 'pending'
    })
    .populate('student2_id', 'name email full_name picture');
    
    const sentRequests = await populateHomework(sentRequestsRaw);
    
    // Get active partnerships
    const activePartnershipsRaw = await Partner.find({
      $or: [
        { student1_id: studentId },
        { student2_id: studentId }
      ],
      partnership_status: { $in: ['accepted', 'active'] }
    })
    .populate('student1_id', 'name email full_name picture')
    .populate('student2_id', 'name email full_name picture');
    
    const activePartnerships = await populateHomework(activePartnershipsRaw);
    
    // Get completed partnerships
    const completedPartnershipsRaw = await Partner.find({
      $or: [
        { student1_id: studentId },
        { student2_id: studentId }
      ],
      partnership_status: 'completed'
    })
    .populate('student1_id', 'name email full_name picture')
    .populate('student2_id', 'name email full_name picture');
    
    const completedPartnerships = await populateHomework(completedPartnershipsRaw);
    
    // Debug logging
    console.log('Partner requests query results:', {
      pending_found: pendingRequests.length,
      sent_found: sentRequests.length,
      active_found: activePartnerships.length,
      completed_found: completedPartnerships.length
    });
    
    // Check how many have null homework
    const pendingWithNullHomework = pendingRequests.filter(req => !req.homework_id);
    const sentWithNullHomework = sentRequests.filter(req => !req.homework_id);
    
    if (pendingWithNullHomework.length > 0) {
      console.log(`⚠️  Found ${pendingWithNullHomework.length} pending requests with null homework_id`);
    }
    if (sentWithNullHomework.length > 0) {
      console.log(`⚠️  Found ${sentWithNullHomework.length} sent requests with null homework_id`);
    }
    
    const partnerRequests = {
      pending_requests: pendingRequests
        .filter(req => req.homework_id && req.homework_id.course_id)
        .map(req => ({
          _id: req._id,
          partner: {
            _id: req.student1_id._id,
            name: req.student1_id.name || req.student1_id.full_name,
            email: req.student1_id.email,
            picture: req.student1_id.picture
          },
          homework: {
            _id: req.homework_id._id,
            title: req.homework_id.title,
            due_date: req.homework_id.due_date || req.homework_id.claimed_deadline, // Handle both types
            course: {
              _id: req.homework_id.course_id._id,
              name: req.homework_id.course_id.course_name,
              code: req.homework_id.course_id.course_code
          }
        },
        initiated_at: req.createdAt,
        notes: req.notes
      })),
      sent_requests: sentRequests
        .filter(req => req.homework_id && req.homework_id.course_id)
        .map(req => ({
          _id: req._id,
          partner: {
            _id: req.student2_id._id,
            name: req.student2_id.name || req.student2_id.full_name,
            email: req.student2_id.email,
            picture: req.student2_id.picture
          },
          homework: {
            _id: req.homework_id._id,
            title: req.homework_id.title,
            due_date: req.homework_id.due_date || req.homework_id.claimed_deadline, // Handle both types
            course: {
              _id: req.homework_id.course_id._id,
              name: req.homework_id.course_id.course_name,
              code: req.homework_id.course_id.course_code
          }
        },
        initiated_at: req.createdAt,
        notes: req.notes
      })),
      active_partnerships: activePartnerships
        .filter(req => req.homework_id && req.homework_id.course_id)
        .map(req => ({
          _id: req._id,
          partner: {
            _id: req.student1_id._id.equals(studentId) ? req.student2_id._id : req.student1_id._id,
            name: req.student1_id._id.equals(studentId) 
              ? (req.student2_id.name || req.student2_id.full_name)
              : (req.student1_id.name || req.student1_id.full_name),
            email: req.student1_id._id.equals(studentId) 
              ? req.student2_id.email 
              : req.student1_id.email,
            picture: req.student1_id._id.equals(studentId) 
              ? req.student2_id.picture 
              : req.student1_id.picture
          },
          homework: {
            _id: req.homework_id._id,
            title: req.homework_id.title,
            due_date: req.homework_id.due_date || req.homework_id.claimed_deadline, // Handle both types
            course: {
              _id: req.homework_id.course_id._id,
              name: req.homework_id.course_id.course_name,
              code: req.homework_id.course_id.course_code
          }
        },
        status: req.partnership_status,
        accepted_at: req.accepted_at
      })),
      completed_partnerships: completedPartnerships
        .filter(req => req.homework_id && req.homework_id.course_id)
        .map(req => ({
          _id: req._id,
          partner: {
            _id: req.student1_id._id.equals(studentId) ? req.student2_id._id : req.student1_id._id,
            name: req.student1_id._id.equals(studentId) 
              ? (req.student2_id.name || req.student2_id.full_name)
              : (req.student1_id.name || req.student1_id.full_name),
            email: req.student1_id._id.equals(studentId) 
              ? req.student2_id.email 
              : req.student1_id.email,
            picture: req.student1_id._id.equals(studentId) 
              ? req.student2_id.picture 
              : req.student1_id.picture
          },
          homework: {
            _id: req.homework_id._id,
            title: req.homework_id.title,
            due_date: req.homework_id.due_date,
            course: {
              _id: req.homework_id.course_id._id,
              name: req.homework_id.course_id.course_name,
            code: req.homework_id.course_id.course_code
          }
        },
        status: req.partnership_status,
        accepted_at: req.accepted_at,
        completed_at: req.completed_at
      }))
    };
    
    res.json(partnerRequests);
  } catch (error) {
    console.error('Error fetching partner requests:', error);
    res.status(500).json({ error: 'Failed to fetch partner requests' });
  }
});

// POST /api/student-dashboard/partner-requests/:requestId/respond - Accept or decline partnership request
router.post('/partner-requests/:requestId/respond', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const requestId = req.params.requestId;
    const { action } = req.body; // 'accept' or 'decline'
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const studentId = user._id;
    
    // Import Partner model
    const Partner = require('../models/Partner');
    console.log('Partner model imported successfully for respond endpoint');
    
    // Find the partnership request
    console.log('Looking for partnership with ID:', requestId);
    const partnership = await Partner.findById(requestId);
    console.log('Found partnership:', partnership ? 'Yes' : 'No');
    if (!partnership) {
      return res.status(404).json({ error: 'Partnership request not found' });
    }
    
    // Check if this student is involved in the partnership
    console.log('Checking student permissions:', {
      studentId: studentId.toString(),
      student2_id: partnership.student2_id.toString(),
      student1_id: partnership.student1_id.toString(),
      isTarget: partnership.student2_id.equals(studentId),
      isInitiator: partnership.student1_id.equals(studentId),
      action: action
    });
    
    // For accept actions, only the target student can respond
    if (action === 'accept' && !partnership.student2_id.equals(studentId)) {
      return res.status(403).json({ error: 'You can only accept requests sent to you' });
    }
    
    // For decline actions, either student in the partnership can decline
    if (action === 'decline' && !partnership.student1_id.equals(studentId) && !partnership.student2_id.equals(studentId)) {
      return res.status(403).json({ error: 'You can only decline partnerships you are part of' });
    }
    
    // For completed action, either student in the partnership can mark it complete
    if (action === 'completed' && !partnership.student1_id.equals(studentId) && !partnership.student2_id.equals(studentId)) {
      return res.status(403).json({ error: 'You can only update partnerships you are part of' });
    }
    
    // Check if request is still pending (for accept actions only)
    if (action === 'accept' && partnership.partnership_status !== 'pending') {
      return res.status(400).json({ error: 'This request has already been responded to' });
    }
    
    // For decline actions, allow declining partnerships in any status (for changing partners)
    if (action === 'decline' && partnership.partnership_status === 'declined') {
      return res.status(400).json({ error: 'This partnership has already been declined' });
    }
    
    // Check if partnership is active (for completed action)
    if (action === 'completed' && partnership.partnership_status !== 'accepted') {
      return res.status(400).json({ error: 'Can only mark active partnerships as completed' });
    }
    
    // Update partnership status
    if (action === 'accept') {
      partnership.partnership_status = 'accepted';
      partnership.accepted_at = new Date();
    } else if (action === 'decline') {
      partnership.partnership_status = 'declined';
    } else if (action === 'completed') {
      partnership.partnership_status = 'completed';
      partnership.completed_at = new Date();
    } else {
      return res.status(400).json({ error: 'Invalid action. Use "accept", "decline", or "completed"' });
    }
    
    await partnership.save();
    
    res.json({
      message: `Partnership ${action}ed successfully`,
      partnership: {
        _id: partnership._id,
        status: partnership.partnership_status,
        accepted_at: partnership.accepted_at,
        completed_at: partnership.completed_at
      }
    });
  } catch (error) {
    console.error('Error responding to partnership request:', error);
    res.status(500).json({ error: 'Failed to respond to partnership request' });
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

// PUT /api/student-dashboard/weekly-goal - Update weekly study goal
router.put('/weekly-goal', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    const { weekly_goal } = req.body;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const studentId = user._id;
    
    // Update or create user's weekly goal
    await User.findByIdAndUpdate(studentId, { weekly_study_goal: weekly_goal });
    
    res.json({
      message: 'Weekly goal updated successfully',
      weekly_goal: weekly_goal
    });
  } catch (error) {
    console.error('Error updating weekly goal:', error);
    res.status(500).json({ error: 'Failed to update weekly goal' });
  }
});

// GET /api/student-dashboard/debug-study-sessions - Debug endpoint to check study sessions
router.get('/debug-study-sessions', checkJwt, extractUser, requireStudent, async (req, res) => {
  try {
    const auth0Id = req.userInfo.auth0_id;
    
    // First, find the user in our database using the Auth0 ID
    const user = await User.findOne({ auth0_id: auth0Id });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const studentId = user._id;
    
    // Get all study progress records for this student
    const allStudyProgress = await StudyProgress.find({ student_id: studentId }).sort({ date: -1 });
    
    console.log('=== DEBUG STUDY SESSIONS ===');
    console.log('Student ID:', studentId);
    console.log('Total study progress records:', allStudyProgress.length);
    console.log('All records:', allStudyProgress);
    console.log('=== END DEBUG STUDY SESSIONS ===');
    
    res.json({
      student_id: studentId,
      total_records: allStudyProgress.length,
      records: allStudyProgress
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({ error: 'Failed to fetch debug data' });
  }
});

module.exports = router;
